-- Migration applied to Supabase as version 20261031202332.
-- Aggregate anonymous section usage and search misses by UTC date only.
create table if not exists public.site_usage_daily (
 day date not null,
 metric text not null check (metric in ('page_view','search_miss')),
 section text not null check (section ~ '^[a-z_]{2,40}$'),
 total bigint not null default 0 check (total>=0),
 primary key (day,metric,section)
);
alter table public.site_usage_daily enable row level security;
revoke all on table public.site_usage_daily from public,anon,authenticated;
grant select,insert,update on table public.site_usage_daily to service_role;

create or replace function public.record_site_usage(p_metric text,p_section text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog,public
as $$
begin
 if not (
  (p_metric='page_view' and p_section in (
   'home','school','games','history','figures','atlas','statistics','rankings',
   'debates','works','magazine','universities','medical','products',
   'professionals','search','contribute','other'
  ))
  or
  (p_metric='search_miss' and p_section in (
   'all','works','debates','issues','indicators','figures','history',
   'companies','professionals','places','domains'
  ))
 ) then
  raise exception 'invalid analytics category' using errcode='22023';
 end if;
 insert into public.site_usage_daily as counters (day,metric,section,total)
 values ((current_timestamp at time zone 'UTC')::date,p_metric,p_section,1)
 on conflict (day,metric,section)
 do update set total=counters.total+1;
end;
$$;

revoke all on function public.record_site_usage(text,text) from public,anon,authenticated;
grant execute on function public.record_site_usage(text,text) to service_role;

comment on table public.site_usage_daily is 'Aggregate anonymous section/page-view and no-result search counters; UTC days only. No identifiers or query strings.';
comment on function public.record_site_usage(text,text) is 'Server-only atomic increment. Requires service_role. No viewer or search data is stored.';
