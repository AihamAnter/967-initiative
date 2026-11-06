// Attaches freely licensed Wikimedia Commons photos (Wikidata P18) to district profiles, with author,
// licence and source link as the site requires. Matches Wikidata districts to map districts by English name.
// Writes data/yemen-map/district-images.json; with --write also saves them into the published profiles.
import {createClient} from '@supabase/supabase-js';
import {readFileSync, writeFileSync} from 'node:fs';
import {DISTRICT_PROFILE_PREFIX, validateDistrictProfile} from '../lib/districtProfiles.js';

const write = process.argv.includes('--write');
const ua = {'User-Agent': '967ye-content-bot/1.0 (https://967ye.com)'};
const boundaries = JSON.parse(readFileSync(new URL('../public/data/yemen-map/yemen-boundaries.json', import.meta.url), 'utf8'));
const norm = text => String(text || '').toLowerCase().replace(/ district$/, '').replace(/[^a-z]/g, '').replace(/^(al|as|ash|ad|adh|ar|at|az|an)/, '');

const query = `SELECT ?item ?en ?image WHERE { ?item wdt:P31 wd:Q6617100; wdt:P18 ?image. ?item rdfs:label ?en FILTER(lang(?en)='en') }`;
const sparql = await (await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {headers: ua})).json();
const byName = new Map();
for (const district of boundaries.districts) {
  const key = norm(district.nameEn);
  byName.set(key, [...(byName.get(key) || []), district]);
}
const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const images = [];
for (const row of sparql.results.bindings) {
  const matches = byName.get(norm(row.en.value)) || [];
  if (matches.length !== 1) { console.log(`no unique match: ${row.en.value} (${matches.length})`); continue; }
  const file = decodeURIComponent(row.image.value.split('/Special:FilePath/')[1]);
  // Location maps are not photographs; the page already draws the district on a map.
  if (/locator|location|map|district.png$|^kuhlan.png$/i.test(file)) { console.log('skip map ' + file); continue; }
  const info = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=extmetadata|url&format=json`, {headers: ua})).json();
  const meta = Object.values(info.query.pages)[0]?.imageinfo?.[0]?.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value);
  const artist = strip(meta.Artist?.value) || 'مستخدم ويكيميديا كومنز';
  if (!license || !/cc|public domain|pd/i.test(license)) { console.log(`skip licence ${file}: ${license}`); continue; }
  images.push({
    id: matches[0].id, name_ar: matches[0].nameAr,
    image_url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=960`,
    image_credit: `${artist} — ${license}، عبر ويكيميديا كومنز`.slice(0, 1000),
    image_source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
  });
}
writeFileSync(new URL('../data/yemen-map/district-images.json', import.meta.url), JSON.stringify(images, null, 1));
console.log(`images matched: ${images.length}`);

if (write) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
  const {data: users} = await db.auth.admin.listUsers({perPage: 1000});
  const actor = users.users.find(user => user.email === process.env.SITE_ADMIN_EMAIL)?.id;
  let saved = 0;
  for (const image of images) {
    const key = DISTRICT_PROFILE_PREFIX + image.id;
    const current = await db.from('site_settings').select('value,updated_at').eq('key', key).maybeSingle();
    if (current.error || !current.data) { console.log(`no profile ${image.id}`); continue; }
    if (current.data.value?.profile?.image_url) continue;
    const profile = validateDistrictProfile({...current.data.value.profile, image_url: image.image_url, image_credit: image.image_credit, image_source_url: image.image_source_url});
    const {error} = await db.rpc('editorial_service_save', {p_kind: 'setting', p_id: key, p_revision: current.data.updated_at, p_data: {version: 1, profile}, p_actor: actor, p_action: 'update'});
    if (error) console.log(`${image.id}: ${error.message}`); else saved++;
  }
  console.log(`images saved: ${saved}`);
}
