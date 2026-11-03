-- Separate user account abuse reports from conversation/message reports.
create table public.member_profile_reports (
 id uuid primary key default gen_random_uuid(),
 report_number bigint generated always as identity unique,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reported_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in ('harassment','spam','fraud','impersonation','inappropriate','other')),
 detail text not null check(char_length(trim(detail)) between 10 and 1000),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 constraint member_report_no_self check(reporter_id<>reported_id)
);
create unique index member_profile_reports_one_open_per_pair
 on public.member_profile_reports(reporter_id,reported_id) where status='open';
create index member_profile_reports_status_created
 on public.member_profile_reports(status,created_at desc);
create index member_profile_reports_reporter_created
 on public.member_profile_reports(reporter_id,created_at desc);
alter table public.member_profile_reports enable row level security;
revoke all on public.member_profile_reports from public,anon,authenticated;
grant select,insert,update on public.member_profile_reports to service_role;

create or replace function public.member_report_rate_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('member-report:'||new.reporter_id::text,1));
 if (select count(*) from public.member_profile_reports r
   where r.reporter_id=new.reporter_id and r.created_at>=now()-interval '24 hours')>=3 then
  raise exception 'MEMBER_REPORT_LIMIT' using errcode='22023';
 end if;
 return new;
end $$;
revoke all on function public.member_report_rate_guard() from public,anon,authenticated;
create trigger member_profile_report_rate_guard before insert on public.member_profile_reports
 for each row execute function public.member_report_rate_guard();