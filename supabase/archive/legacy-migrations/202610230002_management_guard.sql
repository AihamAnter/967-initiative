-- S-02. Run only after review/testing; never applied by the audit to production.
-- A single updated counter row serializes concurrent demotions even under
-- REPEATABLE READ (where a stale SELECT-only advisory guard is insufficient).
begin;
lock table public.editors in access exclusive mode;
create table if not exists public.management_guard (
 singleton boolean primary key default true check(singleton),
 manager_count integer not null check(manager_count>=0)
);
alter table public.management_guard enable row level security;
revoke all on public.management_guard from public,anon,authenticated,service_role;
insert into public.management_guard(singleton,manager_count)
 select true,count(*) from public.editors where role='management'
 on conflict(singleton) do update set manager_count=excluded.manager_count;

create or replace function public.protect_last_967_manager() returns trigger
language plpgsql security definer set search_path='' as $$
declare was_manager boolean:=false; becomes_manager boolean:=false;
begin
 if TG_OP<>'INSERT' then was_manager:=OLD.role='management'; end if;
 if TG_OP<>'DELETE' then becomes_manager:=NEW.role='management'; end if;
 if was_manager and not becomes_manager then
  update public.management_guard set manager_count=manager_count-1 where singleton and manager_count>1;
  if not found then raise exception 'Cannot remove the last management account' using errcode='23514'; end if;
 elsif becomes_manager and not was_manager then
  update public.management_guard set manager_count=manager_count+1 where singleton;
  if not found then raise exception 'Management guard is not initialized' using errcode='23514'; end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function public.protect_last_967_manager() from public,anon,authenticated,service_role;
drop trigger if exists protect_last_967_manager on public.editors;
-- AFTER is essential: INSERT ... ON CONFLICT runs BEFORE INSERT even when no
-- row is inserted, which would otherwise increment the counter twice/drift.
create trigger protect_last_967_manager after insert or update of role or delete on public.editors
for each row execute function public.protect_last_967_manager();
commit;
