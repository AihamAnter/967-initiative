-- Run once in Supabase SQL Editor after supabase/schema.sql.
-- Content used by the "Yemeni figures" directory on /yemen-map.

create table if not exists public.yemeni_figures (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  full_name text not null check (length(full_name) between 2 and 160),
  known_for text not null default '',
  field text not null,
  governorate_id text not null,
  governorate_name text not null,
  era text not null check (era in ('معاصرة', 'تاريخية')),
  birth_year integer check (birth_year is null or birth_year between 500 and 2100),
  death_year integer check (death_year is null or death_year between 500 and 2100),
  short_bio text not null default '',
  image_url text,
  website text check (website is null or website ~ '^https?://'),
  facebook_url text check (facebook_url is null or facebook_url ~ '^https?://'),
  instagram_url text check (instagram_url is null or instagram_url ~ '^https?://'),
  x_url text check (x_url is null or x_url ~ '^https?://'),
  youtube_url text check (youtube_url is null or youtube_url ~ '^https?://'),
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (death_year is null or birth_year is null or death_year >= birth_year)
);

alter table public.yemeni_figures
  add column if not exists image_credit text not null default '',
  add column if not exists image_source_url text;

create index if not exists yemeni_figures_public_idx
  on public.yemeni_figures(is_published, display_order, full_name);

create index if not exists yemeni_figures_filters_idx
  on public.yemeni_figures(governorate_id, field, era);

grant select on public.yemeni_figures to anon, authenticated;
grant insert, update, delete on public.yemeni_figures to authenticated;

alter table public.yemeni_figures enable row level security;

drop policy if exists "Public reads published Yemeni figures" on public.yemeni_figures;
drop policy if exists "Editors read all Yemeni figures" on public.yemeni_figures;
drop policy if exists "Editors insert Yemeni figures" on public.yemeni_figures;
drop policy if exists "Editors update Yemeni figures" on public.yemeni_figures;
drop policy if exists "Editors delete Yemeni figures" on public.yemeni_figures;

create policy "Public reads published Yemeni figures"
on public.yemeni_figures for select to anon, authenticated
using (is_published);

create policy "Editors read all Yemeni figures"
on public.yemeni_figures for select to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors insert Yemeni figures"
on public.yemeni_figures for insert to authenticated
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors update Yemeni figures"
on public.yemeni_figures for update to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())))
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors delete Yemeni figures"
on public.yemeni_figures for delete to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

-- Figure portraits use the existing public media bucket and editor write policies.
-- Expanded biographies are private versioned JSON objects, served only after a
-- published-row lookup or an authorized editorial request. No anonymous policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('figure-profiles', 'figure-profiles', false, 500000, array['application/json'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 41943040, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 41943040,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];

-- Import the reviewed expanded profiles with npm run data:figures -- --apply.
-- The importer preserves existing editorial records and stores private revisions.
