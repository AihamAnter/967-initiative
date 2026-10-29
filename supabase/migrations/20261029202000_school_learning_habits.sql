-- Phase 3: private, resumable lesson drafts and self-selected learning goals.
alter table public.school_stage_attempts add column if not exists draft jsonb;
alter table public.school_stage_attempts add column if not exists draft_version integer not null default 0;
alter table public.school_stage_attempts add constraint school_stage_draft_shape
 check (draft is null or (jsonb_typeof(draft)='object'
 and jsonb_typeof(draft->'answers')='array' and jsonb_array_length(draft->'answers')<=5));
alter table public.school_stage_attempts add constraint school_stage_draft_version_positive check (draft_version>=0);
create table if not exists public.school_learning_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 daily_goal integer not null default 1 check(daily_goal in (1,2,3)),
 updated_at timestamptz not null default now()
);
alter table public.school_learning_preferences enable row level security;
revoke all on table public.school_learning_preferences from public,anon,authenticated,service_role;
grant select,insert,update on table public.school_learning_preferences to service_role;
comment on table public.school_learning_preferences is 'Private School 967 daily goals; verified server-only read and write.';
