-- Harden editor RLS, remove unused write grants, protect the last management
-- account and declare the storage buckets the app depends on.
--
-- Behaviour notes:
-- * The public site reads through the service role, which bypasses RLS, so
--   none of the policy changes below alter what visitors see on 967ye.com.
-- * Editors keep every capability as long as their email is confirmed and
--   they are not suspended (public.is_editor() -> editorial_can_read()).

-- 1. Editor policies used EXISTS(select ... from editors) directly, which skipped
--    the confirmed-email and suspension checks added on 2026-10-31.
alter policy "Editors insert districts" on public.districts with check ((select public.is_editor()));
alter policy "Editors update districts" on public.districts using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert governorates" on public.governorates with check ((select public.is_editor()));
alter policy "Editors update governorates" on public.governorates using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert issues" on public.issues with check ((select public.is_editor()));
alter policy "Editors read all issues" on public.issues using ((select public.is_editor()));
alter policy "Editors update issues" on public.issues using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert professionals" on public.professionals with check ((select public.is_editor()));
alter policy "Editors read all professionals" on public.professionals using ((select public.is_editor()));
alter policy "Editors update professionals" on public.professionals using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert site settings" on public.site_settings with check ((select public.is_editor()));
alter policy "Editors update site settings" on public.site_settings using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert works" on public.works with check ((select public.is_editor()));
alter policy "Editors read all works" on public.works using ((select public.is_editor()));
alter policy "Editors update works" on public.works using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert companies" on public.yemeni_companies with check ((select public.is_editor()));
alter policy "Editors update companies" on public.yemeni_companies using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors insert Yemeni figures" on public.yemeni_figures with check ((select public.is_editor()));
alter policy "Editors read all Yemeni figures" on public.yemeni_figures using ((select public.is_editor()));
alter policy "Editors update Yemeni figures" on public.yemeni_figures using ((select public.is_editor())) with check ((select public.is_editor()));
alter policy "Editors upload media" on storage.objects with check (bucket_id = 'media' and (select public.is_editor()));
alter policy "Editors update media" on storage.objects using (bucket_id = 'media' and (select public.is_editor()));

-- 2. The combined companies policy evaluated EXISTS(editors) as anon, which has
--    no SELECT grant on editors, so every anonymous REST read failed with 42501.
drop policy "Read published companies and editor drafts" on public.yemeni_companies;
create policy "Public reads published companies" on public.yemeni_companies
  for select to anon, authenticated using (is_published);
create policy "Editors read all companies" on public.yemeni_companies
  for select to authenticated using ((select public.is_editor()));

-- 3. site_settings was world-readable for every key. Public keys are the legacy
--    site_content / home_marquee_items and anything prefixed public_ (page
--    visibility, content pages, district profiles). Server-only keys such as
--    967_game_questions_v1 (contains answers) and yemen_history_catalog_v1 are
--    read with the service role. New public keys must use the public_ prefix.
alter policy "Public read site settings" on public.site_settings
  using (key in ('site_content', 'home_marquee_items') or key like 'public\_%');
create policy "Editors read all site settings" on public.site_settings
  for select to authenticated using ((select public.is_editor()));

-- 4. Statistics children must not expose rows whose parent section/domain/
--    indicator was withdrawn (from launch-hardening-proposed.sql). Values keep
--    their existing rules; an inactive source now also hides a value.
alter policy stat_domains_public_read on public.stat_domains using (
  is_published and exists (select 1 from public.stat_sections s where s.id = section_id and s.is_published)
);
alter policy stat_indicators_public_read on public.stat_indicators using (
  is_published and (not hide_when_incomplete or data_status = 'complete')
  and exists (
    select 1 from public.stat_domains d join public.stat_sections s on s.id = d.section_id
    where d.id = domain_id and d.is_published and s.is_published
  )
);
alter policy stat_values_public_read on public.stat_values using (
  is_published and national_scope
  and (source_id is null or exists (select 1 from public.stat_sources src where src.id = source_id and src.is_active))
  and exists (
    select 1 from public.stat_indicators i
    join public.stat_domains d on d.id = i.domain_id
    join public.stat_sections s on s.id = d.section_id
    where i.id = indicator_id and i.is_published and (not i.hide_when_incomplete or i.data_status = 'complete')
      and d.is_published and s.is_published
  )
);
alter policy stat_indicator_sources_public_read on public.stat_indicator_sources using (
  exists (select 1 from public.stat_sources src where src.id = source_id and src.is_active)
  and exists (
    select 1 from public.stat_indicators i
    join public.stat_domains d on d.id = i.domain_id
    join public.stat_sections s on s.id = d.section_id
    where i.id = indicator_id and i.is_published and (not i.hide_when_incomplete or i.data_status = 'complete')
      and d.is_published and s.is_published
  )
);

-- 5. Write grants with no matching policy. RLS already blocks these writes;
--    revoking them removes the risk if a permissive policy is ever added.
revoke insert, update, delete on
  public.districts, public.governorates, public.issues, public.professionals,
  public.site_settings, public.stat_domains, public.stat_indicator_sources,
  public.stat_indicators, public.stat_sections, public.stat_sources,
  public.stat_values, public.works, public.yemeni_companies, public.yemeni_figures
from anon;
-- Role changes go through /api/admin/editors with the service role; there is no
-- INSERT/UPDATE/DELETE policy on editors for signed-in users.
revoke insert, update, delete on public.editors from anon, authenticated;

-- 6. The API already refuses to remove the last management account; the
--    database now enforces it too, serialised so two sessions cannot race.
create or replace function public.protect_last_967_manager()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(967, 1);
  if TG_OP = 'DELETE' then
    if OLD.role = 'management' and not exists (
      select 1 from public.editors where role = 'management' and user_id <> OLD.user_id
    ) then raise exception 'Cannot remove the last management account'; end if;
    return OLD;
  end if;
  if OLD.role = 'management' and NEW.role <> 'management' and not exists (
    select 1 from public.editors where role = 'management' and user_id <> OLD.user_id
  ) then raise exception 'Cannot demote the last management account'; end if;
  return NEW;
end;
$$;
revoke all on function public.protect_last_967_manager() from public, anon, authenticated;
drop trigger if exists protect_last_967_manager on public.editors;
create trigger protect_last_967_manager before update of role or delete on public.editors
  for each row execute function public.protect_last_967_manager();

-- 7. Buckets that existed only in legacy setup files. Values match production;
--    existing buckets are left untouched.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 41943040, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('figure-profiles', 'figure-profiles', false, 500000, array['application/json'])
on conflict (id) do nothing;
