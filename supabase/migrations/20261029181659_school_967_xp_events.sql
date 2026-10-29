
-- Phase 2: immutable, private and idempotent learning XP for verified first
-- passes. The client cannot write this ledger. Existing passes are backfilled.
create table if not exists public.school_xp_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 course_slug text not null check (course_slug in ('musnad','arud')),
 stage_index integer not null check (stage_index between 0 and 11),
 source_attempt_id uuid not null references public.school_stage_attempts(id) on delete cascade,
 xp_amount integer not null default 100 check (xp_amount=100),
 earned_at timestamptz not null default now(),
 unique (user_id,course_slug,stage_index),
 unique (source_attempt_id)
);
create index if not exists school_xp_events_user_earned on public.school_xp_events(user_id,earned_at desc);
alter table public.school_xp_events enable row level security;
revoke all on table public.school_xp_events from public, anon, authenticated, service_role;
grant select on table public.school_xp_events to service_role;
-- Functions run as database owner and use only fully qualified references.
create or replace function public.school_award_first_pass_xp()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
 if OLD.status = 'active' and NEW.status = 'passed'
    and NEW.score between 5 and 6
    and NEW.submission is not null and NEW.submitted_at is not null
    and NEW.user_id = OLD.user_id and NEW.course_slug = OLD.course_slug
    and NEW.stage_index = OLD.stage_index
    and NEW.course_slug in ('musnad','arud') then
  insert into public.school_xp_events
   (user_id,course_slug,stage_index,source_attempt_id,xp_amount,earned_at)
  values (NEW.user_id,NEW.course_slug,NEW.stage_index,NEW.id,100,NEW.submitted_at)
  on conflict (user_id,course_slug,stage_index) do nothing;
 end if;
 return NEW;
end;
$function$;
revoke all on function public.school_award_first_pass_xp() from public, anon, authenticated, service_role;
drop trigger if exists school_award_first_pass_xp_trigger on public.school_stage_attempts;
create trigger school_award_first_pass_xp_trigger
 after update of status on public.school_stage_attempts
 for each row execute function public.school_award_first_pass_xp();
-- Historic successful attempts earn the same 100 XP, exactly once.
insert into public.school_xp_events
 (user_id,course_slug,stage_index,source_attempt_id,xp_amount,earned_at)
select first_pass.user_id,first_pass.course_slug,first_pass.stage_index,
       first_pass.id,100,coalesce(first_pass.submitted_at,first_pass.created_at)
from (
 select distinct on (user_id,course_slug,stage_index)
        id,user_id,course_slug,stage_index,submitted_at,created_at
 from public.school_stage_attempts
 where status='passed' and score between 5 and 6
   and submission is not null
   and course_slug in ('musnad','arud')
 order by user_id,course_slug,stage_index,submitted_at asc nulls last,created_at asc,id asc
) as first_pass
on conflict (user_id,course_slug,stage_index) do nothing;
comment on table public.school_xp_events is
 'One server-verified 100 XP credit per completed course stage; service-role read-only, database-trigger writes.';
