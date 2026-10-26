begin;
alter table public.tasks add column if not exists auto_archive_at timestamptz;
alter table public.tasks add column if not exists auto_archived boolean not null default false;
create index if not exists tasks_auto_archive_due on public.tasks(auto_archive_at,completed_at)
 where status='completed' and archived_at is null and deleted_at is null;

create or replace function public.task_schedule_auto_archive() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.status<>'completed' then new.auto_archive_at:=null;new.auto_archived:=false;
 elsif tg_op='INSERT' or old.status<>'completed' then new.auto_archive_at:=new.completed_at+interval '24 hours';new.auto_archived:=false;
 elsif old.archived_at is not null and new.archived_at is null then new.auto_archive_at:=clock_timestamp()+interval '24 hours';new.auto_archived:=false;
 else new.auto_archive_at:=old.auto_archive_at; end if;
 return new;
end $$;
revoke all on function public.task_schedule_auto_archive() from public,anon,authenticated;
drop trigger if exists task_schedule_auto_archive on public.tasks;
-- Alphabetical trigger order: task_guard owns completed_at before scheduling.
create trigger task_schedule_auto_archive before insert or update on public.tasks
for each row execute function public.task_schedule_auto_archive();

create or replace function public.task_archive_completed() returns integer
language plpgsql security definer set search_path='' as $$
declare item record; n integer:=0; audit_watermark bigint;
 previous_sub text:=current_setting('request.jwt.claim.sub',true);
 previous_claims text:=current_setting('request.jwt.claims',true);
 actor uuid; manager uuid;
begin
 if auth.uid() is null then
  if current_setting('role',true) in ('authenticated','anon') then raise exception 'Editor required' using errcode='42501'; end if;
 elsif public.task_role() is null then raise exception 'Editor required' using errcode='42501'; end if;
 select user_id into manager from public.editors where role='management' order by user_id limit 1;
 for item in select t.id,t.assigned_to from public.tasks t
  where t.status='completed' and t.archived_at is null and t.deleted_at is null
  and coalesce(t.auto_archive_at,t.completed_at+interval '24 hours')<=clock_timestamp()
  order by coalesce(t.auto_archive_at,t.completed_at+interval '24 hours'),t.id
  for update skip locked limit 500
 loop
  select user_id into actor from public.editors where user_id=item.assigned_to and role in ('admin','management');
  actor:=coalesce(manager,actor);if actor is null then continue; end if;
  -- The only allowed system mutation is archiving an already completed,
  -- due, locked row. Existing task guards, revisions and audit stay enabled.
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  select coalesce(max(id),0) into audit_watermark from public.task_activity where task_id=item.id;
  update public.tasks set archived_at=clock_timestamp(),auto_archived=true where id=item.id;
  update public.task_activity set actor_id=null,action=case when field='archived_at' then 'auto_archived' else action end
   where task_id=item.id and id>audit_watermark and actor_id=actor;
  n:=n+1;
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 return n;
end $$;
revoke all on function public.task_archive_completed() from public,anon,authenticated;
grant execute on function public.task_archive_completed() to authenticated;
-- Supabase Cron runs independently of open browser windows. Installations
-- without pg_cron still run the same idempotent maintenance on authorized reads.
do $$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') and exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension pg_cron with schema pg_catalog;
 end if;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  grant usage on schema cron to postgres;
  grant all privileges on all tables in schema cron to postgres;
  perform cron.schedule('967-task-auto-archive','*/5 * * * *','select public.task_archive_completed();');
 end if;
end $$;
commit;
