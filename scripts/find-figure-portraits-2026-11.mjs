// Finds freely licensed portraits for Yemeni figures without an image: searches Wikidata by Arabic and
// English name, accepts only humans (Q5) linked to Yemen (citizenship Q805 or a Yemen-related description),
// takes their image (P18) and verifies author and licence on Commons.
// Input: data/yemeni-figures/campaign-2026-11/index.json (+ add-output-*.json for new figures).
// Output: data/yemeni-figures/campaign-2026-11/portraits.json — {slug: {image_url, image_credit, image_source_url}}.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';

const dir = new URL('../data/yemeni-figures/campaign-2026-11/', import.meta.url);
const ua = {'User-Agent': '967ye-content-bot/1.0 (https://967ye.com)'};
const get = async url => { for (let i = 0; i < 3; i++) { try { const r = await fetch(url, {headers: ua}); if (r.ok) return r.json(); } catch {} await new Promise(r => setTimeout(r, 1200 * (i + 1))); } return null; };
const strip = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const {data: rows} = await db.from('yemeni_figures').select('slug,full_name,image_url');
const people = rows.filter(r => !r.image_url).map(r => ({slug: r.slug, name: r.full_name}));
for (let n = 1; n <= 4; n++) {
  const file = new URL(`add-output-${n}.json`, dir);
  if (existsSync(file)) for (const item of JSON.parse(readFileSync(file, 'utf8'))) people.push({slug: item.record.slug, name: item.record.full_name});
}
const done = existsSync(new URL('portraits.json', dir)) ? JSON.parse(readFileSync(new URL('portraits.json', dir), 'utf8')) : {};
const yemenWords = /yemen|يمن|hadhram|حضرم|aden|عدن|sanaa|صنعاء/i;
let checked = 0;
for (const person of people) {
  if (done[person.slug] !== undefined) continue;
  checked++;
  done[person.slug] = null;
  const search = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=ar&uselang=ar&limit=5&search=${encodeURIComponent(person.name)}`);
  for (const hit of search?.search || []) {
    const entity = (await get(`https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`))?.entities?.[hit.id];
    const claims = entity?.claims || {};
    const ids = prop => (claims[prop] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    if (!ids('P31').includes('Q5')) continue;
    const description = [entity.descriptions?.ar?.value, entity.descriptions?.en?.value].join(' ');
    if (!ids('P27').includes('Q805') && !yemenWords.test(description)) continue;
    const file = claims.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!file) break;
    const info = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent('File:' + file)}`);
    const meta = Object.values(info?.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
    const license = strip(meta.LicenseShortName?.value);
    if (!license || !/cc|public domain|pd/i.test(license)) break;
    done[person.slug] = {
      image_url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`,
      image_credit: `${strip(meta.Artist?.value) || 'مستخدم ويكيميديا كومنز'} — ${license}، عبر ويكيميديا كومنز`.slice(0, 2000),
      image_source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
      wikidata: hit.id,
    };
    break;
  }
  if (checked % 20 === 0) writeFileSync(new URL('portraits.json', dir), JSON.stringify(done, null, 1));
}
writeFileSync(new URL('portraits.json', dir), JSON.stringify(done, null, 1));
console.log('people without image', people.length, 'checked now', checked, 'portraits found', Object.values(done).filter(Boolean).length);
