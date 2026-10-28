-- A single official Games 967 challenge attempt per verified account per UTC day.
-- One unique (user_id, challenge_date) across ALL game types, enforced atomically
-- in PostgreSQL, so refreshing a page, clearing localStorage, and changing devices
-- can never grant an additional attempt.
create table if not exists public.game_daily_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 challenge_date date not null default (timezone('utc', now()))::date,
 game_type text not null check (game_type in ('quiz','place','timeline','map')),
 started_at timestamptz not null default now(),
 constraint game_daily_attempts_one_per_user_per_utc_day unique(user_id, challenge_date)
);
create index if not exists game_daily_attempts_day_idx on public.game_daily_attempts(challenge_date desc);
alter table public.game_daily_attempts enable row level security;
revoke all on public.game_daily_attempts from anon, authenticated;
grant select on public.game_daily_attempts to authenticated;
-- Users can read only their own attempts. All inserts are done on the server
-- after getUser(token) + email verification + UTC date/game validation.
drop policy if exists game_daily_attempts_owner_read on public.game_daily_attempts;
create policy game_daily_attempts_owner_read on public.game_daily_attempts
 for select to authenticated using ((select auth.uid())=user_id);
comment on table public.game_daily_attempts is 'One official daily challenge start per authenticated user and UTC date. A start consumes the attempt even if the browser closes. No scores are asserted verified by this table.';
