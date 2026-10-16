-- Proposal / setup script ONLY. Not applied by the implementation task.
-- Requires schema.sql and admin-roles.sql. Review/test in an isolated project.
-- Does not seed, modify, or delete existing editorial content or user roles.
begin;

create table if not exists public.ranking_indicators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 160),
  category text not null check (length(category) between 1 and 50),
  unit text not null check (length(unit) between 1 and 120),
  code text not null check (length(code) between 2 and 80 and code ~ '^[A-Z0-9][A-Z0-9_.]+$'),
  direction text not null default 'desc' check (direction in ('asc', 'desc')),
  better text not null default 'contextual' check (better in ('higher', 'lower', 'contextual')),
  description text not null default '' check (length(description) <= 3000),
  display_order integer not null default 0 check (display_order between 0 and 10000),
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.ranking_snapshots (
  indicator_id uuid primary key references public.ranking_indicators(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload @> '{"version":1}'::jsonb),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  updated_at timestamptz not null default now()
);
create index if not exists ranking_indicators_public_order_idx on public.ranking_indicators(is_published, display_order, id);

create or replace function public.is_ranking_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.editors where user_id = (select auth.uid()) and role in ('admin', 'management'));
$$;
revoke all on function public.is_ranking_editor() from public;
grant execute on function public.is_ranking_editor() to authenticated;

create or replace function public.touch_ranking_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
revoke all on function public.touch_ranking_updated_at() from public;
drop trigger if exists ranking_indicator_updated_at on public.ranking_indicators;
create trigger ranking_indicator_updated_at before update on public.ranking_indicators
  for each row execute function public.touch_ranking_updated_at();
drop trigger if exists ranking_snapshot_updated_at on public.ranking_snapshots;
create trigger ranking_snapshot_updated_at before update on public.ranking_snapshots
  for each row execute function public.touch_ranking_updated_at();

revoke all on public.ranking_indicators, public.ranking_snapshots from anon, authenticated;
grant select on public.ranking_indicators, public.ranking_snapshots to anon, authenticated;
grant all on public.ranking_indicators, public.ranking_snapshots to service_role;
alter table public.ranking_indicators enable row level security;
alter table public.ranking_snapshots enable row level security;

drop policy if exists ranking_indicators_public_read on public.ranking_indicators;
create policy ranking_indicators_public_read on public.ranking_indicators
  for select to anon, authenticated using (is_published);
drop policy if exists ranking_indicators_editor_read on public.ranking_indicators;
create policy ranking_indicators_editor_read on public.ranking_indicators
  for select to authenticated using (public.is_ranking_editor());
drop policy if exists ranking_snapshots_public_read on public.ranking_snapshots;
create policy ranking_snapshots_public_read on public.ranking_snapshots
  for select to anon, authenticated using (
    exists(select 1 from public.ranking_indicators i where i.id = indicator_id and i.is_published)
  );
drop policy if exists ranking_snapshots_editor_read on public.ranking_snapshots;
create policy ranking_snapshots_editor_read on public.ranking_snapshots
  for select to authenticated using (public.is_ranking_editor());

-- No authenticated INSERT/UPDATE/DELETE policies or grants. Server API verifies
-- the bearer user against editors before using the server-only service key.
commit;
