-- L-07 / S-04. Additive, preserves old message rows and public file links.
begin;
alter table public.messages
 add column if not exists status text not null default 'new',
 add column if not exists status_updated_at timestamptz,
 add column if not exists status_updated_by uuid references auth.users(id) on delete set null;
alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages add constraint messages_status_check check(status in ('new','in_progress','resolved'));
drop policy if exists "Editors read messages" on public.messages;
create policy "Editors read messages" on public.messages for select to authenticated using(public.is_editor());
-- Column grants prevent a direct API caller from rewriting sender/body fields.
revoke insert,update,delete on public.messages from anon,authenticated;
grant update(status) on public.messages to authenticated;
drop policy if exists "Editors follow up messages" on public.messages;
create policy "Editors follow up messages" on public.messages for update to authenticated using(public.is_editor()) with check(public.is_editor());
create or replace function public.contact_message_status_audit() returns trigger
language plpgsql set search_path='' as $$
begin
 if NEW.status is distinct from OLD.status then NEW.status_updated_at:=clock_timestamp(); NEW.status_updated_by:=auth.uid(); end if;
 return NEW;
end $$;
revoke all on function public.contact_message_status_audit() from public;
drop trigger if exists contact_message_status_audit on public.messages;
create trigger contact_message_status_audit before update of status on public.messages
for each row execute function public.contact_message_status_audit();

-- Only HMAC digests and bounded short-lived counters, never raw IP/email/body.
create table if not exists public.contact_rate_limits(
 key_hash text primary key check(key_hash~'^[a-f0-9]{64}$'),
 hits integer not null check(hits between 1 and 9),
 expires_at timestamptz not null
);
create index if not exists contact_rate_limits_expiry_idx on public.contact_rate_limits(expires_at);
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_rate_limits from public,anon,authenticated,service_role;
create or replace function public.contact_rate_limit(p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer; ts timestamptz:=clock_timestamp();
begin
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid rate key' using errcode='22023'; end if;
 delete from public.contact_rate_limits where expires_at<=ts;
 insert into public.contact_rate_limits as r(key_hash,hits,expires_at) values(p_key,1,ts+interval '10 minutes')
 on conflict(key_hash) do update set hits=least(r.hits+1,9)
 returning hits into n;
 return n<=8;
end $$;
revoke all on function public.contact_rate_limit(text) from public,anon,authenticated;
grant execute on function public.contact_rate_limit(text) to service_role;
commit;
