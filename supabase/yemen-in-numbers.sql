-- Yemen in Numbers: national statistics observatory
-- Run this file once in Supabase SQL Editor after the base schema.

create extension if not exists pgcrypto;

create or replace function public.is_967_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.editors where user_id = auth.uid()
  );
$$;

revoke all on function public.is_967_editor() from public;
grant execute on function public.is_967_editor() to authenticated;

create table if not exists public.stat_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stat_domains (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.stat_sections(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stat_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  publisher text not null default '',
  url text check (url is null or url ~ '^https?://'),
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stat_indicators (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.stat_domains(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_description text not null default '',
  definition text not null default '',
  unit text not null,
  improvement_direction text not null default 'contextual'
    check (improvement_direction in ('increase', 'decrease', 'neutral', 'contextual')),
  measurement_method text not null default '',
  data_status text not null default 'partial'
    check (data_status in ('complete', 'partial', 'limited', 'discontinued')),
  chart_type text not null default 'line'
    check (chart_type in ('line', 'bar', 'area')),
  adopted_source_id uuid references public.stat_sources(id) on delete set null,
  is_published boolean not null default false,
  hide_when_incomplete boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stat_indicator_sources (
  indicator_id uuid not null references public.stat_indicators(id) on delete cascade,
  source_id uuid not null references public.stat_sources(id) on delete restrict,
  series_label text not null default '',
  methodology text not null default '',
  is_adopted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (indicator_id, source_id)
);

create unique index if not exists stat_indicator_one_adopted_source
  on public.stat_indicator_sources(indicator_id) where is_adopted;

create table if not exists public.stat_values (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.stat_indicators(id) on delete cascade,
  source_id uuid not null references public.stat_sources(id) on delete restrict,
  year integer not null check (year between 1990 and 2100),
  value numeric not null,
  document_url text check (document_url is null or document_url ~ '^https?://'),
  publication_date date,
  national_scope boolean not null default true check (national_scope = true),
  methodology_note text not null default '',
  value_status text not null default 'official'
    check (value_status in ('official', 'estimated')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (indicator_id, year, source_id)
);

create index if not exists stat_domains_section_order_idx
  on public.stat_domains(section_id, display_order);
create index if not exists stat_indicators_domain_idx
  on public.stat_indicators(domain_id, is_published);
create index if not exists stat_values_indicator_year_idx
  on public.stat_values(indicator_id, year);
create index if not exists stat_values_published_idx
  on public.stat_values(is_published, national_scope);

create or replace function public.touch_stats_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stat_sections_touch_updated_at on public.stat_sections;
create trigger stat_sections_touch_updated_at before update on public.stat_sections
for each row execute function public.touch_stats_updated_at();
drop trigger if exists stat_domains_touch_updated_at on public.stat_domains;
create trigger stat_domains_touch_updated_at before update on public.stat_domains
for each row execute function public.touch_stats_updated_at();
drop trigger if exists stat_sources_touch_updated_at on public.stat_sources;
create trigger stat_sources_touch_updated_at before update on public.stat_sources
for each row execute function public.touch_stats_updated_at();
drop trigger if exists stat_indicators_touch_updated_at on public.stat_indicators;
create trigger stat_indicators_touch_updated_at before update on public.stat_indicators
for each row execute function public.touch_stats_updated_at();
drop trigger if exists stat_values_touch_updated_at on public.stat_values;
create trigger stat_values_touch_updated_at before update on public.stat_values
for each row execute function public.touch_stats_updated_at();

alter table public.stat_sections enable row level security;
alter table public.stat_domains enable row level security;
alter table public.stat_sources enable row level security;
alter table public.stat_indicators enable row level security;
alter table public.stat_indicator_sources enable row level security;
alter table public.stat_values enable row level security;

-- Public policies never inspect the editors table.
drop policy if exists stat_sections_public_read on public.stat_sections;
create policy stat_sections_public_read on public.stat_sections
for select to anon, authenticated using (is_published);
drop policy if exists stat_domains_public_read on public.stat_domains;
create policy stat_domains_public_read on public.stat_domains
for select to anon, authenticated using (is_published);
drop policy if exists stat_sources_public_read on public.stat_sources;
create policy stat_sources_public_read on public.stat_sources
for select to anon, authenticated using (is_active);
drop policy if exists stat_indicators_public_read on public.stat_indicators;
create policy stat_indicators_public_read on public.stat_indicators
for select to anon, authenticated using (is_published and (not hide_when_incomplete or data_status = 'complete'));
drop policy if exists stat_indicator_sources_public_read on public.stat_indicator_sources;
create policy stat_indicator_sources_public_read on public.stat_indicator_sources
for select to anon, authenticated using (
  exists (select 1 from public.stat_indicators i where i.id = indicator_id and i.is_published)
);
drop policy if exists stat_values_public_read on public.stat_values;
create policy stat_values_public_read on public.stat_values
for select to anon, authenticated using (
  is_published and national_scope and exists (
    select 1 from public.stat_indicators i
    where i.id = indicator_id and i.is_published
      and (not i.hide_when_incomplete or i.data_status = 'complete')
  )
);

-- Editor policies are separate from anonymous/public reads.
drop policy if exists stat_sections_editor_all on public.stat_sections;
create policy stat_sections_editor_all on public.stat_sections
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());
drop policy if exists stat_domains_editor_all on public.stat_domains;
create policy stat_domains_editor_all on public.stat_domains
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());
drop policy if exists stat_sources_editor_all on public.stat_sources;
create policy stat_sources_editor_all on public.stat_sources
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());
drop policy if exists stat_indicators_editor_all on public.stat_indicators;
create policy stat_indicators_editor_all on public.stat_indicators
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());
drop policy if exists stat_indicator_sources_editor_all on public.stat_indicator_sources;
create policy stat_indicator_sources_editor_all on public.stat_indicator_sources
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());
drop policy if exists stat_values_editor_all on public.stat_values;
create policy stat_values_editor_all on public.stat_values
for all to authenticated using (public.is_967_editor()) with check (public.is_967_editor());

