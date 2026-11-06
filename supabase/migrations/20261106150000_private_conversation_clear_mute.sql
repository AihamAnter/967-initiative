-- Per-member conversation options: clear the conversation for me, and mute its alerts.
-- Clearing hides every message up to that moment for the member who cleared it only;
-- the other member keeps the full history. The conversation returns to the inbox
-- when a newer message arrives. Muting stops in-site notices for that conversation.

alter table public.private_conversation_states
 add column if not exists cleared_at timestamptz,
 add column if not exists muted_at timestamptz;

-- Service-role only, like every private messaging SQL API.
create or replace function public.private_messaging_conversation_state(
 p_actor uuid,p_conversation uuid,p_action text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 c public.private_conversations%rowtype;
 s public.private_conversation_states%rowtype;
begin
 if p_actor is null or p_conversation is null or p_action not in ('clear','mute','unmute') then
  raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
 end if;
 select * into c from public.private_conversations where id=p_conversation;
 if not found or p_actor not in (c.user_low,c.user_high) then
  raise exception 'MESSAGE_NOT_FOUND' using errcode='P0002';
 end if;
 if p_action='clear' and c.status<>'accepted' then
  raise exception 'MESSAGE_INVALID_STATE' using errcode='22023';
 end if;
 insert into public.private_conversation_states(conversation_id,user_id)
 values(c.id,p_actor) on conflict do nothing;
 if p_action='clear' then
  update public.private_conversation_states
   set cleared_at=now(),last_read_at=now()
   where conversation_id=c.id and user_id=p_actor returning * into s;
 elsif p_action='mute' then
  update public.private_conversation_states set muted_at=coalesce(muted_at,now())
   where conversation_id=c.id and user_id=p_actor returning * into s;
 else
  update public.private_conversation_states set muted_at=null
   where conversation_id=c.id and user_id=p_actor returning * into s;
 end if;
 return jsonb_build_object('ok',true,'cleared_at',s.cleared_at,'muted',s.muted_at is not null);
end $$;

-- In-site notices skip a conversation the recipient muted.
create or replace function public.private_messaging_notice(p_user uuid,p_title text,p_link text)
returns void language plpgsql security invoker set search_path='' as $$
declare
 found_id uuid;
begin
 if exists(select 1 from public.private_conversation_states s
  where s.user_id=p_user and s.muted_at is not null
   and p_link='/messages?conversation='||s.conversation_id::text) then
  return;
 end if;
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

-- The inbox gains a muted flag and leaves out conversations cleared with no newer message.
drop function if exists public.private_messaging_inbox(uuid);
create function public.private_messaging_inbox(p_actor uuid)
returns table(id uuid,partner_id uuid,partner_name text,avatar_url text,
 status text,requested_by uuid,intro text,requested_at timestamptz,
 updated_at timestamptz,last_message_at timestamptz,last_excerpt text,
 unread bigint,blocked boolean,muted boolean)
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
    m.created_at>greatest(coalesce(s.last_read_at,'epoch'::timestamptz),coalesce(s.cleared_at,'epoch'::timestamptz))),
  exists(select 1 from public.private_user_blocks b where
    (b.blocker_id=p_actor and b.blocked_id=case when c.user_low=p_actor then c.user_high else c.user_low end)
    or (b.blocked_id=p_actor and b.blocker_id=case when c.user_low=p_actor then c.user_high else c.user_low end)),
  s.muted_at is not null
 from public.private_conversations c
 left join public.private_conversation_states s on s.conversation_id=c.id and s.user_id=p_actor
 left join public.public_profiles p on p.user_id=case when c.user_low=p_actor then c.user_high else c.user_low end
 where p_actor in (c.user_low,c.user_high) and c.status<>'declined'
  and (s.cleared_at is null or c.last_message_at>s.cleared_at)
 order by c.updated_at desc limit 60
$$;

revoke all on function public.private_messaging_conversation_state(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.private_messaging_inbox(uuid) from public,anon,authenticated;
revoke all on function public.private_messaging_notice(uuid,text,text) from public,anon,authenticated;
grant execute on function public.private_messaging_conversation_state(uuid,uuid,text) to service_role;
grant execute on function public.private_messaging_inbox(uuid) to service_role;
grant execute on function public.private_messaging_notice(uuid,text,text) to service_role;
