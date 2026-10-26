-- REVIEW ONLY. Apply to an isolated Supabase project and run the directory tests first.
-- This migration is additive: it does not alter or delete existing product, professional,
-- debate, account, comment, statistics, map, magazine, or contribution data.
begin;

create table public.universities (
 id uuid primary key default gen_random_uuid(),
 stable_key text not null unique check (length(btrim(stable_key)) between 3 and 220),
 slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 name_ar text not null check (length(btrim(name_ar)) between 2 and 240),
 name_en text,
 institution_type text not null check (institution_type in ('university','community_college','independent_college','higher_institute','technical_institute','vocational_institute','specialized_institution')),
 ownership text not null check (ownership in ('government','private','community','civil','other')),
 founded_year integer check (founded_year is null or founded_year between 1800 and 2200),
 summary text not null default '',
 governorate text, city text, district text, address text,
 latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
 longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
 map_url text check (map_url is null or map_url ~* '^https?://'),
 logo_url text check (logo_url is null or logo_url ~* '^https?://'),
 website text check (website is null or website ~* '^https?://'),
 phone text, email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
 social_links jsonb not null default '[]' check (jsonb_typeof(social_links)='array'),
 admission_info text not null default '', tuition_info text not null default '', tuition_as_of date,
 registration_url text check (registration_url is null or registration_url ~* '^https?://'),
 languages text[] not null default '{}', study_modes text[] not null default '{}', education_levels text[] not null default '{}',
 accreditation_status text not null default 'not_asserted' check (accreditation_status in ('verified','not_asserted','needs_review')),
 accrediting_body text not null default '',
 operating_status text not null default 'unknown' check (operating_status in ('operating','temporarily_closed','closed','listed_for_admission','unknown')),
 verification_status text not null default 'incomplete' check (verification_status in ('verified','needs_review','incomplete')),
 verified_at date,
 is_published boolean not null default false,
 revision bigint not null default 1 check (revision > 0),
 deleted_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);

create table public.university_programs (
 id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id) on delete cascade,
 faculty text not null default '', department text not null default '', name text not null,
 field text not null default '', qualification text not null default '', language text not null default '', study_mode text not null default '',
 source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0,
 unique(university_id,name,qualification,study_mode)
);
create table public.university_branches (
 id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id) on delete cascade,
 name text not null, governorate text, city text, district text, address text,
 latitude numeric(9,6), longitude numeric(9,6), map_url text check (map_url is null or map_url ~* '^https?://'),
 phone text, source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0
);
create table public.university_sources (
 id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id) on delete cascade,
 title text not null, url text not null check (url ~* '^https?://'), publisher text not null default '',
 source_type text not null default 'official_directory' check (source_type in ('official_site','government','official_directory','institutional','independent','independent_directory')),
 checked_at date not null, note text not null default '', unique(university_id,url)
);

create table public.medical_centers (
 id uuid primary key default gen_random_uuid(),
 stable_key text not null unique check (length(btrim(stable_key)) between 3 and 220),
 official_code text unique,
 slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
 name_ar text not null check (length(btrim(name_ar)) between 2 and 240), name_en text,
 institution_type text not null check (institution_type in ('hospital','referral_hospital','specialized_hospital','medical_center','health_center','health_unit','medical_complex','specialized_clinic','laboratory','diagnostic_center','dental_center','eye_center','other')),
 ownership text not null check (ownership in ('government','private','community','civil','other')), operator_name text not null default '', summary text not null default '',
 governorate text, city text, district text, address text,
 latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
 longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
 map_url text check (map_url is null or map_url ~* '^https?://'), logo_url text check (logo_url is null or logo_url ~* '^https?://'),
 website text check (website is null or website ~* '^https?://'), phone text, emergency_phone text,
 email text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
 social_links jsonb not null default '[]' check (jsonb_typeof(social_links)='array'), booking_url text check (booking_url is null or booking_url ~* '^https?://'),
 emergency_available boolean,
 operating_status text not null default 'unknown' check (operating_status in ('fully_operational','partially_operational','not_operational','unknown')),
 operating_status_as_of date,
 verification_status text not null default 'incomplete' check (verification_status in ('verified','needs_review','incomplete')), verified_at date,
 facility_presence text not null default '', care_level text not null default '', access_status text not null default '', building_status text not null default '', equipment_status text not null default '',
 is_published boolean not null default false,
 revision bigint not null default 1 check (revision > 0), deleted_at timestamptz,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);

