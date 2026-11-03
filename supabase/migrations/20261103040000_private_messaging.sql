-- 967 private messaging v1. Additive: does not change public.messages (contact form).
-- All writes are atomic through a service-role-only invoker function.
begin;

create table public.private_messaging_settings(
 user_id uuid primary key references auth.users(id) on delete cascade,
 discoverable boolean not null default false,
 allow_requests boolean not null default true,
 notify_messages boolean not null default true,
 updated_at timestamptz not null default now()
);

create table public.private_conversations(
 id uuid primary key default gen_random_uuid(),
 user_low uuid not null references auth.users(id) on delete cascade,
 user_high uuid not null references auth.users(id) on delete cascade,
 requested_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 intro text not null check(char_length(trim(intro)) between 1 and 500),
 requested_at timestamptz not null default now(),
 accepted_at timestamptz,
 declined_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_message_at timestamptz,
 last_excerpt text,
 check(user_low<user_high),
 check(requested_by in (user_low,user_high)),
 unique(user_low,user_high)
);
create index private_conversations_low_updated on public.private_conversations(user_low,updated_at desc);
create index private_conversations_high_updated on public.private_conversations(user_high,updated_at desc);
create index private_conversations_requests on public.private_conversations(requested_by,requested_at desc);

create table public.private_conversation_states(
 conversation_id uuid not null references public.private_conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 last_read_at timestamptz not null default now(),
 hidden_at timestamptz,
 primary key(conversation_id,user_id)
);

create table public.private_messages(
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.private_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index private_messages_thread on public.private_messages(conversation_id,created_at desc,id desc);
create index private_messages_sender_time on public.private_messages(sender_id,created_at desc);

create table public.private_user_blocks(
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id),
 check(blocker_id<>blocked_id)
);

create table public.private_message_reports(
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 conversation_id uuid not null references public.private_conversations(id) on delete cascade,
 message_id uuid references public.private_messages(id) on delete set null,
 reason text not null check(reason in ('harassment','threat','spam','fraud','inappropriate','other')),
 note text not null default '' check(char_length(note)<=1000),
 evidence text not null check(char_length(evidence)<=2000),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz
);
create index private_reports_pending on public.private_message_reports(status,created_at desc);
create index private_reports_actor on public.private_message_reports(reporter_id,created_at desc);

-- Deny direct table access by default. Only authenticated participants may
-- SELECT conversations/messages for an RLS-filtered Realtime subscription.
alter table public.private_messaging_settings enable row level security;
alter table public.private_conversations enable row level security;
alter table public.private_conversation_states enable row level security;
alter table public.private_messages enable row level security;
alter table public.private_user_blocks enable row level security;
alter table public.private_message_reports enable row level security;
revoke all on public.private_messaging_settings,public.private_conversations,
 public.private_conversation_states,public.private_messages,
 public.private_user_blocks,public.private_message_reports from public,anon,authenticated;
grant select on public.private_conversations,public.private_messages to authenticated;
create policy private_conversations_participants on public.private_conversations
 for select to authenticated using ((select auth.uid()) in (user_low,user_high));
create policy private_messages_participants on public.private_messages
 for select to authenticated using (
  exists(select 1 from public.private_conversations c where c.id=conversation_id
   and (select auth.uid()) in (c.user_low,c.user_high))
 );

-- This helper is NOT callable by browser roles; server service role invokes it
-- from the transactional action function to deduplicate in-site notifications.
create or replace function public.private_messaging_notice(p_user uuid,p_title text,p_link text)
returns void language plpgsql security invoker set search_path='' as $$
declare
 found_id uuid;
begin
 select id into found_id from public.account_notifications
 where user_id=p_user and kind='system' and href=p_link
 order by created_at desc limit 1 for update;
 if found_id is not null then
  update public.account_notifications
  set title=left(p_title,180),description='',created_at=now(),read_at=null
  where id=found_id;
 else
  insert into public.account_notifications(user_id,kind,title,description,href)
  values(p_user,'system',left(p_title,180),'',p_link);
 end if;
