// Applies the November 2026 Yemeni-products campaign.
//  enrich-output-*.json — fills empty/template fields of existing companies; keeps every existing product and source.
//  add-output-*.json    — inserts new producers (published), skipping names already present.
// Company-level sources are attached to the first product (the page lists sources from products).
// Proposed Commons images are verified (exists + free licence) before use. Add --write to save.
import {createClient} from '@supabase/supabase-js';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const write = process.argv.includes('--write');
const dir = new URL('../data/yemeni-companies/campaign-2026-11/', import.meta.url);
const read = name => existsSync(new URL(name, dir)) ? JSON.parse(readFileSync(new URL(name, dir), 'utf8')) : [];
const enriched = [1, 2, 3, 4].flatMap(n => read(`enrich-output-${n}.json`));
const added = [1, 2, 3].flatMap(n => read(`add-output-${n}.json`));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const ua = {'User-Agent': '967ye-content-bot/1.0 (https://967ye.com)'};
const arabicIndic = /[٠-٩۰-۹]/;
const categories = ['أغذية ومشروبات', 'صناعات تحويلية', 'زراعة وثروة حيوانية', 'مواد بناء', 'أدوية وصحة', 'عناية وعطور', 'أثاث وديكور', 'طاقة ومياه', 'حرف ومنسوجات'];
const norm = t => String(t || '').replace(/[ً-ْ]/g, '').replace(/[أإآ]/g, 'ا').replace(/[ةه]/g, 'ه').replace(/ى/g, 'ي').replace(/(شركه|مصنع|معمل|مؤسسه|المحدوده|للتجاره|والصناعه|وشركاه|ال)/g, '').replace(/\s+/g, '');
const https = u => typeof u === 'string' && /^https?:\/\/[^\s]+$/.test(u.trim()) ? u.trim() : null;
const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const problems = [];

// Verify proposed Commons images.
const files = [...new Set([...enriched, ...added].map(item => item.image?.file?.trim()).filter(Boolean))];
const valid = new Set();
for (let i = 0; i < files.length; i += 40) {
  const titles = files.slice(i, i + 40).map(f => 'File:' + f).join('|');
  const data = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(titles)}`, {headers: ua})).json();
  const normalized = new Map((data.query?.normalized || []).map(r => [r.to, r.from]));
  for (const page of Object.values(data.query?.pages || {})) {
    const license = String(page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || '');
    if (page.missing === undefined && /cc|public domain|pd/i.test(license)) valid.add((normalized.get(page.title) || page.title).replace(/^File:/, ''));
  }
}
const imageUrl = item => { const f = item.image?.file?.trim(); return f && valid.has(f) ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=960` : null; };

function cleanSources(list) {
  return (list || []).map(s => ({url: https(s?.url), title: clean(s?.title, 250) || 'مصدر', type: clean(s?.type, 40) || 'press', reviewedAt: clean(s?.reviewedAt, 10) || '2026-11-07'})).filter(s => s.url);
}
function mergeProducts(existing, incoming, companySources) {
  const out = (existing || []).map(p => ({...p, sources: [...(p.sources || [])]}));
  for (const p of incoming || []) {
    const name = clean(p?.name, 160); if (!name) continue;
    const found = out.find(x => norm(x.name) === norm(name));
    const sources = cleanSources(p.sources);
    if (found) {
      if (!found.description && p.description) found.description = clean(p.description, 800);
      if (!found.format && p.format) found.format = clean(p.format, 160);
      for (const s of sources) if (!found.sources.some(x => x.url === s.url)) found.sources.push(s);
    } else out.push({name, description: clean(p.description, 800), format: clean(p.format, 160), sources});
  }
  if (out.length) for (const s of cleanSources(companySources)) if (!out.some(p => p.sources.some(x => x.url === s.url))) out[0].sources.push(s);
  return out;
}
const isTemplate = text => !text || /تورد سجلات اتحاد الغرف|بيانات تعريفية تستند إلى الإدراج|نشاطها الموثق:/.test(text);
const text = (row, item) => [item.summary, item.story, item.impact, ...(item.strengths || []), ...(item.markets || [])].join(' ');

const {data: rows, error} = await db.from('yemeni_companies').select('*');
if (error) throw error;
const bySlug = new Map(rows.map(r => [r.slug, r]));
const names = new Set(rows.map(r => norm(r.name)));
const done = {updated: 0, inserted: 0, images: 0};

