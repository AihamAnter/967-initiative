-- Expand official 967 rotation to five additional games without changing daily uniqueness or RLS.
alter table public.game_daily_attempts
 drop constraint if exists game_daily_attempts_game_type_check;
alter table public.game_daily_attempts
 add constraint game_daily_attempts_game_type_check
 check (game_type in ('quiz','place','timeline','map','who','bigger','connect','yemenword','object'));
comment on table public.game_daily_attempts is
 'One server-verified official challenge per authenticated user per UTC day across nine games; scores are server-calculated and answer keys private.';
