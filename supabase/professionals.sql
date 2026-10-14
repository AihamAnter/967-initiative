-- Run once in Supabase SQL Editor after supabase/schema.sql.
-- Public directory for professionals, craftspeople and service providers.

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  full_name text not null check (length(full_name) between 2 and 160),
  profession_title text not null,
  category text not null,
  location text not null,
  service_areas text[] not null default '{}',
  service_mode text not null default 'حضوري',
  years_experience integer check (years_experience is null or years_experience between 0 and 80),
  availability text not null default '',
  bio text not null default '',
  services text[] not null default '{}',
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  phone text,
  whatsapp text,
  email text,
  website text check (website is null or website ~ '^https?://'),
  instagram text check (instagram is null or instagram ~ '^https?://'),
  profile_image_url text,
  image_position text not null default 'center',
  is_verified boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professionals_public_idx
  on public.professionals(is_published, created_at desc);

create index if not exists professionals_search_idx
  on public.professionals(category, location);

grant select on public.professionals to anon, authenticated;
grant insert, update, delete on public.professionals to authenticated;

alter table public.professionals enable row level security;

drop policy if exists "Public reads published professionals" on public.professionals;
drop policy if exists "Editors read all professionals" on public.professionals;
drop policy if exists "Editors insert professionals" on public.professionals;
drop policy if exists "Editors update professionals" on public.professionals;
drop policy if exists "Editors delete professionals" on public.professionals;

create policy "Public reads published professionals"
on public.professionals for select to anon, authenticated
using (is_published);

create policy "Editors read all professionals"
on public.professionals for select to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors insert professionals"
on public.professionals for insert to authenticated
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors update professionals"
on public.professionals for update to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())))
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors delete professionals"
on public.professionals for delete to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

-- Profile photos use the existing public media bucket and editor write policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 41943040, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 41943040,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];
