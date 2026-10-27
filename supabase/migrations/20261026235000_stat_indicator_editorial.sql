-- Yemen in Numbers editorial enrichment. Apply to a disposable test database before production.
-- The published metrics and adopted numeric series are not modified by this migration.
create table public.stat_indicator_editorial (
  indicator_id uuid primary key references public.stat_indicators(id) on delete cascade,
  intro text not null default '',
  why_it_matters text not null default '',
  historical_context text not null default '',
  limitations text not null default '',
  source_notes text not null default '',
  reference_links jsonb not null default '[]'::jsonb,
  reviewed_on date,
  is_published boolean not null default false,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint stat_editorial_reference_array check (jsonb_typeof(reference_links) = 'array'),
  constraint stat_editorial_text_limits check (
    char_length(intro) <= 1600
    and char_length(why_it_matters) <= 4000
    and char_length(historical_context) <= 5000
    and char_length(limitations) <= 4000
    and char_length(source_notes) <= 3000
  ),
  constraint stat_editorial_revision_positive check (revision > 0),
  constraint stat_editorial_published_summary check (not is_published or (length(trim(intro)) >= 40 and length(trim(limitations)) >= 30)),
  constraint stat_editorial_references_limit check (jsonb_array_length(reference_links) <= 10)
);

alter table public.stat_indicator_editorial enable row level security;

-- Public readers get reviewed content for already published indicators only.
create policy stat_editorial_public_read on public.stat_indicator_editorial
for select to anon, authenticated
using (
  is_published
  and exists (
    select 1 from public.stat_indicators i
    where i.id = indicator_id
      and i.is_published = true
      and (i.hide_when_incomplete = false or i.data_status = 'complete')
  )
);

-- Confirmed 967 editors can read drafts, not just published text.
create policy stat_editorial_editor_read on public.stat_indicator_editorial
for select to authenticated
using (public.editorial_can_read());

-- No direct public writes; saving is only through the guarded RPC below.
revoke all on public.stat_indicator_editorial from public, anon, authenticated;
grant select on public.stat_indicator_editorial to anon, authenticated;

create or replace function public.editorial_stat_indicator_enrichment_save(
  p_indicator_id uuid, p_revision bigint, p_data jsonb
) returns public.stat_indicator_editorial
language plpgsql security definer set search_path to ''
as $fn$
declare
  item public.stat_indicator_editorial;
  refs jsonb;
begin
  if auth.uid() is null or not public.editorial_can_read() then
    raise exception 'Confirmed editor required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.stat_indicators i where i.id = p_indicator_id) then
    raise exception 'Indicator not found' using errcode = 'P0002';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(p_data) as key
       where key <> all(array['intro','why_it_matters','historical_context','limitations','source_notes','reference_links','reviewed_on','is_published'])
     ) then
    raise exception 'Invalid editorial payload' using errcode = '22023';
  end if;
  if jsonb_typeof(p_data->'is_published') is distinct from 'boolean'
     or jsonb_typeof(coalesce(p_data->'reference_links','[]'::jsonb)) <> 'array' then
    raise exception 'Invalid publication state or references' using errcode = '22023';
  end if;
  refs := coalesce(p_data->'reference_links','[]'::jsonb);
  if jsonb_array_length(refs)>10
    or exists (
      select 1 from jsonb_array_elements(refs) as ref(value)
      where jsonb_typeof(ref.value) <> 'object'
         or jsonb_typeof(ref.value->'title') is distinct from 'string'
         or jsonb_typeof(ref.value->'url') is distinct from 'string'
         or length(trim(ref.value->>'title')) not between 2 and 160
         or length(ref.value->>'url') > 1500
         or (ref.value->>'url') !~* '^https?://[^[:space:]@/]+(/[^[:space:]]*)?$'
    ) then
    raise exception 'Invalid reference links' using errcode = '22023';
  end if;
  if length(coalesce(p_data->>'intro',''))>1600
     or length(coalesce(p_data->>'why_it_matters',''))>4000
     or length(coalesce(p_data->>'historical_context',''))>5000
     or length(coalesce(p_data->>'limitations',''))>4000
     or length(coalesce(p_data->>'source_notes',''))>3000 then
    raise exception 'Editorial text too long' using errcode = '22023';
  end if;
  if (p_data->>'is_published')::boolean
     and (length(trim(coalesce(p_data->>'intro','')))<40
          or length(trim(coalesce(p_data->>'limitations','')))<30
          or jsonb_array_length(refs)=0
          or nullif(p_data->>'reviewed_on','') is null) then
    raise exception 'Complete explanation, limitations, references and review date before publishing' using errcode = '22023';
  end if;

  -- New records require null revision; existing records require exact CAS revision.
  if p_revision is null then
    insert into public.stat_indicator_editorial
      (indicator_id,intro,why_it_matters,historical_context,limitations,source_notes,
       reference_links,reviewed_on,is_published,updated_by)
    values (p_indicator_id,coalesce(p_data->>'intro',''),coalesce(p_data->>'why_it_matters',''),
      coalesce(p_data->>'historical_context',''),coalesce(p_data->>'limitations',''),
      coalesce(p_data->>'source_notes',''),refs,nullif(p_data->>'reviewed_on','')::date,
      (p_data->>'is_published')::boolean,auth.uid())
    on conflict (indicator_id) do nothing returning * into item;
  else
    update public.stat_indicator_editorial
    set intro=coalesce(p_data->>'intro',''),
        why_it_matters=coalesce(p_data->>'why_it_matters',''),
        historical_context=coalesce(p_data->>'historical_context',''),
        limitations=coalesce(p_data->>'limitations',''),
        source_notes=coalesce(p_data->>'source_notes',''),
        reference_links=refs,
        reviewed_on=nullif(p_data->>'reviewed_on','')::date,
        is_published=(p_data->>'is_published')::boolean,
        revision=revision+1,
        updated_at=now(),
        updated_by=auth.uid()
    where indicator_id=p_indicator_id and revision=p_revision
    returning * into item;
  end if;
  if item.indicator_id is null then
    raise exception 'Stale editorial revision' using errcode = '40001';
  end if;
  return item;
end;
$fn$;

revoke all on function public.editorial_stat_indicator_enrichment_save(uuid,bigint,jsonb) from public, anon;
grant execute on function public.editorial_stat_indicator_enrichment_save(uuid,bigint,jsonb) to authenticated;
comment on table public.stat_indicator_editorial is 'Editorial explainers are separate from published statistical measurements; publication is opt-in.';
