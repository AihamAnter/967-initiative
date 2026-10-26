-- REVIEW ONLY. Apply after 202610250007_institution_directories.sql in an isolated project first.
-- Additive source metadata and idempotent saves; no directory row is deleted or recreated.
begin;

alter table public.university_sources alter column checked_at drop not null;
alter table public.medical_center_sources alter column checked_at drop not null;

alter table public.university_sources
 add column document_url text check (document_url is null or document_url ~* '^https?://'),
 add column source_published_at text,
 add column accessed_at text,
 add column status_as_of text,
 add column information_verified_at text,
 add column supports text[] not null default '{}',
 add column conflict_note text;
alter table public.medical_center_sources
 add column document_url text check (document_url is null or document_url ~* '^https?://'),
 add column source_published_at text,
 add column accessed_at text,
 add column status_as_of text,
 add column information_verified_at text,
 add column supports text[] not null default '{}',
 add column conflict_note text;

update public.university_sources set accessed_at=checked_at::text where accessed_at is null and checked_at is not null;
update public.medical_center_sources set accessed_at=checked_at::text where accessed_at is null and checked_at is not null;

create function public.directory_jsonb_array_equal(p_left jsonb,p_right jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(coalesce(p_left,'[]'))='array'
    and jsonb_typeof(coalesce(p_right,'[]'))='array'
    and jsonb_array_length(coalesce(p_left,'[]'))=jsonb_array_length(coalesce(p_right,'[]'))
    and coalesce(p_left,'[]') @> coalesce(p_right,'[]')
    and coalesce(p_right,'[]') @> coalesce(p_left,'[]')
$$;
revoke all on function public.directory_jsonb_array_equal(jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function public.directory_save_university(p_id uuid,p_revision bigint,p_record jsonb,p_programs jsonb default '[]',p_branches jsonb default '[]',p_sources jsonb default '[]',p_origin text default 'admin:directory') returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.universities; original public.universities; candidate public.universities; before_bundle jsonb; after_bundle jsonb; approved_import_publication boolean;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_programs)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'])) then raise exception 'Protected university field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),220) else 'admin:directory' end,true);
 perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new university' using errcode='22023';end if;
  approved_import_publication:=auth.role()<>'service_role' or p_origin='import:institution-directory:approved-publish:'||(p_record->>'stable_key');
  insert into public.universities(stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,social_links,admission_info,tuition_info,tuition_as_of,registration_url,languages,study_modes,education_levels,accreditation_status,accrediting_body,operating_status,verification_status,verified_at,is_published)
  select stable_key,slug,name_ar,name_en,institution_type,ownership,founded_year,coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,email,coalesce(social_links,'[]'),coalesce(admission_info,''),coalesce(tuition_info,''),tuition_as_of,registration_url,coalesce(languages,'{}'),coalesce(study_modes,'{}'),coalesce(education_levels,'{}'),coalesce(accreditation_status,'not_asserted'),coalesce(accrediting_body,''),coalesce(operating_status,'unknown'),coalesce(verification_status,'incomplete'),verified_at,case when approved_import_publication then coalesce(is_published,false) else false end from jsonb_populate_record(null::public.universities,p_record) returning * into saved;
 else
  select * into original from public.universities where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale university revision' using errcode='40001';end if;
  if p_record->>'stable_key' is distinct from original.stable_key or p_record->>'slug' is distinct from original.slug then raise exception 'Stable university identity cannot be changed' using errcode='42501';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object(
   'programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=original.id),'[]'),
   'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=original.id),'[]'),
   'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=original.id),'[]'));
  select * into candidate from jsonb_populate_record(original,p_record);
  if to_jsonb(original)-array['id','revision','deleted_at','created_at','updated_at']=to_jsonb(candidate)-array['id','revision','deleted_at','created_at','updated_at']
   and public.directory_jsonb_array_equal(before_bundle->'programs',p_programs)
   and public.directory_jsonb_array_equal(before_bundle->'branches',p_branches)
   and public.directory_jsonb_array_equal(before_bundle->'sources',p_sources) then
   perform set_config('app967.directory_batch','false',true);return to_jsonb(original);
  end if;
  update public.universities u set name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,founded_year=x.founded_year,summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,email=x.email,social_links=coalesce(x.social_links,'[]'),admission_info=coalesce(x.admission_info,''),tuition_info=coalesce(x.tuition_info,''),tuition_as_of=x.tuition_as_of,registration_url=x.registration_url,languages=coalesce(x.languages,'{}'),study_modes=coalesce(x.study_modes,'{}'),education_levels=coalesce(x.education_levels,'{}'),accreditation_status=coalesce(x.accreditation_status,'not_asserted'),accrediting_body=coalesce(x.accrediting_body,''),operating_status=coalesce(x.operating_status,'unknown'),verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.universities,p_record) x where u.id=p_id returning u.* into saved;
 end if;
 delete from public.university_programs where university_id=saved.id;
 insert into public.university_programs(university_id,faculty,department,name,field,qualification,language,study_mode,source_url,display_order) select saved.id,coalesce(x.faculty,''),coalesce(x.department,''),x.name,coalesce(x.field,''),coalesce(x.qualification,''),coalesce(x.language,''),coalesce(x.study_mode,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_programs) x(faculty text,department text,name text,field text,qualification text,language text,study_mode text,source_url text,display_order int);
 delete from public.university_branches where university_id=saved.id;
 insert into public.university_branches(university_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.university_sources where university_id=saved.id;
 insert into public.university_sources(university_id,title,url,publisher,source_type,checked_at,note,document_url,source_published_at,accessed_at,status_as_of,information_verified_at,supports,conflict_note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,''),x.document_url,x.source_published_at,x.accessed_at,x.status_as_of,x.information_verified_at,coalesce(x.supports,'{}'),x.conflict_note from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text,document_url text,source_published_at text,accessed_at text,status_as_of text,information_verified_at text,supports text[],conflict_note text);
 select * into saved from public.universities where id=saved.id;
 if saved.is_published and not exists(select 1 from public.university_sources where university_id=saved.id) then raise exception 'Published university requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object('programs',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_programs c where c.university_id=saved.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.display_order,c.name) from public.university_branches c where c.university_id=saved.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','university_id'] order by c.url) from public.university_sources c where c.university_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);perform public.editorial_emit('university','universities',saved.id::text,before_bundle,after_bundle,'/universities/'||saved.slug);return to_jsonb(saved);
