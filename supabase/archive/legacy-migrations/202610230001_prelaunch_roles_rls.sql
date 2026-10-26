-- Review in an isolated Supabase database after the current schema/role modules.
-- No production execution by the prelaunch audit. No content rows are changed.
begin;

-- Server authentication bans and unconfirmed editor accounts must also fail
-- direct PostgREST/RPC checks while a previously issued JWT is still valid.
create or replace function public.active_editor_role() returns text
language sql stable security definer set search_path='' as $$
 select e.role from public.editors e join auth.users u on u.id=e.user_id
 where e.user_id=auth.uid() and e.role in ('admin','management')
 and u.email_confirmed_at is not null
 and (u.banned_until is null or u.banned_until<=now())
$$;
revoke all on function public.active_editor_role() from public;
grant execute on function public.active_editor_role() to anon,authenticated,service_role;
create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path='' as $$ select public.active_editor_role() is not null $$;
create or replace function public.is_management() returns boolean
language sql stable security definer set search_path='' as $$ select public.active_editor_role()='management' $$;
revoke all on function public.is_editor(),public.is_management() from public;
grant execute on function public.is_editor(),public.is_management() to anon,authenticated,service_role;
do $$
begin
 if to_regprocedure('public.is_967_editor()') is not null then
  execute 'create or replace function public.is_967_editor() returns boolean language sql stable security definer set search_path='''' as ''select public.is_editor()''';
 end if;
 if to_regprocedure('public.is_ranking_editor()') is not null then
  execute 'create or replace function public.is_ranking_editor() returns boolean language sql stable security definer set search_path='''' as ''select public.is_editor()''';
 end if;
 if to_regprocedure('public.task_role()') is not null then
  execute 'create or replace function public.task_role() returns text language sql stable security definer set search_path='''' as ''select public.active_editor_role()''';
 end if;
 if to_regprocedure('public.debate_role()') is not null then
  execute 'create or replace function public.debate_role() returns text language sql stable security definer set search_path='''' as ''select public.active_editor_role()''';
 end if;
end $$;
drop policy if exists "Editors can see themselves" on public.editors;
drop policy if exists "Editors can see permitted accounts" on public.editors;
create policy "Editors can see permitted accounts" on public.editors for select to authenticated
using(public.is_editor() and (user_id=auth.uid() or public.is_management()));
revoke insert,update,delete,truncate on public.editors from anon,authenticated;

-- Split the legacy anon policy that queried the non-public editors table.
do $$
declare t text; old_name text;
begin
 foreach t in array array['works','issues','yemeni_companies'] loop
  if to_regclass('public.'||t) is not null then
   old_name:=case t when 'works' then 'Read published works and editor drafts' when 'issues' then 'Read published issues and editor drafts' else 'Read published companies and editor drafts' end;
   execute format('drop policy if exists %I on public.%I',old_name,t);
   execute format('drop policy if exists %I on public.%I','Public reads published '||t,t);
   execute format('drop policy if exists %I on public.%I','Editors read all '||t,t);
   execute format('create policy %I on public.%I for select to anon,authenticated using(is_published)','Public reads published '||t,t);
   execute format('create policy %I on public.%I for select to authenticated using(public.is_editor())','Editors read all '||t,t);
  end if;
 end loop;
end $$;

-- This section requires the statistics module; omit automatically only when
-- the whole module is absent, never silently apply a partial policy graph.
do $$
begin
 if to_regclass('public.stat_sections') is not null then
  drop policy if exists stat_domains_public_read on public.stat_domains;
  create policy stat_domains_public_read on public.stat_domains for select to anon,authenticated using(
   is_published and exists(select 1 from public.stat_sections s where s.id=section_id and s.is_published));
  drop policy if exists stat_indicators_public_read on public.stat_indicators;
  create policy stat_indicators_public_read on public.stat_indicators for select to anon,authenticated using(
   is_published and (not hide_when_incomplete or data_status='complete') and exists(
    select 1 from public.stat_domains d join public.stat_sections s on s.id=d.section_id
    where d.id=domain_id and d.is_published and s.is_published));
  drop policy if exists stat_values_public_read on public.stat_values;
  create policy stat_values_public_read on public.stat_values for select to anon,authenticated using(
   is_published and national_scope and exists(select 1 from public.stat_sources s where s.id=source_id and s.is_active)
   and exists(select 1 from public.stat_indicators i join public.stat_domains d on d.id=i.domain_id
    join public.stat_sections s on s.id=d.section_id where i.id=indicator_id and i.is_published
    and (not i.hide_when_incomplete or i.data_status='complete') and d.is_published and s.is_published));
  drop policy if exists stat_indicator_sources_public_read on public.stat_indicator_sources;
  create policy stat_indicator_sources_public_read on public.stat_indicator_sources for select to anon,authenticated using(
   exists(select 1 from public.stat_sources s where s.id=source_id and s.is_active)
   and exists(select 1 from public.stat_indicators i join public.stat_domains d on d.id=i.domain_id
    join public.stat_sections s on s.id=d.section_id where i.id=indicator_id and i.is_published
    and (not i.hide_when_incomplete or i.data_status='complete') and d.is_published and s.is_published));
 end if;
end $$;
commit;
