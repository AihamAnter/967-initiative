// Applies the November 2026 Yemen-history enrichment and additions.
// Reads data/yemen-history/enrich-output-*.json (rewritten starter entries) and add-output-*.json (new entries),
// verifies every proposed Wikimedia Commons image (exists, author, licence), validates every entry with the
// site's own validateHistoryEntry, and saves them as the editorial catalog override (site_settings
// yemen_history_catalog_v1), exactly like the history editor does. Add --write to save.
import {createClient} from '@supabase/supabase-js';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {HISTORY_CATALOG_KEY, readHistoryCatalog, validateHistoryEntry} from '../lib/historyRepository.js';
import {historyStarter} from '../lib/yemenHistory.js';

const write = process.argv.includes('--write');
const ua = {'User-Agent': '967ye-content-bot/1.0 (https://967ye.com)'};
const dir = new URL('../data/yemen-history/', import.meta.url);
const read = name => existsSync(new URL(name, dir)) ? JSON.parse(readFileSync(new URL(name, dir), 'utf8')) : [];
const enriched = [1, 2, 3, 4, 5, 6].flatMap(n => read(`enrich-output-${n}.json`));
const added = [1, 2, 3].flatMap(n => read(`add-output-${n}.json`));
const starter = new Map(historyStarter.map(entry => [entry.slug, entry]));
const problems = [];
const arabicIndic = /[٠-٩۰-۹]/;
const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// Verify Commons files in batches of 40 titles.
const files = [...new Set([...enriched, ...added].flatMap(entry => (entry.images || []).map(image => String(image.file || '').trim())).filter(Boolean))];
const commons = new Map();
for (let i = 0; i < files.length; i += 40) {
  const titles = files.slice(i, i + 40).map(file => 'File:' + file).join('|');
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(titles)}`;
  const data = await (await fetch(url, {headers: ua})).json();
  const normalized = new Map((data.query?.normalized || []).map(row => [row.to, row.from]));
  for (const page of Object.values(data.query?.pages || {})) {
    if (page.missing !== undefined || !page.imageinfo) continue;
    const meta = page.imageinfo[0].extmetadata || {};
    const license = strip(meta.LicenseShortName?.value);
    if (!license || !/cc|public domain|pd|gfdl|attribution/i.test(license)) continue;
    const original = (normalized.get(page.title) || page.title).replace(/^File:/, '');
    commons.set(original, {credit: (strip(meta.Artist?.value) || 'مستخدم ويكيميديا كومنز').slice(0, 180), license: license.slice(0, 180)});
  }
}

const allSlugs = new Set([...starter.keys(), ...added.map(entry => entry.slug)]);
function prepare(raw, base) {
  const entry = {...(base || {}), ...raw};
  if (base) for (const key of ['slug', 'title', 'kind', 'era', 'year']) entry[key] = base[key];
  if (base) entry.sources = [...base.sources, ...(raw.sources || [])];
  entry.sources = [...new Map((entry.sources || []).filter(s => s?.url).map(s => [s.url, {title: String(s.title || s.url).slice(0, 200), url: s.url}])).values()].slice(0, 12);
  entry.related = [...new Set([...(base?.related || []), ...(raw.related || [])])].filter(slug => allSlugs.has(slug) && slug !== entry.slug).slice(0, 24);
  entry.images = (raw.images || []).map(image => ({file: String(image.file || '').trim(), caption: String(image.caption || '').trim().slice(0, 250)}))
    .filter(image => image.file.length <= 214 && commons.has(image.file) && image.caption && !/[\\/:?#]/.test(image.file) && /\.(jpe?g|png|webp)$/i.test(image.file))
    .slice(0, 8).map(image => ({...image, ...commons.get(image.file)}));
  entry.paragraphs = (entry.paragraphs || []).map(p => String(p).trim()).filter(Boolean).slice(0, 12).map(p => p.slice(0, 3000));
  entry.summary = String(entry.summary || '').trim().slice(0, 700);
  entry.period = String(entry.period || '').trim().slice(0, 180);
  entry.certainty = String(entry.certainty || '').trim().slice(0, 150);
  entry.location = String(entry.location || '').trim().slice(0, 120);
  entry.isPublished = true;
  delete entry.hideImages;
  const text = [entry.summary, ...entry.paragraphs].join(' ');
  if (arabicIndic.test(text)) throw new Error('Arabic-Indic digits');
  if (/يحتاج إلى إضافة|يعرض هذا المدخل خلفية تمهيدية/.test(text)) throw new Error('placeholder text left');
  if (entry.paragraphs.join('').length < (base ? 1200 : 1000)) throw new Error(`too short (${entry.paragraphs.join('').length})`);
  return validateHistoryEntry(entry);
}

const overrides = new Map();
for (const raw of enriched) {
  const base = starter.get(raw.slug);
  if (!base) { problems.push(`${raw.slug}: not a starter entry`); continue; }
  try { overrides.set(raw.slug, prepare(raw, base)); } catch (error) { problems.push(`${raw.slug}: ${error.message}`); }
}
const titles = new Set(historyStarter.map(entry => entry.title.trim()));
for (const raw of added) {
  if (starter.has(raw.slug) || overrides.has(raw.slug)) { problems.push(`${raw.slug}: duplicate slug`); continue; }
  if (titles.has(String(raw.title || '').trim())) { problems.push(`${raw.slug}: duplicate title`); continue; }
  try { overrides.set(raw.slug, prepare(raw, null)); titles.add(raw.title.trim()); } catch (error) { problems.push(`${raw.slug}: ${error.message}`); }
}
const list = [...overrides.values()];
const report = {enriched: list.filter(e => starter.has(e.slug)).length, added: list.filter(e => !starter.has(e.slug)).length,
  images: list.reduce((n, e) => n + e.images.length, 0), entries_with_images: list.filter(e => e.images.length).length,
  commons_checked: files.length, commons_valid: commons.size, problems};
writeFileSync(new URL('apply-report.json', dir), JSON.stringify(report, null, 1));
console.log(JSON.stringify({...report, problems: problems.length}));
for (const p of problems.slice(0, 30)) console.log(' - ' + p);

if (write) {
  if (list.length > 480) throw new Error('More than 480 overrides.');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
  const {data: users} = await db.auth.admin.listUsers({perPage: 1000});
  const actor = users.users.find(user => user.email === process.env.SITE_ADMIN_EMAIL)?.id;
  const current = await readHistoryCatalog(db);
  // Keep any entry an editor saved that this campaign does not replace.
  for (const item of current.overrides) if (!overrides.has(item.slug)) overrides.set(item.slug, item);
  const stamp = new Date(Math.max(Date.now(), current.revision ? Date.parse(current.revision) + 1 : 0)).toISOString();
  const record = {key: HISTORY_CATALOG_KEY, value: {version: 1, entries: [...overrides.values()], editedBy: actor, editedAt: stamp}, updated_at: stamp};
  const query = current.exists
    ? db.from('site_settings').update(record).eq('key', HISTORY_CATALOG_KEY).eq('updated_at', current.revision)
    : db.from('site_settings').insert(record);
  const {data, error} = await query.select('updated_at').maybeSingle();
  if (error || !data) throw new Error('Save failed: ' + (error?.message || 'revision changed'));
  console.log(`saved ${overrides.size} catalog entries at ${data.updated_at}`);
}