grant select on public.stat_sections, public.stat_domains, public.stat_sources,
  public.stat_indicators, public.stat_indicator_sources, public.stat_values to anon;
grant select, insert, update, delete on public.stat_sections, public.stat_domains,
  public.stat_sources, public.stat_indicators, public.stat_indicator_sources,
  public.stat_values to authenticated;

insert into public.stat_sections (slug, name, description, display_order, is_published) values
  ('economy-finance', 'الاقتصاد والمالية', 'مؤشرات الاقتصاد الكلي والأسعار والعمل والمالية العامة والتجارة والاستثمار.', 1, true),
  ('population-society', 'السكان والمجتمع', 'صورة وطنية عن السكان وخصائصهم الديموغرافية والاجتماعية وحركتهم.', 2, true),
  ('education-knowledge', 'التعليم والمعرفة', 'مؤشرات التعليم النظامي والمهني والبحث والمهارات المعرفية والرقمية.', 3, true),
  ('health-food', 'الصحة والغذاء', 'مؤشرات الصحة والخدمات والأمراض والتغذية والأمن الغذائي.', 4, true),
  ('infrastructure-services', 'البنية التحتية والخدمات', 'الوصول الوطني إلى الخدمات الأساسية وشبكات النقل والاتصال والسكن.', 5, true),
  ('production-resources', 'الإنتاج والموارد', 'الموارد والقطاعات الإنتاجية التي تشكل الاقتصاد الحقيقي في اليمن.', 6, true),
  ('environment-climate', 'البيئة والمناخ', 'المياه والمناخ والمخاطر الطبيعية والأنظمة البيئية في اليمن.', 7, true),
  ('war-humanitarian', 'الحرب والوضع الإنساني', 'آثار الحرب والاحتياجات الإنسانية والنزوح والمساعدات ومخاطر الألغام.', 8, true),
  ('state-institutions', 'الدولة والمؤسسات', 'مؤشرات الحوكمة وجودة المؤسسات والنزاهة والشفافية.', 9, true),
  ('culture-creativity', 'الثقافة والمجتمع والإبداع', 'الحياة الثقافية والإبداعية والرياضية والريادية في اليمن.', 10, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

with domain_seed(section_slug, slug, name, display_order) as (values
  ('economy-finance','gdp','الناتج المحلي الإجمالي',1),
  ('economy-finance','inflation-prices','التضخم والأسعار',2),
  ('economy-finance','labor-unemployment','سوق العمل والبطالة',3),
  ('economy-finance','poverty','الفقر',4),
  ('economy-finance','public-finance','المالية العامة',5),
  ('economy-finance','taxes-customs','الضرائب والجمارك',6),
  ('economy-finance','currency-monetary','العملة والسياسة النقدية',7),
  ('economy-finance','banking','القطاع المصرفي',8),
  ('economy-finance','foreign-trade','التجارة الخارجية',9),
  ('economy-finance','investment','الاستثمار',10),
  ('economy-finance','remittances','تحويلات المغتربين',11),
  ('economy-finance','public-debt','الدين العام',12),
  ('population-society','population','السكان',1),
  ('population-society','age-structure','التركيب العمري',2),
  ('population-society','births-deaths','المواليد والوفيات',3),
  ('population-society','family-marriage','الأسرة والزواج',4),
  ('population-society','women','المرأة',5),
  ('population-society','youth','الشباب',6),
  ('population-society','disability','الإعاقة',7),
  ('population-society','migration-diaspora','الهجرة والاغتراب',8),
  ('education-knowledge','schools','التعليم المدرسي',1),
  ('education-knowledge','literacy','محو الأمية',2),
  ('education-knowledge','higher-education','التعليم العالي',3),
  ('education-knowledge','vocational-education','التعليم الفني والمهني',4),
  ('education-knowledge','research','البحث العلمي',5),
  ('education-knowledge','digital-skills','المهارات الرقمية',6),
  ('health-food','public-health','الصحة العامة',1),
  ('health-food','hospitals-services','المستشفيات والخدمات الصحية',2),
  ('health-food','diseases-epidemics','الأمراض والأوبئة',3),
  ('health-food','maternal-child-health','صحة الأم والطفل',4),
  ('health-food','nutrition','التغذية',5),
  ('health-food','food-security','الأمن الغذائي',6),
  ('infrastructure-services','electricity','الكهرباء',1),
  ('infrastructure-services','household-water','مياه الأسر',2),
  ('infrastructure-services','sanitation','الصرف الصحي',3),
  ('infrastructure-services','internet-telecom','الإنترنت والاتصالات',4),
  ('infrastructure-services','roads-transport','الطرق والنقل',5),
  ('infrastructure-services','ports-airports','الموانئ والمطارات',6),
  ('infrastructure-services','housing','الإسكان',7),
  ('infrastructure-services','waste-cleanliness','النفايات والنظافة',8),
  ('production-resources','agriculture','الزراعة',1),
  ('production-resources','livestock','الثروة الحيوانية',2),
  ('production-resources','fisheries','الثروة السمكية',3),
  ('production-resources','qat','القات',4),
  ('production-resources','oil-gas','النفط والغاز',5),
  ('production-resources','mining','التعدين',6),
  ('production-resources','manufacturing','الصناعة التحويلية',7),
  ('production-resources','renewable-energy','الطاقة المتجددة',8),
  ('environment-climate','water-resources','الموارد المائية',1),
  ('environment-climate','climate','المناخ',2),
  ('environment-climate','desertification','التصحر',3),
  ('environment-climate','natural-disasters','الكوارث الطبيعية',4),
  ('environment-climate','biodiversity','التنوع الحيوي',5),
  ('war-humanitarian','war-impact','آثار الحرب',1),
  ('war-humanitarian','displacement-refugees','النزوح واللجوء',2),
  ('war-humanitarian','humanitarian-needs','الاحتياجات الإنسانية',3),
  ('war-humanitarian','international-aid','المساعدات الدولية',4),
  ('war-humanitarian','mines-erw','الألغام ومخلفات الحرب',5),
  ('state-institutions','governance','الحوكمة',1),
  ('state-institutions','corruption-transparency','الفساد والشفافية',2),
  ('culture-creativity','tourism-heritage','السياحة والتراث',1),
  ('culture-creativity','sports','الرياضة',2),
  ('culture-creativity','culture-media','الثقافة والإعلام',3),
  ('culture-creativity','entrepreneurship-tech','ريادة الأعمال والتقنية',4)
)
insert into public.stat_domains (section_id, slug, name, description, display_order, is_published)
select s.id, d.slug, d.name, 'مؤشرات وطنية موثقة حول ' || d.name || '.', d.display_order, true
from domain_seed d
join public.stat_sections s on s.slug = d.section_slug
on conflict (slug) do update set
  section_id = excluded.section_id,
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

-- This migration intentionally inserts no indicators and no numeric values.
