-- Private messages: own-message edits and tombstone deletes only.
-- No browser role receives write access. The authenticated actor is
-- verified by the Next.js server before this service-role-only RPC.
alter table public.private_messages
 add column if not exists edited_at timestamptz,
 add column if not exists deleted_at timestamptz;

create or replace function public.private_messaging_message_mutate(
 p_actor uuid,
 p_action text,
 p_conversation uuid,
 p_message uuid,
 p_text text default null
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_message public.private_messages%rowtype;
 v_conversation public.private_conversations%rowtype;
 v_content text;
begin
 if p_actor is null or not exists (
  select 1 from auth.users u where u.id=p_actor and u.email_confirmed_at is not null
   and (u.banned_until is null or u.banned_until<=now())
 ) or exists (
  select 1 from public.public_profiles p where p.user_id=p_actor
   and (p.suspended or p.deletion_requested_at is not null)
 ) then
  raise exception 'MESSAGE_AUTH_DENIED' using errcode='42501';
 end if;
 if p_action not in ('edit','delete') or p_conversation is null or p_message is null then
  raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
 end if;
 select * into v_conversation from public.private_conversations c
 where c.id=p_conversation and p_actor in (c.user_low,c.user_high);
 if not found then
  raise exception 'MESSAGE_NOT_FOUND' using errcode='P0002';
 end if;
 select * into v_message from public.private_messages m
 where m.id=p_message and m.conversation_id=p_conversation
 for update;
 if not found or v_message.sender_id is distinct from p_actor then
  raise exception 'MESSAGE_NOT_FOUND' using errcode='P0002';
 end if;
 if v_message.deleted_at is not null then
  raise exception 'MESSAGE_ALREADY_DELETED' using errcode='22023';
 end if;
 if p_action='edit' then
  if v_conversation.status<>'accepted' then
   raise exception 'MESSAGE_INVALID_STATE' using errcode='22023';
  end if;
  v_content=trim(coalesce(p_text,''));
  if char_length(v_content)<1 or char_length(v_content)>2000 then
   raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
  end if;
  if v_content is distinct from v_message.body then
   update public.private_messages set body=v_content,edited_at=now()
   where id=p_message;
  end if;
 else
  -- Replace the original text, not just the UI display. This stops the
  -- original body from being exposed by Realtime and participant SELECT.
  update public.private_messages
  set body='حذفت الرسالة',deleted_at=now()
  where id=p_message;
 end if;
 return jsonb_build_object('ok',true,'id',p_message);
end;
$$;

revoke all on function public.private_messaging_message_mutate(uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.private_messaging_message_mutate(uuid,text,uuid,uuid,text) to service_role;