end $$;

-- All authorization derives from the server-verified actor ID. Transactional
-- advisory locks avoid creating two requests to the same pair concurrently.
create or replace function public.private_messaging_action(
 p_actor uuid,p_action text,p_target uuid default null,p_conversation uuid default null,
 p_text text default null,p_message uuid default null,p_options jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 c public.private_conversations%rowtype;
me_low uuid;
me_high uuid;
blocked boolean;
count_recent bigint;
message_id uuid;
content text;
approved boolean;
recipient uuid;
begin
 if p_actor is null or not exists(
  select 1 from auth.users u where u.id=p_actor and u.email_confirmed_at is not null
  and (u.banned_until is null or u.banned_until<=now())
 ) or exists(
  select 1 from public.public_profiles p where p.user_id=p_actor and
   (p.suspended or p.deletion_requested_at is not null)
 ) then
  raise exception 'MESSAGE_AUTH_DENIED' using errcode='42501';
 end if;
 if p_action='settings' then
  if jsonb_typeof(p_options->'discoverable') is distinct from 'boolean' or
     jsonb_typeof(p_options->'allow_requests') is distinct from 'boolean' or
     jsonb_typeof(p_options->'notify_messages') is distinct from 'boolean' then
   raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
  end if;
  insert into public.private_messaging_settings(user_id,discoverable,allow_requests,notify_messages)
  values(p_actor,(p_options->>'discoverable')::boolean,(p_options->>'allow_requests')::boolean,(p_options->>'notify_messages')::boolean)
  on conflict(user_id) do update set
   discoverable=excluded.discoverable,allow_requests=excluded.allow_requests,
   notify_messages=excluded.notify_messages,updated_at=now();
  return jsonb_build_object('ok',true);
 end if;
 if p_action in ('block','unblock') then
  if p_target is null or p_target=p_actor or not exists(select 1 from auth.users where id=p_target) then
   raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023';
  end if;
  if p_action='block' then
   insert into public.private_user_blocks(blocker_id,blocked_id) values(p_actor,p_target)
   on conflict do nothing;
  else
   delete from public.private_user_blocks where blocker_id=p_actor and blocked_id=p_target;
  end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='request' then
  if p_target is null or p_target=p_actor then
   raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023';
  end if;
  content=trim(coalesce(p_text,''));
  if char_length(content)<1 or char_length(content)>500 then
   raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
  end if;
  -- Serialize the sender's daily request quota across different recipients.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('requests:'||p_actor::text,1));
  me_low=least(p_actor,p_target);me_high=greatest(p_actor,p_target);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me_low::text||':'||me_high::text,0));
  if not exists(select 1 from public.public_profiles p
     join auth.users u on u.id=p.user_id
     where p.user_id=p_target and not p.suspended and p.deletion_requested_at is null
      and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())) then
   raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023';
  end if;
  if exists(select 1 from public.private_messaging_settings s where s.user_id=p_target and not s.allow_requests) then
   raise exception 'MESSAGE_REQUESTS_CLOSED' using errcode='42501';
  end if;
  if exists(select 1 from public.private_user_blocks b where
   (b.blocker_id=p_actor and b.blocked_id=p_target) or
   (b.blocker_id=p_target and b.blocked_id=p_actor)) then
   raise exception 'MESSAGE_REQUESTS_CLOSED' using errcode='42501';
  end if;
  select * into c from public.private_conversations
   where user_low=me_low and user_high=me_high for update;
  approved=found;
  if approved and (c.status<>'declined' or c.declined_at>now()-interval '30 days') then
   raise exception 'MESSAGE_ALREADY_EXISTS' using errcode='23505';
  end if;
  select count(*) into count_recent from public.private_conversations
   where requested_by=p_actor and requested_at>=now()-interval '24 hours';
  if count_recent>=5 then
   raise exception 'MESSAGE_REQUEST_LIMIT' using errcode='22023';
  end if;
  if approved then
   update public.private_conversations
    set status='pending',requested_by=p_actor,intro=content,requested_at=now(),
     accepted_at=null,declined_at=null,updated_at=now(),last_message_at=null,last_excerpt=null
    where id=c.id returning * into c;
  else
   insert into public.private_conversations(user_low,user_high,requested_by,intro)
    values(me_low,me_high,p_actor,content) returning * into c;
   insert into public.private_conversation_states(conversation_id,user_id)
    values(c.id,me_low),(c.id,me_high);
  end if;
  if coalesce((select notify_messages from public.private_messaging_settings where user_id=p_target),true) then
   perform public.private_messaging_notice(p_target,'لديك طلب محادثة جديد','/messages?conversation='||c.id::text);
  end if;
  return jsonb_build_object('ok',true,'id',c.id);
 end if;

 if p_conversation is null then raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023'; end if;
 select * into c from public.private_conversations where id=p_conversation for update;
 if not found or p_actor not in (c.user_low,c.user_high) then
  raise exception 'MESSAGE_NOT_FOUND' using errcode='42501';
 end if;
 recipient=case when c.user_low=p_actor then c.user_high else c.user_low end;
 if p_action in ('accept','decline') then
  if c.status<>'pending' or c.requested_by=p_actor or c.requested_at<now()-interval '30 days' then
   raise exception 'MESSAGE_INVALID_STATE' using errcode='22023';
  end if;
  if exists(select 1 from public.private_user_blocks b where
   (b.blocker_id=p_actor and b.blocked_id=recipient) or
   (b.blocker_id=recipient and b.blocked_id=p_actor)) then
   raise exception 'MESSAGE_REQUESTS_CLOSED' using errcode='42501';
  end if;
  if p_action='accept' then
   update public.private_conversations set status='accepted',accepted_at=now(),updated_at=now() where id=c.id;
   if coalesce((select notify_messages from public.private_messaging_settings where user_id=recipient),true) then
    perform public.private_messaging_notice(recipient,'تم قبول طلب محادثتك','/messages?conversation='||c.id::text);
   end if;
  else
   update public.private_conversations set status='declined',declined_at=now(),updated_at=now() where id=c.id;
  end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='read' then
  update public.private_conversation_states set last_read_at=now(),hidden_at=null
   where conversation_id=c.id and user_id=p_actor;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='send' then
  content=trim(coalesce(p_text,''));
  if c.status<>'accepted' or char_length(content)<1 or char_length(content)>2000 then
   raise exception 'MESSAGE_INVALID_STATE' using errcode='22023';
  end if;
  if exists(select 1 from public.private_user_blocks b where
   (b.blocker_id=p_actor and b.blocked_id=recipient) or
   (b.blocker_id=recipient and b.blocked_id=p_actor)) then
   raise exception 'MESSAGE_REQUESTS_CLOSED' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('send:'||p_actor::text,1));
  select count(*) into count_recent from public.private_messages
   where sender_id=p_actor and created_at>=now()-interval '1 minute';
  if count_recent>=10 then raise exception 'MESSAGE_SEND_LIMIT' using errcode='22023'; end if;
  select count(*) into count_recent from public.private_messages
   where sender_id=p_actor and created_at>=now()-interval '24 hours';
  if count_recent>=250 then raise exception 'MESSAGE_SEND_LIMIT' using errcode='22023'; end if;
  insert into public.private_messages(conversation_id,sender_id,body)
  values(c.id,p_actor,content) returning id into message_id;
  update public.private_conversations set updated_at=now(),last_message_at=now(),last_excerpt=left(content,120)
    where id=c.id;
  update public.private_conversation_states set last_read_at=now(),hidden_at=null
   where conversation_id=c.id and user_id=p_actor;
  if coalesce((select notify_messages from public.private_messaging_settings where user_id=recipient),true) then
   perform public.private_messaging_notice(recipient,'لديك رسالة خاصة جديدة','/messages?conversation='||c.id::text);
  end if;
  return jsonb_build_object('ok',true,'message_id',message_id);
 end if;
 if p_action='report' then
  if p_options->>'reason' not in ('harassment','threat','spam','fraud','inappropriate','other') or
   char_length(coalesce(p_text,''))>1000 then
   raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reports:'||p_actor::text,1));
  select count(*) into count_recent from public.private_message_reports
   where reporter_id=p_actor and created_at>=now()-interval '24 hours';
  if count_recent>=5 then raise exception 'MESSAGE_SEND_LIMIT' using errcode='22023'; end if;
  if p_message is not null then
   select m.body into content from public.private_messages m
   where m.id=p_message and m.conversation_id=c.id and m.sender_id<>p_actor;
   if content is null then raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023'; end if;
  else
   content=c.intro;
  end if;
  insert into public.private_message_reports(reporter_id,conversation_id,message_id,reason,note,evidence)
   values(p_actor,c.id,p_message,p_options->>'reason',coalesce(p_text,''),content);
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'MESSAGE_UNKNOWN_ACTION' using errcode='22023';
end $$;

