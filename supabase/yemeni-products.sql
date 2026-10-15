-- Run once in Supabase SQL Editor after supabase/schema.sql.
-- Stores Yemeni companies and their product lists for the public directory and admin panel.

create table if not exists public.yemeni_companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 180),
  legal_name text not null default '',
  category text not null,
  location text not null,
  scale text not null default '',
  entity_type text not null default '',
  ownership text not null default '',
  owner_name text not null default '',
  ceo_name text not null default '',
  founded text not null default '',
  team_size text not null default '',
  address text not null default '',
  google_maps_url text check (google_maps_url is null or google_maps_url ~ '^https?://'),
  website text check (website is null or website ~ '^https?://'),
  email text,
  phone text,
  summary text not null default '',
  story text not null default '',
  impact text not null default '',
  strengths text[] not null default '{}',
  markets text[] not null default '{}',
  products jsonb not null default '[]'::jsonb check (jsonb_typeof(products) = 'array'),
  image_url text,
  image_position text not null default 'center',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yemeni_companies_public_idx
  on public.yemeni_companies(is_published, created_at desc);

comment on column public.yemeni_companies.products is
  'JSON array. Each product may contain name, description, format, image_url, size, weight, quantity, wholesale_price, retail_price and currency.';

grant select on public.yemeni_companies to anon, authenticated;
grant insert, update, delete on public.yemeni_companies to authenticated;

alter table public.yemeni_companies enable row level security;

drop policy if exists "Read published companies and editor drafts" on public.yemeni_companies;
drop policy if exists "Public reads published companies" on public.yemeni_companies;
drop policy if exists "Editors read all companies" on public.yemeni_companies;
drop policy if exists "Editors insert companies" on public.yemeni_companies;
drop policy if exists "Editors update companies" on public.yemeni_companies;
drop policy if exists "Editors delete companies" on public.yemeni_companies;

create policy "Public reads published companies"
on public.yemeni_companies for select to anon, authenticated
using (is_published);

create policy "Editors read all companies"
on public.yemeni_companies for select to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors insert companies"
on public.yemeni_companies for insert to authenticated
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors update companies"
on public.yemeni_companies for update to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())))
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors delete companies"
on public.yemeni_companies for delete to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

-- Company images use the existing public media bucket and its editor-only write policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 41943040, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 41943040,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];
