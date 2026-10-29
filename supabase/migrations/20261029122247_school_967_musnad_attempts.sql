-- Private, server-graded learning attempts for the first 967 School course.
create table if not exists public.school_stage_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 course_slug text not null check (course_slug = 'musnad'),
 stage_index integer not null check (stage_index between 0 and 2),
 attempt_no integer not null check (attempt_no between 1 and 100000),
 questions jsonb not null check (jsonb_typeof(questions) = 'array'),
 submission jsonb,
 score integer check (score between 0 and 6),
 status text not null default 'active' check (status in ('active','passed','failed','abandoned')),
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 unique (user_id,course_slug,stage_index,attempt_no)
);
create unique index if not exists school_stage_one_active on public.school_stage_attempts(user_id,course_slug,stage_index) where status='active';
create index if not exists school_stage_attempts_progress on public.school_stage_attempts(user_id,course_slug,created_at desc);
alter table public.school_stage_attempts enable row level security;
revoke all on table public.school_stage_attempts from public, anon, authenticated;
grant select,insert,update,delete on table public.school_stage_attempts to service_role;
comment on table public.school_stage_attempts is 'Private, server-graded 967 School attempts. No direct browser access; API authenticates ownership before service-role reads.';
