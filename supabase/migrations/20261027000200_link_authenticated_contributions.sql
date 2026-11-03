-- Associate future signed-in contributions with their verified account identity.
begin;
alter table public.messages add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists messages_owner_timeline on public.messages(user_id,created_at desc) where user_id is not null;
drop policy if exists "account_own_contact_messages" on public.messages;
create policy "account_own_contact_messages" on public.messages for select to authenticated
using(user_id=(select auth.uid()));
-- No user UPDATE/INSERT grant: contact is still server-only and rate-limited.
create or replace function public.account_notify_contact_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare allow_notice boolean;
begin
 if NEW.user_id is null or NEW.status is not distinct from OLD.status then return NEW; end if;
 select coalesce(p.notify_moderation,true) into allow_notice
 from public.account_preferences p where p.user_id=NEW.user_id;
 if allow_notice is false then return NEW; end if;
 insert into public.account_notifications(user_id,kind,title,description,href)
 values(NEW.user_id,'moderation','تحديث حالة مساهمتك','تغيّرت حالة مساهمتك في «تواصل وشارك». راجع تفاصيلها في حسابك.','/account?tab=contributions');
 return NEW;
end $$;
revoke all on function public.account_notify_contact_status() from public,anon,authenticated;
drop trigger if exists account_contact_status_update on public.messages;
create trigger account_contact_status_update after update of status on public.messages
for each row execute function public.account_notify_contact_status();
commit;