create table public.medical_center_specialties (
 id uuid primary key default gen_random_uuid(), medical_center_id uuid not null references public.medical_centers(id) on delete cascade,
 name text not null, source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0,
 unique(medical_center_id,name)
);
create table public.medical_center_services (
 id uuid primary key default gen_random_uuid(), medical_center_id uuid not null references public.medical_centers(id) on delete cascade,
 name text not null, details text not null default '', source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0,
 unique(medical_center_id,name)
);
create table public.medical_center_hours (
 id uuid primary key default gen_random_uuid(), medical_center_id uuid not null references public.medical_centers(id) on delete cascade,
 label text not null, hours_text text not null, source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0,
 unique(medical_center_id,label)
);
create table public.medical_center_branches (
 id uuid primary key default gen_random_uuid(), medical_center_id uuid not null references public.medical_centers(id) on delete cascade,
 name text not null, governorate text, city text, district text, address text, latitude numeric(9,6), longitude numeric(9,6),
 map_url text check (map_url is null or map_url ~* '^https?://'), phone text, source_url text check (source_url is null or source_url ~* '^https?://'), display_order integer not null default 0
);
create table public.medical_center_sources (
 id uuid primary key default gen_random_uuid(), medical_center_id uuid not null references public.medical_centers(id) on delete cascade,
 title text not null, url text not null check (url ~* '^https?://'), publisher text not null default '',
 source_type text not null default 'official_directory' check (source_type in ('official_site','government','official_directory','institutional','independent','independent_directory')),
 checked_at date not null, note text not null default '', unique(medical_center_id,url)
);

create index universities_public_list on public.universities(is_published,deleted_at,governorate,name_ar);
create index medical_centers_public_list on public.medical_centers(is_published,deleted_at,governorate,name_ar);
create index university_programs_parent on public.university_programs(university_id,display_order);
create index university_branches_parent on public.university_branches(university_id,display_order);
create unique index university_branches_identity on public.university_branches(university_id,name,coalesce(city,''));
create index university_sources_parent on public.university_sources(university_id,checked_at desc);
create index medical_specialties_parent on public.medical_center_specialties(medical_center_id,display_order);
create index medical_services_parent on public.medical_center_services(medical_center_id,display_order);
create index medical_hours_parent on public.medical_center_hours(medical_center_id,display_order);
create index medical_branches_parent on public.medical_center_branches(medical_center_id,display_order);
create unique index medical_branches_identity on public.medical_center_branches(medical_center_id,name,coalesce(city,''));
create index medical_sources_parent on public.medical_center_sources(medical_center_id,checked_at desc);

create function public.directory_touch_revision() returns trigger language plpgsql set search_path='' as $$
begin
 new.revision:=old.revision+1;
 new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 millisecond');
 return new;
end;
$$;
create trigger universities_revision before update on public.universities for each row execute function public.directory_touch_revision();
create trigger medical_centers_revision before update on public.medical_centers for each row execute function public.directory_touch_revision();

