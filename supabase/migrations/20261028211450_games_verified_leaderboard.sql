-- Official score and answer snapshots are server-owned.
alter table public.game_daily_attempts
 add column if not exists question_bank jsonb not null default '[]'::jsonb,
 add column if not exists answers jsonb not null default '[]'::jsonb,
 add column if not exists step_index smallint not null default 0,
 add column if not exists phase text not null default 'question',
 add column if not exists question_started_at timestamptz,
 add column if not exists score_raw integer not null default 0,
 add column if not exists score integer not null default 0,
 add column if not exists correct_count smallint not null default 0,
 add column if not exists finished_at timestamptz;
alter table public.game_daily_attempts
 add constraint game_daily_attempts_phase_check check (phase in ('question','review','finished')),
 add constraint game_daily_attempts_step_check check (step_index between 0 and 9),
 add constraint game_daily_attempts_score_check check (score between 0 and 1000 and score_raw >= 0 and correct_count between 0 and 10);
revoke all on table public.game_daily_attempts from anon,authenticated;
grant select (id,user_id,challenge_date,game_type,started_at) on public.game_daily_attempts to authenticated;
create index if not exists game_daily_attempts_ranked_idx
 on public.game_daily_attempts (challenge_date desc, score desc)
 where phase = 'finished';
comment on column public.game_daily_attempts.score is 'Server-calculated verified score 0..1000; never trust client-submitted scores.';
