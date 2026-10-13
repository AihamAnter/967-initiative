-- Run this once in Supabase SQL Editor to enable editable homepage marquee settings.

create table if not exists public.site_settings (
 key text primary key,
 value jsonb not null,
 updated_at timestamptz not null default now()
);

insert into public.site_settings(key,value)
 values ('home_marquee_items','["معرفة","حوار","مجتمع","مستقبل"]'::jsonb)
on conflict (key) do nothing;

grant select on public.site_settings to anon;
grant select,insert,update,delete on public.site_settings to authenticated;

alter table public.site_settings enable row level security;

drop policy if exists "Public read site settings" on public.site_settings;
drop policy if exists "Editors insert site settings" on public.site_settings;
drop policy if exists "Editors update site settings" on public.site_settings;
drop policy if exists "Editors delete site settings" on public.site_settings;

create policy "Public read site settings" on public.site_settings
 for select to anon,authenticated
 using (true);

create policy "Editors insert site settings" on public.site_settings
 for insert to authenticated
 with check (exists(select 1 from public.editors where user_id=(select auth.uid())));

create policy "Editors update site settings" on public.site_settings
 for update to authenticated
 using (exists(select 1 from public.editors where user_id=(select auth.uid())))
 with check (exists(select 1 from public.editors where user_id=(select auth.uid())));

create policy "Editors delete site settings" on public.site_settings
 for delete to authenticated
 using (exists(select 1 from public.editors where user_id=(select auth.uid())));