end;
$$;

create or replace function public.directory_save_medical_center(p_id uuid,p_revision bigint,p_record jsonb,p_specialties jsonb default '[]',p_services jsonb default '[]',p_hours jsonb default '[]',p_branches jsonb default '[]',p_sources jsonb default '[]',p_origin text default 'admin:directory') returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.medical_centers; original public.medical_centers; candidate public.medical_centers; before_bundle jsonb; after_bundle jsonb; approved_import_publication boolean;
begin
 perform public.directory_assert_writer();
 if jsonb_typeof(p_record)<>'object' or jsonb_typeof(p_specialties)<>'array' or jsonb_typeof(p_services)<>'array' or jsonb_typeof(p_hours)<>'array' or jsonb_typeof(p_branches)<>'array' or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid directory payload' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_record) k where k<>all(array['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'])) then raise exception 'Protected medical-center field' using errcode='42501';end if;
 perform set_config('app967.editorial_origin',case when auth.role()='service_role' then left(coalesce(p_origin,'import:institution-directory'),220) else 'admin:directory' end,true);perform set_config('app967.directory_batch','true',true);
 if p_id is null then
  if p_revision is not null then raise exception 'Invalid revision for new medical center' using errcode='22023';end if;
  approved_import_publication:=auth.role()<>'service_role' or p_origin='import:institution-directory:approved-publish:'||(p_record->>'stable_key');
  insert into public.medical_centers(stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,operator_name,summary,governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,social_links,booking_url,emergency_available,operating_status,operating_status_as_of,verification_status,verified_at,facility_presence,care_level,access_status,building_status,equipment_status,is_published)
  select stable_key,official_code,slug,name_ar,name_en,institution_type,ownership,coalesce(operator_name,''),coalesce(summary,''),governorate,city,district,address,latitude,longitude,map_url,logo_url,website,phone,emergency_phone,email,coalesce(social_links,'[]'),booking_url,emergency_available,coalesce(operating_status,'unknown'),operating_status_as_of,coalesce(verification_status,'incomplete'),verified_at,coalesce(facility_presence,''),coalesce(care_level,''),coalesce(access_status,''),coalesce(building_status,''),coalesce(equipment_status,''),case when approved_import_publication then coalesce(is_published,false) else false end from jsonb_populate_record(null::public.medical_centers,p_record) returning * into saved;
 else
  select * into original from public.medical_centers where id=p_id for update;
  if not found or p_revision is null or original.revision<>p_revision then raise exception 'Stale medical-center revision' using errcode='40001';end if;
  if p_record->>'stable_key' is distinct from original.stable_key or p_record->>'slug' is distinct from original.slug then raise exception 'Stable medical-center identity cannot be changed' using errcode='42501';end if;
  before_bundle:=to_jsonb(original)||jsonb_build_object('specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=original.id),'[]'),'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=original.id),'[]'),'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=original.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=original.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=original.id),'[]'));
  select * into candidate from jsonb_populate_record(original,p_record);
  if to_jsonb(original)-array['id','revision','deleted_at','created_at','updated_at']=to_jsonb(candidate)-array['id','revision','deleted_at','created_at','updated_at']
   and public.directory_jsonb_array_equal(before_bundle->'specialties',p_specialties) and public.directory_jsonb_array_equal(before_bundle->'services',p_services) and public.directory_jsonb_array_equal(before_bundle->'hours',p_hours) and public.directory_jsonb_array_equal(before_bundle->'branches',p_branches) and public.directory_jsonb_array_equal(before_bundle->'sources',p_sources) then
   perform set_config('app967.directory_batch','false',true);return to_jsonb(original);
  end if;
  update public.medical_centers m set official_code=x.official_code,name_ar=x.name_ar,name_en=x.name_en,institution_type=x.institution_type,ownership=x.ownership,operator_name=coalesce(x.operator_name,''),summary=coalesce(x.summary,''),governorate=x.governorate,city=x.city,district=x.district,address=x.address,latitude=x.latitude,longitude=x.longitude,map_url=x.map_url,logo_url=x.logo_url,website=x.website,phone=x.phone,emergency_phone=x.emergency_phone,email=x.email,social_links=coalesce(x.social_links,'[]'),booking_url=x.booking_url,emergency_available=x.emergency_available,operating_status=coalesce(x.operating_status,'unknown'),operating_status_as_of=x.operating_status_as_of,verification_status=coalesce(x.verification_status,'incomplete'),verified_at=x.verified_at,facility_presence=coalesce(x.facility_presence,''),care_level=coalesce(x.care_level,''),access_status=coalesce(x.access_status,''),building_status=coalesce(x.building_status,''),equipment_status=coalesce(x.equipment_status,''),is_published=coalesce(x.is_published,false)
  from jsonb_populate_record(null::public.medical_centers,p_record) x where m.id=p_id returning m.* into saved;
 end if;
 delete from public.medical_center_specialties where medical_center_id=saved.id;insert into public.medical_center_specialties(medical_center_id,name,source_url,display_order) select saved.id,x.name,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_specialties) x(name text,source_url text,display_order int);
 delete from public.medical_center_services where medical_center_id=saved.id;insert into public.medical_center_services(medical_center_id,name,details,source_url,display_order) select saved.id,x.name,coalesce(x.details,''),x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_services) x(name text,details text,source_url text,display_order int);
 delete from public.medical_center_hours where medical_center_id=saved.id;insert into public.medical_center_hours(medical_center_id,label,hours_text,source_url,display_order) select saved.id,x.label,x.hours_text,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_hours) x(label text,hours_text text,source_url text,display_order int);
 delete from public.medical_center_branches where medical_center_id=saved.id;insert into public.medical_center_branches(medical_center_id,name,governorate,city,district,address,latitude,longitude,map_url,phone,source_url,display_order) select saved.id,x.name,x.governorate,x.city,x.district,x.address,x.latitude,x.longitude,x.map_url,x.phone,x.source_url,coalesce(x.display_order,0) from jsonb_to_recordset(p_branches) x(name text,governorate text,city text,district text,address text,latitude numeric,longitude numeric,map_url text,phone text,source_url text,display_order int);
 delete from public.medical_center_sources where medical_center_id=saved.id;insert into public.medical_center_sources(medical_center_id,title,url,publisher,source_type,checked_at,note,document_url,source_published_at,accessed_at,status_as_of,information_verified_at,supports,conflict_note) select saved.id,x.title,x.url,coalesce(x.publisher,''),coalesce(x.source_type,'official_directory'),x.checked_at,coalesce(x.note,''),x.document_url,x.source_published_at,x.accessed_at,x.status_as_of,x.information_verified_at,coalesce(x.supports,'{}'),x.conflict_note from jsonb_to_recordset(p_sources) x(title text,url text,publisher text,source_type text,checked_at date,note text,document_url text,source_published_at text,accessed_at text,status_as_of text,information_verified_at text,supports text[],conflict_note text);
 select * into saved from public.medical_centers where id=saved.id;if saved.is_published and not exists(select 1 from public.medical_center_sources where medical_center_id=saved.id) then raise exception 'Published medical center requires a source' using errcode='23514';end if;
 after_bundle:=to_jsonb(saved)||jsonb_build_object('specialties',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_specialties c where c.medical_center_id=saved.id),'[]'),'services',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_services c where c.medical_center_id=saved.id),'[]'),'hours',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.label) from public.medical_center_hours c where c.medical_center_id=saved.id),'[]'),'branches',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.display_order,c.name) from public.medical_center_branches c where c.medical_center_id=saved.id),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(c)-array['id','medical_center_id'] order by c.url) from public.medical_center_sources c where c.medical_center_id=saved.id),'[]'));
 perform set_config('app967.directory_batch','false',true);perform public.editorial_emit('medical_center','medicalCenters',saved.id::text,before_bundle,after_bundle,'/medical-centers/'||saved.slug);return to_jsonb(saved);
end;
$$;

commit;
