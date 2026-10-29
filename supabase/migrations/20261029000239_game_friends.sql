-- Only the trusted server (service role) may read challenge snapshots or write answers.
-- Invite URLs are unguessable UUIDs but they DO NOT grant direct database access.
create table if not exists public.game_friend_challenges (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete cascade,
 game_type text not null check (game_type in ('quiz','place','timeline','map','who','bigger','connect','yemenword','object')),
 seconds smallint not null check (seconds in (10,15,20,30)),
 question_bank jsonb not null check (jsonb_typeof(question_bank)='array' and jsonb_array_length(question_bank)=10),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '7 days'),
 check (expires_at>created_at)
);
create index if not exists game_friend_challenges_creator_idx
 on public.game_friend_challenges(created_by,created_at desc);
create table if not exists public.game_friend_players (
 id uuid primary key default gen_random_uuid(),
 challenge_id uuid not null references public.game_friend_challenges(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null check (slot between 1 and 2),
 phase text not null default 'question' check (phase in ('question','review','finished')),
 step_index smallint not null default 0 check (step_index between 0 and 9),
 question_started_at timestamptz,
 answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=10),
 score smallint not null default 0 check (score between 0 and 1000),
 correct_count smallint not null default 0 check (correct_count between 0 and 10),
 joined_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(challenge_id,user_id),
 unique(challenge_id,slot)
);
create index if not exists game_friend_players_user_idx on public.game_friend_players(user_id,joined_at desc);
alter table public.game_friend_challenges enable row level security;
alter table public.game_friend_players enable row level security;
revoke all on public.game_friend_challenges from anon,authenticated;
revoke all on public.game_friend_players from anon,authenticated;
comment on table public.game_friend_challenges is 'Private two-player invitation challenges: answer keys must only be read by trusted server routes.';
comment on table public.game_friend_players is 'One immutable match attempt per user, scored by the server; never counted in official daily leaderboard.';
