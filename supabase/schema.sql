-- Run this once in Supabase SQL Editor.
-- SECURITY: editors are approved manually from the SQL editor, never self-registered.
create extension if not exists pgcrypto;

create table if not exists public.editors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 added_at timestamptz not null default now()
);
create table if not exists public.works (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 1 and 120),
 title text not null check (length(title) between 1 and 250),
 summary text not null default '',
 category text not null default 'المجتمع',
 platform text not null default 'إنستغرام',
 external_url text not null check (external_url ~ '^https?://'),
 thumbnail_url text,
 published_at timestamptz not null default now(),
 is_published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.issues (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 1 and 120),
 number integer not null unique check (number > 0),
 title text not null check (length(title) between 1 and 250),
 summary text not null default '',
 cover_url text,
 pdf_url text not null check (pdf_url ~ '^https?://'),
 issue_date date not null,
 is_published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 email text not null,
 type text not null,
 message text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
 key text primary key,
 value jsonb not null,
 updated_at timestamptz not null default now()
);
insert into public.site_settings(key,value)
 values ('home_marquee_items','["معرفة","حوار","مجتمع","مستقبل"]'::jsonb)
on conflict (key) do nothing;
create index if not exists works_public_idx on public.works(is_published,published_at desc);
create index if not exists issues_public_idx on public.issues(is_published,issue_date desc);
create index if not exists messages_created_idx on public.messages(created_at desc);

-- Explicit least-privilege grants (RLS still determines visible rows).
grant usage on schema public to anon,authenticated;
grant select on public.works,public.issues,public.site_settings to anon;
grant select,insert,update,delete on public.works,public.issues,public.site_settings to authenticated;
grant select on public.editors,public.messages to authenticated;
revoke all on public.messages from anon;
revoke all on public.editors from anon;

alter table public.editors enable row level security;
alter table public.works enable row level security;
alter table public.issues enable row level security;
alter table public.messages enable row level security;
alter table public.site_settings enable row level security;

-- Editor identity visibility is limited to the editor's own entry.
create policy "Editors can see themselves" on public.editors for select to authenticated using (user_id=(select auth.uid()));

-- Public can read published content only. Approved editors can read drafts.
create policy "Read published works and editor drafts" on public.works for select to anon,authenticated using (
 is_published or exists(select 1 from public.editors where user_id=(select auth.uid()))
);
create policy "Read published issues and editor drafts" on public.issues for select to anon,authenticated using (
 is_published or exists(select 1 from public.editors where user_id=(select auth.uid()))
);
create policy "Editors insert works" on public.works for insert to authenticated with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors update works" on public.works for update to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid()))) with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors delete works" on public.works for delete to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors insert issues" on public.issues for insert to authenticated with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors update issues" on public.issues for update to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid()))) with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors delete issues" on public.issues for delete to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid())));

create policy "Public read site settings" on public.site_settings for select to anon,authenticated using (true);
create policy "Editors insert site settings" on public.site_settings for insert to authenticated with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors update site settings" on public.site_settings for update to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid()))) with check (exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors delete site settings" on public.site_settings for delete to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid())));

-- Only editors can see messages; insert is performed by server with service role.
create policy "Editors read messages" on public.messages for select to authenticated using (exists(select 1 from public.editors where user_id=(select auth.uid())));

-- Public bucket for published magazine PDFs, thumbnails, covers.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('media','media',true,41943040,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=41943040,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

create policy "Media is public" on storage.objects for select to anon,authenticated using (bucket_id='media');
create policy "Editors upload media" on storage.objects for insert to authenticated with check (bucket_id='media' and exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors update media" on storage.objects for update to authenticated using (bucket_id='media' and exists(select 1 from public.editors where user_id=(select auth.uid())));
create policy "Editors delete media" on storage.objects for delete to authenticated using (bucket_id='media' and exists(select 1 from public.editors where user_id=(select auth.uid())));

-- After you create your first email/password user in Supabase Authentication,
-- retrieve its user UUID in Authentication > Users and run:
-- INSERT INTO public.editors(user_id) VALUES ('PASTE-AUTH-USER-UUID-HERE');
-- Do not put admin credentials in the repository.