-- Public users only see published, non-deleted parents and their children.
do $$ declare t text; begin foreach t in array array['universities','university_programs','university_branches','university_sources','medical_centers','medical_center_specialties','medical_center_services','medical_center_hours','medical_center_branches','medical_center_sources'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to anon,authenticated,service_role',t);
end loop; end $$;
create policy universities_public_read on public.universities for select using(is_published and deleted_at is null or public.is_editor());
create policy medical_centers_public_read on public.medical_centers for select using(is_published and deleted_at is null or public.is_editor());
create policy university_programs_public_read on public.university_programs for select using(exists(select 1 from public.universities p where p.id=university_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy university_branches_public_read on public.university_branches for select using(exists(select 1 from public.universities p where p.id=university_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy university_sources_public_read on public.university_sources for select using(exists(select 1 from public.universities p where p.id=university_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy medical_specialties_public_read on public.medical_center_specialties for select using(exists(select 1 from public.medical_centers p where p.id=medical_center_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy medical_services_public_read on public.medical_center_services for select using(exists(select 1 from public.medical_centers p where p.id=medical_center_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy medical_hours_public_read on public.medical_center_hours for select using(exists(select 1 from public.medical_centers p where p.id=medical_center_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy medical_branches_public_read on public.medical_center_branches for select using(exists(select 1 from public.medical_centers p where p.id=medical_center_id and (p.is_published and p.deleted_at is null or public.is_editor())));
create policy medical_sources_public_read on public.medical_center_sources for select using(exists(select 1 from public.medical_centers p where p.id=medical_center_id and (p.is_published and p.deleted_at is null or public.is_editor())));

create function public.directory_assert_writer() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' and not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role in ('admin','management') and u.email_confirmed_at is not null and (nullif(to_jsonb(u)->>'banned_until','') is null or (to_jsonb(u)->>'banned_until')::timestamptz<=now())) then
  raise exception 'Verified editor required' using errcode='42501';
 end if;
end;
$$;
revoke all on function public.directory_assert_writer() from public,anon,authenticated,service_role;

create function public.directory_save_university(p_id uuid,p_revision bigint,p_record jsonb,p_programs jsonb default '[]',p_branches jsonb default '[]',p_sources jsonb default '[]',p_origin text default 'admin:directory') returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.universities; original public.universities; before_bundle jsonb; after_bundle jsonb;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_programs)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'])) then raise exception 'Protected university field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),80) else 'admin:directory' end,true);
 perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new university' using errcode='22023';end if;
  insert into public.universities(stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,social_links,admission_info,tuition_info,tuition_as_of,registration_url,languages,study_modes,education_levels,accreditation_status,accrediting_body,operating_status,verification_status,verified_at,is_published)
  select stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,coalesce(social_links,'[]'),coalesce(admission_info,''),coalesce(tuition_info,''),tuition_as_of,registration_url,coalesce(languages,'{}'),coalesce(study_modes,'{}'),coalesce(education_levels,'{}'),coalesce(accreditation_status,'not_asserted'),coalesce(accrediting_body,''),coalesce(operating_status,'unknown'),coalesce(verification_status,'incomplete'),verified_at,coalesce(is_published,false) from jsonb_populate_record(null::public.universities,p_record) returning * into saved;
 else
  select * into original from public.universities where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale university revision' using errcode='40001';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object(
   'programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=original.id),'[]'),
   'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=original.id),'[]'),
   'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=original.id),'[]'));
  update public.universities u set stable_key=x.stable_key,slug=x.slug,name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,founded_year=x.founded_year,summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,email=x.email,social_links=coalesce(x.social_links,'[]'),admission_info=coalesce(x.admission_info,''),tuition_info=coalesce(x.tuition_info,''),tuition_as_of=x.tuition_as_of,registration_url=x.registration_url,languages=coalesce(x.languages,'{}'),study_modes=coalesce(x.study_modes,'{}'),education_levels=coalesce(x.education_levels,'{}'),accreditation_status=coalesce(x.accreditation_status,'not_asserted'),accrediting_body=coalesce(x.accrediting_body,''),operating_status=coalesce(x.operating_status,'unknown'),verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.universities,p_record) x where u.id=p_id returning u.* into saved;
 end if;
 delete from public.university_programs where university_id=saved.id;
 insert into public.university_programs(university_id,faculty,department,name,field,qualification,language,study_mode,source_url,display_order) select saved.id,coalesce(x.faculty,''),coalesce(x.department,''),x.name,coalesce(x.field,''),coalesce(x.qualification,''),coalesce(x.language,''),coalesce(x.study_mode,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_programs) x(faculty text,department text,name text,field text,qualification text,language text,study_mode text,source_url text,display_order int);
 delete from public.university_branches where university_id=saved.id;
 insert into public.university_branches(university_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.university_sources where university_id=saved.id;
 insert into public.university_sources(university_id,title,url,publisher,source_type,checked_at,note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,'') from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text);
 select * into saved from public.universities where id=saved.id;
 if saved.is_published and not exists(select 1 from public.university_sources where university_id=saved.id) then raise exception 'Published university requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object(
  'programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=saved.id),'[]'),
  'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=saved.id),'[]'),
  'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);
 perform public.editorial_emit('university','universities',saved.id::text,before_bundle,after_bundle,'/universities/'||saved.slug);
 return to_jsonb(saved);
end;
$$;

create function public.directory_save_medical_center(p_id uuid,p_revision bigint,p_record jsonb,p_specialties jsonb default '[]',p_services jsonb default '[]',p_hours jsonb default '[]',p_branches jsonb default '[]',p_sources jsonb default '[]',p_origin text default 'admin:directory') returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.medical_centers; original public.medical_centers; before_bundle jsonb; after_bundle jsonb;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_specialties)<>'array' or jsonb_typeof(p_services)<>'array' or jsonb_typeof(p_hours)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'])) then raise exception 'Protected medical-center field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),80) else 'admin:directory' end,true);
 perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new medical center' using errcode='22023';end if;
  insert into public.medical_centers(stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,operator_name,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,social_links,booking_url,emergency_available,operating_status,operating_status_as_of,verification_status,verified_at,facility_presence,care_level,access_status,building_status,equipment_status,is_published)
  select stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,coalesce(operator_name,''),coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,coalesce(social_links,'[]'),booking_url,emergency_available,coalesce(operating_status,'unknown'),operating_status_as_of,coalesce(verification_status,'incomplete'),verified_at,coalesce(facility_presence,''),coalesce(care_level,''),coalesce(access_status,''),coalesce(building_status,''),coalesce(equipment_status,''),coalesce(is_published,false) from jsonb_populate_record(null::public.medical_centers,p_record) returning * into saved;
 else
  select * into original from public.medical_centers where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale medical-center revision' using errcode='40001';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object(
   'specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=original.id),'[]'),
   'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=original.id),'[]'),
   'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=original.id),'[]'),
   'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=original.id),'[]'),
   'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=original.id),'[]'));
  update public.medical_centers m set stable_key=x.stable_key,official_code=x.official_code,slug=x.slug,name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,operator_name=coalesce(x.operator_name,''),summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,emergency_phone=x.emergency_phone,email=x.email,social_links=coalesce(x.social_links,'[]'),booking_url=x.booking_url,emergency_available=x.emergency_available,operating_status=coalesce(x.operating_status,'unknown'),operating_status_as_of=x.operating_status_as_of,verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,facility_presence=coalesce(x.facility_presence,''),care_level=coalesce(x.care_level,''),access_status=coalesce(x.access_status,''),building_status=coalesce(x.building_status,''),equipment_status=coalesce(x.equipment_status,''),is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.medical_centers,p_record) x where m.id=p_id returning m.* into saved;
 end if;
 delete from public.medical_center_specialties where medical_center_id=saved.id;
 insert into public.medical_center_specialties(medical_center_id,name,source_url,display_order) select saved.id,x.name,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_specialties) x(name text,source_url text,display_order int);
 delete from public.medical_center_services where medical_center_id=saved.id;
 insert into public.medical_center_services(medical_center_id,name,details,source_url,display_order) select saved.id,x.name,coalesce(x.details,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_services) x(name text,details text,source_url text,display_order int);
 delete from public.medical_center_hours where medical_center_id=saved.id;
 insert into public.medical_center_hours(medical_center_id,label,hours_text,source_url,display_order) select saved.id,x.label,x.hours_text,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_hours) x(label text,hours_text text,source_url text,display_order int);
 delete from public.medical_center_branches where medical_center_id=saved.id;
 insert into public.medical_center_branches(medical_center_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.medical_center_sources where medical_center_id=saved.id;
 insert into public.medical_center_sources(medical_center_id,title,url,publisher,source_type,checked_at,note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,'') from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text);
 select * into saved from public.medical_centers where id=saved.id;
 if saved.is_published and not exists(select 1 from public.medical_center_sources where medical_center_id=saved.id) then raise exception 'Published medical center requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object(
  'specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=saved.id),'[]'),
  'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=saved.id),'[]'),
  'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=saved.id),'[]'),
  'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=saved.id),'[]'),
  'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);
 perform public.editorial_emit('medical_center','medicalCenters',saved.id::text,before_bundle,after_bundle,'/medical-centers/'||saved.slug);
 return to_jsonb(saved);
end;
$$;

create function public.directory_set_deleted(p_kind text,p_id uuid,p_revision bigint,p_deleted boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb;
begin
 if not exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=auth.uid() and e.role='management' and u.email_confirmed_at is not null) then raise exception 'Management role required' using errcode='42501';end if;
 if p_kind='university' then update public.universities set deleted_at=case when p_deleted then clock_timestamp() else null end where id=p_id and revision=p_revision returning to_jsonb(universities) into saved;
 elsif p_kind='medical_center' then update public.medical_centers set deleted_at=case when p_deleted then clock_timestamp() else null end where id=p_id and revision=p_revision returning to_jsonb(medical_centers) into saved;
 else raise exception 'Unknown directory kind' using errcode='22023';end if;
 if saved is null then raise exception 'Stale directory revision' using errcode='40001';end if;
 return saved;
end;
$$;

revoke all on function public.directory_save_university(uuid,bigint,jsonb,jsonb,jsonb,jsonb,text),public.directory_save_medical_center(uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text),public.directory_set_deleted(text,uuid,bigint,boolean) from public,anon;
grant execute on function public.directory_save_university(uuid,bigint,jsonb,jsonb,jsonb,jsonb,text),public.directory_save_medical_center(uuid,bigint,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text),public.directory_set_deleted(text,uuid,bigint,boolean) to authenticated,service_role;

-- One contribution per parent and transaction; child changes are folded into changed_fields.
create function public.directory_editorial_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; before_row jsonb; after_row jsonb; parent jsonb; parent_id uuid; kind text; section_name text; route text;
begin
 if current_setting('app967.directory_batch',true)='true' then return coalesce(new,old);end if;
 if TG_OP<>'INSERT' then before_row:=to_jsonb(old);end if;if TG_OP<>'DELETE' then after_row:=to_jsonb(new);end if;item:=coalesce(after_row,before_row);
 if TG_TABLE_NAME='universities' then kind:='university';section_name:='universities';route:='/universities/'||(item->>'slug');
  if TG_OP='UPDATE' and before_row->>'deleted_at' is null and after_row->>'deleted_at' is not null then perform public.editorial_emit(kind,section_name,item->>'id',before_row,null,route);return coalesce(new,old);end if;
  if TG_OP='UPDATE' and before_row->>'deleted_at' is not null and after_row->>'deleted_at' is null then perform public.editorial_emit(kind,section_name,item->>'id',null,after_row,route);update public.editorial_contributions set action='restore' where transaction_id=txid_current() and content_type=kind and content_id=item->>'id';return coalesce(new,old);end if;
 elsif TG_TABLE_NAME='medical_centers' then kind:='medical_center';section_name:='medicalCenters';route:='/medical-centers/'||(item->>'slug');
  if TG_OP='UPDATE' and before_row->>'deleted_at' is null and after_row->>'deleted_at' is not null then perform public.editorial_emit(kind,section_name,item->>'id',before_row,null,route);return coalesce(new,old);end if;
  if TG_OP='UPDATE' and before_row->>'deleted_at' is not null and after_row->>'deleted_at' is null then perform public.editorial_emit(kind,section_name,item->>'id',null,after_row,route);update public.editorial_contributions set action='restore' where transaction_id=txid_current() and content_type=kind and content_id=item->>'id';return coalesce(new,old);end if;
 else
  parent_id:=coalesce((item->>'university_id')::uuid,(item->>'medical_center_id')::uuid);
  if item ? 'university_id' then select to_jsonb(p) into parent from public.universities p where p.id=parent_id;kind:='university';section_name:='universities';route:='/universities/'||(parent->>'slug');
  else select to_jsonb(p) into parent from public.medical_centers p where p.id=parent_id;kind:='medical_center';section_name:='medicalCenters';route:='/medical-centers/'||(parent->>'slug');end if;
  if parent is null then return coalesce(new,old);end if;
  perform public.editorial_emit(kind,section_name,parent->>'id',parent,parent,route,array[TG_TABLE_NAME]);return coalesce(new,old);
 end if;
 perform public.editorial_emit(kind,section_name,item->>'id',before_row,after_row,route);return coalesce(new,old);
end;
$$;
revoke all on function public.directory_editorial_trigger() from public,anon,authenticated,service_role;
do $$ declare t text; begin foreach t in array array['universities','university_programs','university_branches','university_sources','medical_centers','medical_center_specialties','medical_center_services','medical_center_hours','medical_center_branches','medical_center_sources'] loop execute format('create trigger directory_editorial_change after insert or update or delete on public.%I for each row execute function public.directory_editorial_trigger()',t);end loop;end $$;

commit;
