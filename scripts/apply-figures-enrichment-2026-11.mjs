// Applies the November 2026 Yemeni-figures campaign through the site's own saveFigureProfile (as the admin):
//  - enrich-output-*.json: expanded profiles and improved records for existing figures,
//  - add-output-*.json: new figures (published),
//  - portraits.json: verified Commons portraits for figures without an image.
// Profiles are validated by validateFigureProfile; existing sources and licences are kept. Add --write to save.
import {createClient} from '@supabase/supabase-js';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {readFigureProfile, saveFigureProfile} from '../lib/figureProfileRepository.js';
import {validateFigureProfile} from '../lib/figureProfiles.js';

const write = process.argv.includes('--write');
const dir = new URL('../data/yemeni-figures/campaign-2026-11/', import.meta.url);
const read = name => existsSync(new URL(name, dir)) ? JSON.parse(readFileSync(new URL(name, dir), 'utf8')) : [];
const enriched = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(n => read(`enrich-output-${n}.json`));
const added = [1, 2, 3, 4].flatMap(n => read(`add-output-${n}.json`));
const portraits = existsSync(new URL('portraits.json', dir)) ? JSON.parse(readFileSync(new URL('portraits.json', dir), 'utf8')) : {};
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const {data: users} = await db.auth.admin.listUsers({perPage: 1000});
const actorId = users.users.find(user => user.email === process.env.SITE_ADMIN_EMAIL)?.id;
const {data: rows, error} = await db.from('yemeni_figures').select('*');
if (error) throw error;
const bySlug = new Map(rows.map(row => [row.slug, row]));
const names = new Set(rows.map(row => row.full_name.replace(/\s+/g, ' ').trim()));
let order = Math.max(...rows.map(row => row.display_order || 0));
const arabicIndic = /[٠-٩۰-۹]/;
const problems = [], done = {enriched: 0, added: 0, portraits: 0};
const chars = profile => profile.sections.reduce((n, s) => n + s.paragraphs.join('').length, 0);
const fields = ['slug', 'full_name', 'known_for', 'field', 'governorate_id', 'era', 'birth_year', 'death_year', 'short_bio', 'image_url', 'image_credit', 'image_source_url', 'website', 'facebook_url', 'instagram_url', 'x_url', 'youtube_url', 'display_order', 'is_published'];
const pick = row => Object.fromEntries(fields.map(key => [key, row[key] ?? (['birth_year', 'death_year'].includes(key) ? null : key === 'is_published' ? true : '')]));
const year = value => Number.isInteger(value) && value >= 500 && value <= 2100 ? value : null;

function mergeProfile(previous, next) {
  if (!previous) return next;
  const sources = [...previous.sources];
  for (const source of next.sources || []) if (!sources.some(s => s.id === source.id || s.url === source.url)) sources.push(source);
  // Point any reference to a duplicated-by-URL source at the existing id.
  const alias = new Map((next.sources || []).map(s => [s.id, (sources.find(x => x.url === s.url) || s).id]));
  const fix = list => (list || []).map(item => ({...item, sourceIds: [...new Set((item.sourceIds || []).map(id => alias.get(id) || id))]}));
  return {...next, version: 1, license: previous.license || next.license || null, sources, gallery: previous.gallery || [], sections: fix(next.sections), facts: fix(next.facts), timeline: fix(next.timeline), works: fix(next.works)};
}
async function save(record, profile, current, label) {
  if ([record.short_bio, ...profile.sections.flatMap(s => s.paragraphs)].some(text => arabicIndic.test(text))) throw new Error('Arabic-Indic digits');
  const checked = validateFigureProfile(profile);
  if (!write) return;
  await saveFigureProfile(db, {record: current ? {...record, id: current.id} : record, profile: checked, revision: current?.updated_at ?? null, role: 'admin', actorId});
}

const touched = new Set();
for (const item of enriched) {
  const current = bySlug.get(item.record?.slug);
  if (!current) { problems.push(`${item.record?.slug}: unknown figure`); continue; }
  try {
    const previous = await readFigureProfile(db, current);
    const profile = mergeProfile(previous, item.profile);
    if (chars(profile) < 1800) throw new Error(`profile too short (${chars(profile)})`);
    const record = {...pick(current), known_for: item.record.known_for || current.known_for, short_bio: item.record.short_bio || current.short_bio,
      field: item.record.field || current.field, governorate_id: item.record.governorate_id ?? current.governorate_id,
      birth_year: year(item.record.birth_year) ?? current.birth_year, death_year: year(item.record.death_year) ?? current.death_year};
    if (!current.image_url && portraits[current.slug]) Object.assign(record, portraits[current.slug], {wikidata: undefined});
    delete record.wikidata;
    await save(record, profile, current, current.slug);
    touched.add(current.slug); done.enriched++;
    if (record.image_url && !current.image_url) done.portraits++;
  } catch (error) { problems.push(`${item.record?.slug}: ${error.message}`); }
}
for (const item of added) {
  const slug = item.record?.slug, name = String(item.record?.full_name || '').replace(/\s+/g, ' ').trim();
  if (!slug || bySlug.has(slug)) { problems.push(`${slug}: slug exists`); continue; }
  if (names.has(name)) { problems.push(`${slug}: name exists (${name})`); continue; }
  try {
    if (chars(item.profile) < 1800) throw new Error(`profile too short (${chars(item.profile)})`);
    const record = {...pick({...item.record, is_published: true, display_order: ++order}), birth_year: year(item.record.birth_year), death_year: year(item.record.death_year)};
    if (portraits[slug]) Object.assign(record, {image_url: portraits[slug].image_url, image_credit: portraits[slug].image_credit, image_source_url: portraits[slug].image_source_url});
    await save(record, item.profile, null, slug);
    names.add(name); done.added++;
    if (record.image_url) done.portraits++;
  } catch (error) { problems.push(`${slug}: ${error.message}`); }
}
// Portraits for figures whose text was already rich (not in the enrichment files).
for (const [slug, portrait] of Object.entries(portraits)) {
  const current = bySlug.get(slug);
  if (!portrait || !current || current.image_url || touched.has(slug)) continue;
  try {
    const profile = await readFigureProfile(db, current);
    const record = {...pick(current), image_url: portrait.image_url, image_credit: portrait.image_credit, image_source_url: portrait.image_source_url};
    await save(record, profile, current, slug);
    done.portraits++;
  } catch (error) { problems.push(`${slug} portrait: ${error.message}`); }
}
writeFileSync(new URL(`apply-report${write ? '' : '-dry-run'}.json`, dir), JSON.stringify({...done, problems}, null, 1));
console.log(JSON.stringify(done), `${write ? 'written' : 'ready'}`, `problems ${problems.length}`);
for (const p of problems.slice(0, 30)) console.log(' - ' + p);
