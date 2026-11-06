// Applies the November 2026 Yemen-map enrichment.
//   --districts     district profiles from data/yemen-map/districts-output-*.json (+ population and area for every
//                   district, including the 13 reviewed ones, whose texts are kept).
//   --governorates  governorate texts from data/yemen-map/governorates-output.json.
// Saves go through editorial_service_save as the site admin, like the editor does. Add --write to save.
import {createClient} from '@supabase/supabase-js';
import {existsSync, readFileSync} from 'node:fs';
import {DISTRICT_PROFILE_PREFIX, boundarySource, validateDistrictProfile} from '../lib/districtProfiles.js';
import {reviewedDistrictProfiles} from '../lib/reviewedDistrictProfiles.js';

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const exists = path => existsSync(new URL('../' + path, import.meta.url));
const {data: users} = await db.auth.admin.listUsers({perPage: 1000});
const actor = users.users.find(user => user.email === process.env.SITE_ADMIN_EMAIL)?.id;
if (!actor) throw new Error('Admin account not found.');
const hdx = {title: 'OCHA/HDX — تقديرات سكان اليمن 2025 (الجهاز المركزي للإحصاء)', url: 'https://data.humdata.org/dataset/yemen-population-estimates'};
const problems = [];
const arabicIndic = /[٠-٩۰-۹]/;

async function save(key, value) {
  const current = await db.from('site_settings').select('updated_at').eq('key', key).maybeSingle();
  if (current.error) throw current.error;
  const {data, error} = await db.rpc('editorial_service_save', {p_kind: 'setting', p_id: key, p_revision: current.data?.updated_at ?? null, p_data: value, p_actor: actor, p_action: 'update'});
  if (error || !data?.record) throw new Error(`${key}: ${error?.message || 'not saved'}`);
}

if (args.has('--districts')) {
  const input = new Map(read('data/yemen-map/districts-research-input.json').map(row => [row.id, row]));
  const written = new Map();
  for (let n = 1; n <= 6; n++) if (exists(`data/yemen-map/districts-output-${n}.json`)) for (const row of read(`data/yemen-map/districts-output-${n}.json`)) written.set(row.id, row);
  let ready = 0, skipped = 0;
  for (const [id, base] of input) {
    const text = written.get(id) || reviewedDistrictProfiles[id];
    if (!text) { skipped++; continue; }
    const sources = [boundarySource, ...(text.sources || [])];
    if (base.population_2025) sources.push(hdx);
    const unique = [...new Map(sources.filter(s => s?.url).map(s => [s.url, {title: String(s.title || s.url).slice(0, 250), url: s.url}])).values()].slice(0, 15);
    const raw = {
      capital: text.capital || '', description: text.description || '', history: text.history || '', geography: text.geography || '',
      economy: text.economy || '', landmarks: text.landmarks || '', image_url: '', image_credit: '', image_source_url: '',
      area_km2: base.area_km2 || null, population: base.population_2025 || null, population_year: base.population_2025 ? 2025 : null, sources: unique,
    };
    try {
      if (!reviewedDistrictProfiles[id] && raw.description.length < 250) throw new Error('description too short');
      if (Object.values(raw).some(value => typeof value === 'string' && arabicIndic.test(value))) throw new Error('Arabic-Indic digits');
      const profile = validateDistrictProfile(raw);
      ready++;
      if (write) await save(DISTRICT_PROFILE_PREFIX + id, {version: 1, profile});
    } catch (error) { problems.push(`${id} ${base.name_ar}: ${error.message}`); }
  }
  console.log(`districts: ${ready} ${write ? 'written' : 'ready'}, ${skipped} without text yet`);
}

if (args.has('--governorates') && exists('data/yemen-map/governorates-output.json')) {
  const limits = {description: 4000, history: 6000, geography: 6000, economy: 6000, landmarks: 6000};
  let ready = 0;
  for (const row of read('data/yemen-map/governorates-output.json')) {
    const bad = Object.entries(limits).find(([key, max]) => typeof row[key] !== 'string' || row[key].length < 300 || row[key].length > max || arabicIndic.test(row[key]));
    if (bad) { problems.push(`${row.id}: ${bad[0]}`); continue; }
    ready++;
    if (write) {
      const update = {description: row.description, history: row.history, geography: row.geography, economy: row.economy, landmarks: row.landmarks};
      // Capitals already on the site were reviewed earlier; keep them.
      const {error} = await db.from('governorates').update(update).eq('id', row.id);
      if (error) problems.push(`${row.id}: ${error.message}`);
    }
  }
  console.log(`governorates: ${ready} ${write ? 'written' : 'ready'}`);
}
if (problems.length) { console.log(`${problems.length} problems:`); for (const p of problems.slice(0, 40)) console.log(' - ' + p); }
