-- Optional schema for editable text/profile data used by /yemen-map.
-- Boundary geometry remains in public/data/yemen-map/yemen-boundaries.json and is linked by p-code ids.

create table if not exists public.governorates (
  id text primary key,
  name_ar text not null,
  name_en text,
  capital text,
  area_km2 numeric,
  population bigint,
  population_year integer,
  district_count integer,
  description text,
  history text,
  geography text,
  economy text,
  landmarks text,
  image_url text,
  updated_at timestamptz default now()
);

create table if not exists public.districts (
  id text primary key,
  governorate_id text references public.governorates(id) on delete set null,
  name_ar text not null,
  name_en text,
  capital text,
  area_km2 numeric,
  population bigint,
  population_year integer,
  description text,
  landmarks text,
  image_url text,
  updated_at timestamptz default now()
);

create index if not exists districts_governorate_idx on public.districts(governorate_id);

grant select on public.governorates, public.districts to anon, authenticated;
grant insert, update, delete on public.governorates, public.districts to authenticated;

alter table public.governorates enable row level security;
alter table public.districts enable row level security;

drop policy if exists "Public read governorates" on public.governorates;
drop policy if exists "Public read districts" on public.districts;
drop policy if exists "Editors insert governorates" on public.governorates;
drop policy if exists "Editors update governorates" on public.governorates;
drop policy if exists "Editors delete governorates" on public.governorates;
drop policy if exists "Editors insert districts" on public.districts;
drop policy if exists "Editors update districts" on public.districts;
drop policy if exists "Editors delete districts" on public.districts;

create policy "Public read governorates"
on public.governorates for select to anon, authenticated
using (true);

create policy "Public read districts"
on public.districts for select to anon, authenticated
using (true);

create policy "Editors insert governorates"
on public.governorates for insert to authenticated
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors update governorates"
on public.governorates for update to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())))
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors delete governorates"
on public.governorates for delete to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors insert districts"
on public.districts for insert to authenticated
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors update districts"
on public.districts for update to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())))
with check (exists(select 1 from public.editors where user_id = (select auth.uid())));

create policy "Editors delete districts"
on public.districts for delete to authenticated
using (exists(select 1 from public.editors where user_id = (select auth.uid())));
