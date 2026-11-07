// Scans the public Yemeni commercial directory of the Federation of Yemeni Chambers of Commerce and Industry
// (fycci-ye.org, ?act=dalil&did=N) and saves each listing's public fields.
// Usage: node scripts/scan-fycci-directory-2026-11.mjs <from> <to>   (resumable; polite: 6 parallel requests)
// Output: data/yemeni-companies/fycci-directory-2026-11.json
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const [from = 1, to = 6000] = process.argv.slice(2).map(Number);
const file = new URL('../data/yemeni-companies/fycci-directory-2026-11.json', import.meta.url);
const store = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const labels = ['الاسم التجاري', 'المالك', 'الفئة', 'السلع', 'وصف النشاط', 'المحافظة', 'المديرية', 'العنوان', 'رقم التلفون', 'هل ترغب بتحديث بياناتك؟'];
const keys = {'الاسم التجاري': 'name', 'المالك': 'owner', 'الفئة': 'category', 'السلع': 'goods', 'وصف النشاط': 'activity', 'المحافظة': 'governorate', 'المديرية': 'district', 'العنوان': 'address', 'رقم التلفون': 'phone'};

function parse(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const start = text.lastIndexOf('ارسال بياناتك');
  if (start < 0) return null;
  const body = text.slice(start);
  const out = {};
  for (let i = 0; i < labels.length - 1; i++) {
    const a = body.indexOf(' ' + labels[i] + ' ');
    if (a < 0) continue;
    let end = body.length;
    for (const next of labels.slice(i + 1)) { const b = body.indexOf(' ' + next, a + labels[i].length + 1); if (b > 0) { end = b; break; } }
    out[keys[labels[i]]] = body.slice(a + labels[i].length + 2, end).trim();
  }
  return out.name ? out : null;
}

const ids = [];
for (let id = from; id <= to; id++) if (store[id] === undefined) ids.push(id);
let cursor = 0, found = 0;
async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    let record = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://fycci-ye.org/?act=dalil&did=${id}`, {headers: {'User-Agent': '967ye-content-bot/1.0 (https://967ye.com)'}, signal: AbortSignal.timeout(25000)});
        if (response.ok) { record = parse(await response.text()); break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
    store[id] = record || 0;
    if (record) found++;
    if ((cursor % 200) === 0) writeFileSync(file, JSON.stringify(store));
  }
}
await Promise.all(Array.from({length: 6}, worker));
writeFileSync(file, JSON.stringify(store));
const all = Object.values(store).filter(Boolean);
const cats = {}; for (const r of all) cats[r.category] = (cats[r.category] || 0) + 1;
console.log(`scanned ${ids.length}, found now ${found}, total listings ${all.length}`, JSON.stringify(cats));
