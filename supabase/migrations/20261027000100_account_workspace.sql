-- Account workspace V1. Additive; existing profiles, debate votes and content untouched.
begin;
create table if not exists public.account_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 bio text not null default '' check (length(bio)<=600),
 governorate text not null default '' check(length(governorate)<=100),
 website text not null default '' check(length(website)<=300),
 social_url text not null default '' check(length(social_url)<=300),
 activity_tracking boolean not null default false,
 notify_replies boolean not null default true,
 notify_moderation boolean not null default true,
 updated_at timestamptz not null default now()
);
create table if not exists public.account_collections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 2 and 80),
 created_at timestamptz not null default now()
);
create unique index if not exists account_collections_per_user_name on public.account_collections(user_id,lower(name));
create unique index if not exists account_collections_id_user on public.account_collections(id,user_id);
create index if not exists account_collections_owner on public.account_collections(user_id,created_at desc);

create table if not exists public.account_saved_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 href text not null check (length(href) between 2 and 3000 and left(href,1)='/'),
 kind text not null check(kind in ('work','issue','figure','company','professional','indicator','domain','debate','speaker','ranking','map','timeline','search','page','university','medicalCenter')),
 title text not null check(length(trim(title)) between 1 and 180),
 collection_id uuid null,
 created_at timestamptz not null default now(),
 unique(user_id,href),
 foreign key (collection_id,user_id) references public.account_collections(id,user_id) on delete set null (collection_id)
);
create index if not exists account_saved_owner_date on public.account_saved_items(user_id,created_at desc);
create index if not exists account_saved_collection on public.account_saved_items(user_id,collection_id);

create table if not exists public.account_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('reply','moderation','system')),
 title text not null check(length(title)<=180),
 description text not null default '' check(length(description)<=400),
 href text check(href is null or (length(href)<=400 and left(href,1)='/')),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists account_notifications_owner_date on public.account_notifications(user_id,created_at desc);
create index if not exists account_notifications_owner_unread on public.account_notifications(user_id,created_at desc) where read_at is null;

alter table public.account_preferences enable row level security;
alter table public.account_collections enable row level security;
alter table public.account_saved_items enable row level security;
alter table public.account_notifications enable row level security;

drop policy if exists "account_prefs_owner_read" on public.account_preferences;
create policy "account_prefs_owner_read" on public.account_preferences for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "account_prefs_owner_insert" on public.account_preferences;
create policy "account_prefs_owner_insert" on public.account_preferences for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists "account_prefs_owner_update" on public.account_preferences;
create policy "account_prefs_owner_update" on public.account_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop policy if exists "account_collections_owner" on public.account_collections;
create policy "account_collections_owner" on public.account_collections for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "account_saved_owner" on public.account_saved_items;
create policy "account_saved_owner" on public.account_saved_items for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "account_notifications_read" on public.account_notifications;
create policy "account_notifications_read" on public.account_notifications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "account_notifications_update" on public.account_notifications;
create policy "account_notifications_update" on public.account_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

revoke all on public.account_preferences,public.account_collections,public.account_saved_items,public.account_notifications from anon,authenticated;
grant select,insert,update,delete on public.account_collections,public.account_saved_items to authenticated;
grant select,insert,update on public.account_preferences to authenticated;
grant select,update(read_at) on public.account_notifications to authenticated;

-- Published avatar URLs are visible only by choice; uploaded files themselves
-- are public assets, like other site imagery. Only owner can upload/change.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('967-account-avatars','967-account-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "account_avatar_owner_insert" on storage.objects;
create policy "account_avatar_owner_insert" on storage.objects for insert to authenticated
with check(bucket_id='967-account-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "account_avatar_owner_update" on storage.objects;
create policy "account_avatar_owner_update" on storage.objects for update to authenticated
using(bucket_id='967-account-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='967-account-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "account_avatar_owner_delete" on storage.objects;
create policy "account_avatar_owner_delete" on storage.objects for delete to authenticated
using(bucket_id='967-account-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "account_avatar_owner_select" on storage.objects;
create policy "account_avatar_owner_select" on storage.objects for select to authenticated
using(bucket_id='967-account-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Notifications are written by a trigger, never by ordinary user requests.
create or replace function public.account_notify_debate_change()
returns trigger language plpgsql security definer
set search_path=public,pg_temp as $$
declare parent_user uuid; destination uuid; allow_note boolean; notif_title text; notif_href text; notif_kind text;
begin
 if TG_TABLE_NAME='debate_comments' then
   if NEW.parent_id is not null and NEW.status='approved' and
     (TG_OP='INSERT' or OLD.status is distinct from 'approved') then
     select c.user_id into parent_user from public.debate_comments c where c.id=NEW.parent_id;
     destination=parent_user;
     if destination is null or destination=NEW.user_id then return NEW; end if;
     notif_kind='reply'; notif_title='رد جديد على تعليقك';
     notif_href='/debates/'||(select d.slug from public.debates d where d.id=NEW.debate_id)||'#comment-'||NEW.id::text;
   elsif TG_OP='UPDATE' and OLD.status is distinct from NEW.status and NEW.user_id is not null then
     destination=NEW.user_id;notif_kind='moderation';notif_title='تحديث حالة تعليقك';
     notif_href='/account/activity';
   end if;
 elsif TG_TABLE_NAME='debate_questions' and TG_OP='UPDATE' and OLD.status is distinct from NEW.status then
   destination=NEW.user_id;notif_kind='moderation';notif_title='تحديث حالة سؤالك';notif_href='/account/activity';
 elsif TG_TABLE_NAME='debate_suggestions' and TG_OP='UPDATE' and OLD.status is distinct from NEW.status then
   destination=NEW.user_id;notif_kind='moderation';notif_title='تحديث حالة مقترحك';notif_href='/account/activity';
 end if;
 if destination is null then return NEW; end if;
 select case when notif_kind='reply' then coalesce(p.notify_replies,true) else coalesce(p.notify_moderation,true) end
 into allow_note from public.account_preferences p where p.user_id=destination;
 if allow_note is false then return NEW; end if;
 insert into public.account_notifications(user_id,kind,title,description,href)
 values(destination,notif_kind,notif_title,'اطّلع على التحديث في موقع 967.',notif_href);
 return NEW;
end $$;
revoke all on function public.account_notify_debate_change() from public,anon,authenticated;
drop trigger if exists account_notify_comment on public.debate_comments;
create trigger account_notify_comment after insert or update of status on public.debate_comments
for each row execute function public.account_notify_debate_change();
drop trigger if exists account_notify_question on public.debate_questions;
create trigger account_notify_question after update of status on public.debate_questions
for each row execute function public.account_notify_debate_change();
drop trigger if exists account_notify_suggestion on public.debate_suggestions;
create trigger account_notify_suggestion after update of status on public.debate_suggestions
for each row execute function public.account_notify_debate_change();
commit;