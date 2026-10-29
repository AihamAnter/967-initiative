-- Phase 4: opt-in aliases and trustworthy ranked XP, never public user IDs.
create table if not exists public.school_leaderboard_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 opted_in boolean not null default false,
 nickname text,
 updated_at timestamptz not null default now(),
 constraint school_leaderboard_nickname_shape check (
  nickname is null or (
   char_length(btrim(nickname)) between 2 and 24 and nickname=btrim(nickname)
  )
 ),
 constraint school_leaderboard_optin_has_name check (
  not opted_in or nickname is not null
 )
);
create unique index if not exists school_leaderboard_nickname_unique
 on public.school_leaderboard_preferences(lower(nickname)) where opted_in;
alter table public.school_leaderboard_preferences enable row level security;
revoke all on table public.school_leaderboard_preferences from public,anon,authenticated,service_role;
grant select,insert,update on table public.school_leaderboard_preferences to service_role;
create index if not exists school_xp_earned_at_user on public.school_xp_events(earned_at,user_id);
-- SECURITY INVOKER: the database enforces the service-role-only table GRANTs.
-- Returns only the public alias and aggregate scores; never UUID or email.
create or replace function public.school_leaderboard_top(p_period text)
returns table(place bigint,nickname text,points bigint,stages bigint)
language sql stable security invoker set search_path=''
as $function$
 with bounds as (
  select case when p_period='week'
   then date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'
   when p_period='month'
   then date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'
   else null::timestamptz end as beginning
 ), scores as (
  select p.nickname,sum(x.xp_amount)::bigint as points,count(x.id)::bigint as stages
  from public.school_leaderboard_preferences p
  join public.school_xp_events x on x.user_id=p.user_id
  cross join bounds b
  where p.opted_in=true and x.earned_at>=b.beginning and x.earned_at<now()
    and x.xp_amount=100
  group by p.user_id,p.nickname
 ), ranked as (
  select dense_rank() over(order by points desc)::bigint as place,
   nickname,points,stages from scores where points>0
 )
 select r.place,r.nickname,r.points,r.stages
 from ranked r order by r.place,r.nickname limit 50;
$function$;
revoke all on function public.school_leaderboard_top(text) from public,anon,authenticated,service_role;
grant execute on function public.school_leaderboard_top(text) to service_role;
comment on table public.school_leaderboard_preferences is 'Opt-in public nickname for School 967 competitions; only server-side accounts can read and update.';
comment on function public.school_leaderboard_top(text) is 'Weekly/monthly UTC verified-XP leaderboard; returns aliases and aggregates for opted-in learners only.';
