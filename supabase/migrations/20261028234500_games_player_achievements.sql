-- Authenticated users may read only their own earned achievements.
-- The server checks verified attempts and performs all inserts through service_role.
create table if not exists public.game_player_achievements (
 user_id uuid not null references auth.users(id) on delete cascade,
 code text not null check (code ~ '^[a-z][a-z0-9_]{1,47}$'),
 earned_at timestamptz not null,
 created_at timestamptz not null default now(),
 primary key (user_id,code)
);
create index if not exists game_player_achievements_recent_idx
 on public.game_player_achievements (user_id,earned_at desc);
alter table public.game_player_achievements enable row level security;
revoke all on table public.game_player_achievements from anon,authenticated;
grant select on table public.game_player_achievements to authenticated;
drop policy if exists game_player_achievements_read_self on public.game_player_achievements;
create policy game_player_achievements_read_self on public.game_player_achievements
 for select to authenticated using ((select auth.uid())=user_id);
comment on table public.game_player_achievements is
 'Permanent server-awarded game badges, based only on completed verified UTC daily attempts; no browser award writes.';
