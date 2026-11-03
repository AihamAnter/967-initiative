-- Report-scoped moderation: stable reference number and audited transcript views.
-- Only management API may retrieve messages; SQL table permissions remain closed.
alter table public.private_message_reports
 add column report_number bigint generated always as identity;
create unique index private_message_reports_report_number_unique
 on public.private_message_reports(report_number);
create table public.private_message_report_views (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.private_message_reports(id) on delete cascade,
 viewer_id uuid not null,
 viewed_at timestamptz not null default now(),
 page_before timestamptz
);
create index private_message_report_views_report_time_idx
 on public.private_message_report_views(report_id,viewed_at desc);
alter table public.private_message_report_views enable row level security;
revoke all on public.private_message_report_views from public,anon,authenticated;
grant select,insert on public.private_message_report_views to service_role;
