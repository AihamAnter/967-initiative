-- PROPOSAL ONLY. This audit did NOT apply this SQL to production.
-- Review in a disposable/staging Supabase project after schema + admin-roles.sql.
-- No records are changed; policies / a concurrency guard are updated atomically.
-- Preserve a pg_policies/pg_get_functiondef snapshot before applying.
begin;

-- Legacy combined policies referenced editors as anon (permission denied).
-- Keep the public rule separate from the approved editor rule.
drop policy if exists "Read published works and editor drafts" on public.works;
drop policy if exists "Public reads published works" on public.works;
drop policy if exists "Editors read all works" on public.works;
create policy "Public reads published works" on public.works
  for select to anon, authenticated using (is_published);
create policy "Editors read all works" on public.works
  for select to authenticated using (public.is_editor());

drop policy if exists "Read published issues and editor drafts" on public.issues;
drop policy if exists "Public reads published issues" on public.issues;
drop policy if exists "Editors read all issues" on public.issues;
create policy "Public reads published issues" on public.issues
  for select to anon, authenticated using (is_published);
create policy "Editors read all issues" on public.issues
  for select to authenticated using (public.is_editor());

drop policy if exists "Read published companies and editor drafts" on public.yemeni_companies;
drop policy if exists "Public reads published companies" on public.yemeni_companies;
drop policy if exists "Editors read all companies" on public.yemeni_companies;
create policy "Public reads published companies" on public.yemeni_companies
  for select to anon, authenticated using (is_published);
create policy "Editors read all companies" on public.yemeni_companies
  for select to authenticated using (public.is_editor());

-- Child rows must not expose withdrawn parent sections/domains/sources via REST.
drop policy if exists stat_domains_public_read on public.stat_domains;
create policy stat_domains_public_read on public.stat_domains
for select to anon, authenticated using (
  is_published and exists(select 1 from public.stat_sections s where s.id = section_id and s.is_published)
);
drop policy if exists stat_indicators_public_read on public.stat_indicators;
create policy stat_indicators_public_read on public.stat_indicators
for select to anon, authenticated using (
  is_published and (not hide_when_incomplete or data_status = 'complete')
  and exists(select 1 from public.stat_domains d join public.stat_sections s on s.id = d.section_id
    where d.id = domain_id and d.is_published and s.is_published)
);
drop policy if exists stat_values_public_read on public.stat_values;
create policy stat_values_public_read on public.stat_values
for select to anon, authenticated using (
  is_published and national_scope
  and exists(select 1 from public.stat_sources s where s.id = source_id and s.is_active)
  and exists(select 1 from public.stat_indicators i
    join public.stat_domains d on d.id = i.domain_id
    join public.stat_sections s on s.id = d.section_id
    where i.id = indicator_id and i.is_published and (not i.hide_when_incomplete or i.data_status = 'complete')
      and d.is_published and s.is_published)
);
drop policy if exists stat_indicator_sources_public_read on public.stat_indicator_sources;
create policy stat_indicator_sources_public_read on public.stat_indicator_sources
for select to anon, authenticated using (
  exists(select 1 from public.stat_sources s where s.id = source_id and s.is_active)
  and exists(select 1 from public.stat_indicators i
    join public.stat_domains d on d.id = i.domain_id
    join public.stat_sections s on s.id = d.section_id
    where i.id = indicator_id and i.is_published and (not i.hide_when_incomplete or i.data_status = 'complete')
      and d.is_published and s.is_published)
);

-- Defense against accidental account self-assignment through permissive grants.
revoke insert, update, delete on public.editors from anon, authenticated;

-- All API role-changing paths have an application check. The DB also serializes
-- removals so two concurrent management sessions cannot both remove the last one.
create or replace function public.protect_last_967_manager()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(967, 1);
  if TG_OP = 'DELETE' then
    if OLD.role = 'management' and not exists(
      select 1 from public.editors where role = 'management' and user_id <> OLD.user_id
    ) then raise exception 'Cannot remove the last management account'; end if;
    return OLD;
  end if;
  if OLD.role = 'management' and NEW.role <> 'management' and not exists(
    select 1 from public.editors where role = 'management' and user_id <> OLD.user_id
  ) then raise exception 'Cannot demote the last management account'; end if;
  return NEW;
end;
$$;
revoke all on function public.protect_last_967_manager() from public;
drop trigger if exists protect_last_967_manager on public.editors;
create trigger protect_last_967_manager before update of role or delete on public.editors
  for each row execute function public.protect_last_967_manager();

commit;