create or replace function public.private_messaging_inbox(p_actor uuid)
returns table(id uuid,partner_id uuid,partner_name text,avatar_url text,
 status text,requested_by uuid,intro text,requested_at timestamptz,
 updated_at timestamptz,last_message_at timestamptz,last_excerpt text,
 unread bigint,blocked boolean)
language sql stable security invoker set search_path='' as $$
 select c.id,
  case when c.user_low=p_actor then c.user_high else c.user_low end,
  coalesce(p.display_name,'مستخدم 967')::text,
  case when p.show_avatar then p.avatar_url else null end,
  case when c.status='pending' and c.requested_at<now()-interval '30 days'
    then 'expired' else c.status end,
  c.requested_by,c.intro,c.requested_at,c.updated_at,c.last_message_at,c.last_excerpt,
  (select count(*) from public.private_messages m
    where m.conversation_id=c.id and m.sender_id<>p_actor and
    m.created_at>coalesce(s.last_read_at,'epoch'::timestamptz)),
  exists(select 1 from public.private_user_blocks b where
    (b.blocker_id=p_actor and b.blocked_id=case when c.user_low=p_actor then c.user_high else c.user_low end)
    or (b.blocked_id=p_actor and b.blocker_id=case when c.user_low=p_actor then c.user_high else c.user_low end))
 from public.private_conversations c
 left join public.private_conversation_states s on s.conversation_id=c.id and s.user_id=p_actor
 left join public.public_profiles p on p.user_id=case when c.user_low=p_actor then c.user_high else c.user_low end
 where p_actor in (c.user_low,c.user_high) and c.status<>'declined'
 order by c.updated_at desc limit 60
$$;

-- Service-role-only SQL APIs. Never call them with browser credentials.
revoke all on function public.private_messaging_action(uuid,text,uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.private_messaging_inbox(uuid) from public,anon,authenticated;
revoke all on function public.private_messaging_notice(uuid,text,text) from public,anon,authenticated;
grant execute on function public.private_messaging_action(uuid,text,uuid,uuid,text,uuid,jsonb) to service_role;
grant execute on function public.private_messaging_inbox(uuid) to service_role;
grant execute on function public.private_messaging_notice(uuid,text,text) to service_role;

-- Subscribe to message inserts only while the user has the thread open. RLS
-- on SELECT enforces membership for postgres_changes event delivery.
do $$
begin
 if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
  and not exists(select 1 from pg_catalog.pg_publication_tables
   where pubname='supabase_realtime' and schemaname='public' and tablename='private_messages')
 then
  alter publication supabase_realtime add table public.private_messages;
 end if;
end $$;

commit;
