-- Run once in Supabase SQL Editor.
-- Adds two editor levels: admin (content add/update) and management (full access).

alter table public.editors
  add column if not exists role text not null default 'admin',
  add column if not exists added_by uuid references auth.users(id) on delete set null;

alter table public.editors drop constraint if exists editors_role_check;
alter table public.editors
  add constraint editors_role_check check (role in ('admin', 'management'));

-- Bootstrap existing installations: promote the oldest editor only when no manager exists.
update public.editors
set role = 'management'
where user_id = (
  select user_id from public.editors order by added_at asc limit 1
)
and not exists (select 1 from public.editors where role = 'management');

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors
    where user_id = (select auth.uid()) and role = 'management'
  );
$$;

revoke all on function public.is_editor() from public;
revoke all on function public.is_management() from public;
grant execute on function public.is_editor() to anon, authenticated;
grant execute on function public.is_management() to authenticated;

drop policy if exists "Editors can see themselves" on public.editors;
drop policy if exists "Editors can see permitted accounts" on public.editors;
create policy "Editors can see permitted accounts"
on public.editors for select to authenticated
using (user_id = (select auth.uid()) or public.is_management());

-- Standard content tables keep editor insert/update access, but deletion is management-only.
do $$
declare
  entry record;
begin
  for entry in
    select * from (values
      ('works', 'Editors delete works'),
      ('issues', 'Editors delete issues'),
      ('site_settings', 'Editors delete site settings'),
      ('yemeni_companies', 'Editors delete companies'),
      ('professionals', 'Editors delete professionals'),
      ('yemeni_figures', 'Editors delete Yemeni figures'),
      ('governorates', 'Editors delete governorates'),
      ('districts', 'Editors delete districts')
    ) as policies(table_name, old_policy)
  loop
    if to_regclass('public.' || entry.table_name) is not null then
      execute format('drop policy if exists %I on public.%I', entry.old_policy, entry.table_name);
      execute format('drop policy if exists %I on public.%I', 'Management delete ' || entry.table_name, entry.table_name);
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_management())',
        'Management delete ' || entry.table_name,
        entry.table_name
      );
    end if;
  end loop;
end $$;

-- Statistics previously used FOR ALL policies. Split them so editors cannot delete rows.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'stat_sections', 'stat_domains', 'stat_sources', 'stat_indicators', 'stat_values'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I on public.%I', table_name || '_editor_all', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_editor_read', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_editor_insert', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_editor_update', table_name);
      execute format('drop policy if exists %I on public.%I', table_name || '_management_delete', table_name);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_editor())', table_name || '_editor_read', table_name);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_editor())', table_name || '_editor_insert', table_name);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', table_name || '_editor_update', table_name);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_management())', table_name || '_management_delete', table_name);
    end if;
  end loop;
end $$;

-- Indicator-source rows are internal links replaced during a normal indicator edit.
-- Editors may delete these links without gaining permission to delete either record.
do $$
begin
  if to_regclass('public.stat_indicator_sources') is not null then
    drop policy if exists stat_indicator_sources_editor_all on public.stat_indicator_sources;
    drop policy if exists stat_indicator_sources_editor_read on public.stat_indicator_sources;
    drop policy if exists stat_indicator_sources_editor_insert on public.stat_indicator_sources;
    drop policy if exists stat_indicator_sources_editor_update on public.stat_indicator_sources;
    drop policy if exists stat_indicator_sources_editor_delete on public.stat_indicator_sources;
    drop policy if exists stat_indicator_sources_management_delete on public.stat_indicator_sources;
    create policy stat_indicator_sources_editor_read on public.stat_indicator_sources
      for select to authenticated using (public.is_editor());
    create policy stat_indicator_sources_editor_insert on public.stat_indicator_sources
      for insert to authenticated with check (public.is_editor());
    create policy stat_indicator_sources_editor_update on public.stat_indicator_sources
      for update to authenticated using (public.is_editor()) with check (public.is_editor());
    create policy stat_indicator_sources_editor_delete on public.stat_indicator_sources
      for delete to authenticated using (public.is_editor());
  end if;
end $$;

-- Uploaded files follow the same rule: editors upload/update, management can delete.
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Editors delete media" on storage.objects;
    drop policy if exists "Management delete media" on storage.objects;
    create policy "Management delete media" on storage.objects
      for delete to authenticated
      using (bucket_id = 'media' and public.is_management());
  end if;
end $$;

comment on column public.editors.role is
  'admin: add/update content only; management: full content and editor management access';
