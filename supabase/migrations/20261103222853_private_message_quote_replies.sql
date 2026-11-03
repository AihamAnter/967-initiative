-- Linked quote replies only within the same authorized conversation.
alter table public.private_messages
 add column if not exists reply_to_message_id uuid
 references public.private_messages(id) on delete set null;

create index if not exists private_messages_reply_source
 on public.private_messages(reply_to_message_id)
 where reply_to_message_id is not null;

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
  if p_message is not null and not exists (
   select 1 from public.private_messages m
   where m.id=p_message and m.conversation_id=c.id
  ) then
   raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023';
  end if;
  insert into public.private_messages(conversation_id,sender_id,body,reply_to_message_id)
  values(c.id,p_actor,content,p_message) returning id into message_id;
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

revoke all on function public.private_messaging_action(uuid,text,uuid,uuid,text,uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.private_messaging_action(uuid,text,uuid,uuid,text,uuid,jsonb)
 to service_role;
