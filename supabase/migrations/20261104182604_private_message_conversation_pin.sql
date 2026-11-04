-- One shared pinned message for both participants of a private conversation.
-- Browser clients never update this metadata directly.
alter table public.private_conversations
 add column if not exists pinned_message_id uuid references public.private_messages(id) on delete set null,
 add column if not exists pinned_by uuid references auth.users(id) on delete set null,
 add column if not exists pinned_at timestamptz;

create or replace function public.private_messaging_set_pin(
 p_actor uuid, p_conversation uuid, p_message uuid, p_remove boolean default false
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_conversation public.private_conversations%rowtype;
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
 if p_conversation is null or p_message is null or p_remove is null then
  raise exception 'MESSAGE_INVALID_INPUT' using errcode='22023';
 end if;
 select * into v_conversation from public.private_conversations c
 where c.id=p_conversation and c.status='accepted'
  and p_actor in (c.user_low,c.user_high)
 for update;
 if not found then
  raise exception 'MESSAGE_NOT_FOUND' using errcode='P0002';
 end if;
 if p_remove then
  if v_conversation.pinned_message_id is distinct from p_message then
   raise exception 'MESSAGE_PIN_CHANGED' using errcode='22023';
  end if;
  update public.private_conversations
  set pinned_message_id=null,pinned_by=null,pinned_at=null
  where id=p_conversation;
 else
  if not exists (
   select 1 from public.private_messages m
   where m.id=p_message and m.conversation_id=p_conversation
    and m.deleted_at is null
  ) then
   raise exception 'MESSAGE_INVALID_TARGET' using errcode='22023';
  end if;
  update public.private_conversations
  set pinned_message_id=p_message,pinned_by=p_actor,pinned_at=now()
  where id=p_conversation;
 end if;
 return jsonb_build_object('ok',true,'pinned_message_id',case when p_remove then null else p_message end);
end;
$$;
revoke all on function public.private_messaging_set_pin(uuid,uuid,uuid,boolean)
 from public,anon,authenticated;
grant execute on function public.private_messaging_set_pin(uuid,uuid,uuid,boolean) to service_role;

-- Soft-deleting the pinned source must clear the pin for both participants.
create or replace function public.private_messaging_clear_deleted_pin()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.deleted_at is null and new.deleted_at is not null then
  update public.private_conversations
  set pinned_message_id=null,pinned_by=null,pinned_at=null
  where id=new.conversation_id and pinned_message_id=new.id;
 end if;
 return new;
end;
$$;
revoke all on function public.private_messaging_clear_deleted_pin()
 from public,anon,authenticated;
grant execute on function public.private_messaging_clear_deleted_pin() to service_role;

drop trigger if exists private_message_clear_pin_when_deleted on public.private_messages;
create trigger private_message_clear_pin_when_deleted
after update of deleted_at on public.private_messages
for each row when (old.deleted_at is distinct from new.deleted_at)
execute function public.private_messaging_clear_deleted_pin();
