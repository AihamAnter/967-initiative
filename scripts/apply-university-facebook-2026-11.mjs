// Adds official Facebook pages (found by name in Facebook page search, exact-name matches only) to
// institutions without social links, through directory_save_university; child lists are sent unchanged.
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
const pages = JSON.parse(readFileSync(new URL('../data/universities/campaign-2026-11/facebook-pages.json', import.meta.url), 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const keys = ['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'];
const strip = ({id, university_id, ...rest}) => rest;
let saved = 0;
for (const [slug, url] of Object.entries(pages)) {
  const {data: row} = await db.from('universities').select('*').eq('slug', slug).single();
  if (!row || (row.social_links || []).length) continue;
  const [p, b, s] = await Promise.all(['university_programs', 'university_branches', 'university_sources'].map(t => db.from(t).select('*').eq('university_id', row.id)));
  const record = Object.fromEntries(keys.map(k => [k, row[k]]));
  record.social_links = [{label: 'فيسبوك', url}];
  const {error} = await db.rpc('directory_save_university', {p_id: row.id, p_revision: Number(row.revision), p_record: record, p_programs: p.data.map(strip), p_branches: b.data.map(strip), p_sources: s.data.map(strip), p_origin: 'import:institution-directory:campaign-2026-11'});
  if (error) console.log(slug, error.message); else saved++;
}
console.log('facebook pages saved', saved);
