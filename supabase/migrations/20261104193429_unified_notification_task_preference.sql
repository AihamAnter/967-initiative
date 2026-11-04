-- Add only the missing tasks switch to existing per-account preferences.
-- Existing accounts keep notifications enabled, as before.
alter table public.account_preferences
 add column if not exists notify_tasks boolean not null default true;
