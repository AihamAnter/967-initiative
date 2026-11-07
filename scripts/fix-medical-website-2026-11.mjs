// Removes dead or hijacked websites (gambling redirect; parked domain — checked 2026-11-07) from a medical centre record.
import {createClient} from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const keys = ['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'];
const tables = {specialties: 'medical_center_specialties', services: 'medical_center_services', hours: 'medical_center_hours', branches: 'medical_center_branches', sources: 'medical_center_sources'};
for (const slug of ['saudi-german-hospital-sanaa', 'health-1519011']) {
  const {data: row} = await db.from('medical_centers').select('*').eq('slug', slug).single();
  if (!row?.website) { console.log(slug, 'no website'); continue; }
  const kids = {};
  for (const [k, t] of Object.entries(tables)) kids[k] = (await db.from(t).select('*').eq('medical_center_id', row.id)).data.map(({id, medical_center_id, ...r}) => r);
  kids.sources = kids.sources.filter(s => !s.url.includes(new URL(row.website).hostname));
  const record = Object.fromEntries(keys.map(k => [k, row[k]])); record.website = null;
  const {error} = await db.rpc('directory_save_medical_center', {p_id: row.id, p_revision: Number(row.revision), p_record: record, p_specialties: kids.specialties, p_services: kids.services, p_hours: kids.hours, p_branches: kids.branches, p_sources: kids.sources.length ? kids.sources : [{title: 'منظمة الصحة العالمية ووزارة الصحة', url: 'https://data.humdata.org/dataset/yemen-herams-dataset-2020-list-of-health-facilities', source_type: 'official_directory'}], p_origin: 'import:institution-directory:campaign-2026-11'});
  console.log(slug, error ? error.message : 'hijacked website removed');
}