for (const item of enriched) {
  const row = bySlug.get(item.slug);
  if (!row) { problems.push(`${item.slug}: unknown`); continue; }
  if (arabicIndic.test(text(row, item))) { problems.push(`${item.slug}: Arabic-Indic digits`); continue; }
  const patch = {};
  const fill = (key, value, max) => { const v = clean(value, max); if (v && (!row[key] || (key === 'story' && isTemplate(row.story)) || (key === 'summary' && isTemplate(row.summary)))) patch[key] = v; };
  fill('summary', item.summary, 400); fill('story', item.story, 2000); fill('impact', item.impact, 1200); fill('founded', item.founded, 80);
  fill('email', item.email, 200); fill('phone', item.phone, 80);
  if (!row.website && https(item.website)) patch.website = https(item.website);
  if (!row.google_maps_url && https(item.google_maps_url) && /google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/.test(item.google_maps_url)) patch.google_maps_url = https(item.google_maps_url);
  if (!row.strengths?.length && item.strengths?.length) patch.strengths = item.strengths.map(s => clean(s, 120)).filter(Boolean).slice(0, 6);
  if (!row.markets?.length && item.markets?.length) patch.markets = item.markets.map(s => clean(s, 80)).filter(Boolean).slice(0, 8);
  const products = mergeProducts(row.products, item.products, item.sources);
  if (JSON.stringify(products) !== JSON.stringify(row.products)) patch.products = products;
  const img = imageUrl(item); if (img && img !== row.image_url) { patch.image_url = img; done.images++; }
  if (!Object.keys(patch).length) continue;
  patch.revision = (row.revision || 1) + 1;
  done.updated++;
  if (write) {
    const {error: e} = await db.from('yemeni_companies').update(patch).eq('id', row.id).eq('revision', row.revision);
    if (e) problems.push(`${item.slug}: ${e.message}`);
  }
}
const slugs = new Set(rows.map(r => r.slug));
for (const item of added) {
  const slug = clean(item.slug, 100), name = clean(item.name, 180);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) { problems.push(`${slug}: bad or existing slug`); continue; }
  if (!name || names.has(norm(name))) { problems.push(`${slug}: name exists`); continue; }
  if (!categories.includes(item.category)) { problems.push(`${slug}: category ${item.category}`); continue; }
  const products = mergeProducts([], item.products, item.sources);
  if (!products.length || !products.some(p => p.sources.length)) { problems.push(`${slug}: no sourced product`); continue; }
  if (arabicIndic.test(text({}, item)) || clean(item.story, 2000).length < 300) { problems.push(`${slug}: text check`); continue; }
  const img = imageUrl(item);
  const record = {
    slug, name, legal_name: clean(item.legal_name, 200), category: item.category, location: clean(item.location, 120) || 'اليمن',
    entity_type: clean(item.entity_type, 60) || 'شركة', scale: '', ownership: '', owner_name: '', ceo_name: '', team_size: '',
    founded: clean(item.founded, 80), address: clean(item.address, 300), website: https(item.website), email: clean(item.email, 200) || null,
    phone: clean(item.phone, 80) || null, google_maps_url: /google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo\.gl/.test(item.google_maps_url || '') ? https(item.google_maps_url) : null,
    summary: clean(item.summary, 400), story: clean(item.story, 2000), impact: clean(item.impact, 1200),
    strengths: (item.strengths || []).map(s => clean(s, 120)).filter(Boolean).slice(0, 6), markets: (item.markets || []).map(s => clean(s, 80)).filter(Boolean).slice(0, 8),
    products, image_url: img || 'https://commons.wikimedia.org/wiki/Special:FilePath/Old%20city%20of%20Sana%27a.jpg?width=960', image_position: 'center', is_published: true,
  };
  slugs.add(slug); names.add(norm(name)); done.inserted++; if (img) done.images++;
  if (write) { const {error: e} = await db.from('yemeni_companies').insert(record); if (e) problems.push(`${slug}: ${e.message}`); }
}
writeFileSync(new URL(`apply-report${write ? '' : '-dry-run'}.json`, dir), JSON.stringify({...done, images_verified: valid.size, problems}, null, 1));
console.log(JSON.stringify(done), write ? 'written' : 'ready', `problems ${problems.length}`);
for (const p of problems.slice(0, 25)) console.log(' - ' + p);
