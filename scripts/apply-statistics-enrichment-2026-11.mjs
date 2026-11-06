// Applies the November 2026 Yemen-in-numbers enrichment.
//   --editorial     definitions + short descriptions for every indicator, and the expanded reading
//                   (stat_indicator_editorial) for indicators that have none yet. Existing readings are kept.
//   --descriptions  section and domain descriptions.
//   --manual        manually researched indicators from data/statistics/manual-2026-11.json.
// Add --write to save; otherwise it only validates and reports.
import {createClient} from '@supabase/supabase-js';
import {existsSync, readFileSync} from 'node:fs';

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const must = async (query, label) => { const {data, error} = await query; if (error) throw new Error(label + ': ' + error.message); return data; };
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const arabicIndic = /[٠-٩۰-۹]/;
const problems = [];
const check = (label, text, max, required = true) => {
  if (typeof text !== 'string' || (required && !text.trim())) { problems.push(`${label}: empty`); return false; }
  if (text.length > max) { problems.push(`${label}: ${text.length} > ${max}`); return false; }
  if (arabicIndic.test(text)) { problems.push(`${label}: Arabic-Indic digits`); return false; }
  return true;
};
const today = new Date().toISOString().slice(0, 10);

if (args.has('--editorial')) {
  const input = new Map(read('data/statistics/editorial-input-2026-11.json').map(row => [row.slug, row]));
  const output = [1, 2, 3, 4].flatMap(n => read(`data/statistics/editorial-2026-11/output-${n}.json`));
  const indicators = new Map((await must(db.from('stat_indicators').select('id,slug'), 'indicators')).map(row => [row.slug, row.id]));
  const withEditorial = new Set((await must(db.from('stat_indicator_editorial').select('indicator_id'), 'editorial')).map(row => row.indicator_id));
  let definitions = 0, readings = 0;
  for (const row of output) {
    const source = input.get(row.slug), id = indicators.get(row.slug);
    if (!source || !id) { problems.push(`${row.slug}: unknown indicator`); continue; }
    const ok = check(`${row.slug}.definition`, row.definition, 700) & check(`${row.slug}.short_description`, row.short_description, 260);
    if (ok) {
      definitions++;
      if (write) await must(db.from('stat_indicators').update({definition: row.definition, short_description: row.short_description}).eq('id', id), `update ${row.slug}`);
    }
    if (source.has_editorial || withEditorial.has(id)) continue;
    const fields = {intro: 1600, why_it_matters: 4000, historical_context: 5000, limitations: 4000, source_notes: 3000};
    if (!Object.entries(fields).every(([field, max]) => check(`${row.slug}.${field}`, row[field], max))) continue;
    if (source.latest && !row.intro.includes(String(source.latest.year))) { problems.push(`${row.slug}.intro: latest year ${source.latest.year} missing`); continue; }
    const links = [];
    if (source.code) {
      links.push({url: `https://data.worldbank.org/indicator/${source.code}?locations=YE`, title: `البنك الدولي — ${source.name} في اليمن`});
      links.push({url: `https://databank.worldbank.org/metadataglossary/world-development-indicators/series/${source.code}`, title: `تعريف المؤشر ${source.code} في قاموس البيانات`});
    }
    readings++;
    if (write) await must(db.from('stat_indicator_editorial').insert({
      indicator_id: id, intro: row.intro, why_it_matters: row.why_it_matters, historical_context: row.historical_context,
      limitations: row.limitations, source_notes: row.source_notes, reference_links: links, reviewed_on: today, is_published: true,
    }), `editorial ${row.slug}`);
  }
  console.log(`editorial: ${definitions} definitions, ${readings} new readings ${write ? 'written' : 'ready'}`);
}

if (args.has('--descriptions')) {
  const rows = read('data/statistics/descriptions-output-2026-11.json');
  let done = 0;
  for (const row of rows) {
    if (!check(`${row.type}:${row.slug}`, row.description, row.type === 'section' ? 460 : 400)) continue;
    done++;
    if (write) await must(db.from(row.type === 'section' ? 'stat_sections' : 'stat_domains').update({description: row.description}).eq('slug', row.slug), `${row.type} ${row.slug}`);
  }
  console.log(`descriptions: ${done}/${rows.length} ${write ? 'written' : 'ready'}`);
}

if (args.has('--manual') && existsSync(new URL('../data/statistics/manual-2026-11.json', import.meta.url))) {
  const rows = read('data/statistics/manual-2026-11.json');
  const domains = new Map((await must(db.from('stat_domains').select('id,slug'), 'domains')).map(row => [row.slug, row.id]));
  const slugs = new Set((await must(db.from('stat_indicators').select('slug'), 'slugs')).map(row => row.slug));
  let added = 0, values = 0;
  for (const row of rows) {
    const domainId = domains.get(row.domain);
    const valid = (row.values || []).filter(v => Number.isInteger(v.year) && v.year >= 1990 && v.year <= 2100 && Number.isFinite(v.value) && /^https?:\/\//.test(v.url || ''));
    if (!domainId) { problems.push(`${row.slug}: unknown domain ${row.domain}`); continue; }
    if (slugs.has(row.slug)) { problems.push(`${row.slug}: already exists`); continue; }
    if (valid.length < 3) { problems.push(`${row.slug}: only ${valid.length} sourced values`); continue; }
    if (!check(`${row.slug}.name`, row.name, 200) || !check(`${row.slug}.definition`, row.definition, 700)) continue;
    added++; values += valid.length;
    if (!write) continue;
    const [source] = await must(db.from('stat_sources').upsert({name: row.source_name, publisher: row.source_publisher || row.source_name, url: row.source_url, description: `مصدر بيانات ${row.name} في اليمن.`, is_active: true}, {onConflict: 'name'}).select('id'), `source ${row.slug}`);
    const method = `قيم سنوية جُمعت يدويا من ${row.source_name}، ولكل قيمة رابط مصدرها. درجة الثقة: ${({official: 'رسمي', international: 'جهة دولية', ngo: 'منظمة غير حكومية', media: 'مصدر إعلامي'})[row.confidence] || 'غير محددة'}.`;
    const saved = await must(db.from('stat_indicators').insert({
      domain_id: domainId, slug: row.slug, name: row.name, short_description: `سلسلة سنوية لليمن حول ${row.name} من ${row.source_name}.`,
      definition: row.definition, unit: row.unit, improvement_direction: row.direction || 'contextual', measurement_method: method,
      data_status: valid.length < 5 ? 'limited' : 'partial', chart_type: row.chart || 'bar', adopted_source_id: source.id, is_published: true, hide_when_incomplete: false,
    }).select('id').single(), `indicator ${row.slug}`);
    await must(db.from('stat_indicator_sources').insert({indicator_id: saved.id, source_id: source.id, series_label: row.slug, methodology: method, is_adopted: true}), `link ${row.slug}`);
    const byYear = new Map(valid.map(v => [v.year, v]));
    await must(db.from('stat_values').insert([...byYear.values()].map(v => ({
      indicator_id: saved.id, source_id: source.id, year: v.year, value: v.value, document_url: v.url, publication_date: null, national_scope: true,
      methodology_note: v.note || `قيمة منقولة من ${row.source_name}.`, value_status: 'estimated', is_published: true,
    }))), `values ${row.slug}`);
  }
  console.log(`manual: ${added} indicators, ${values} values ${write ? 'written' : 'ready'}`);
}

if (args.has('--manual-editorial')) {
  const {indicators: inputs} = read('data/statistics/editorial-2026-11/input-manual.json');
  const {indicators: texts, domains} = read('data/statistics/editorial-2026-11/output-manual.json');
  const ids = new Map((await must(db.from('stat_indicators').select('id,slug'), 'indicators')).map(row => [row.slug, row.id]));
  const withEditorial = new Set((await must(db.from('stat_indicator_editorial').select('indicator_id'), 'editorial')).map(row => row.indicator_id));
  let readings = 0, described = 0;
  for (const row of texts) {
    const source = inputs.find(item => item.slug === row.slug), id = ids.get(row.slug);
    if (!source || !id) { problems.push(`${row.slug}: unknown`); continue; }
    const fields = {definition: 700, short_description: 260, intro: 1600, why_it_matters: 4000, historical_context: 5000, limitations: 4000, source_notes: 3000};
    if (!Object.entries(fields).every(([field, max]) => check(`${row.slug}.${field}`, row[field], max))) continue;
    if (!row.intro.includes(String(source.latest.year))) { problems.push(`${row.slug}.intro: latest year missing`); continue; }
    readings++;
    if (!write) continue;
    await must(db.from('stat_indicators').update({definition: row.definition, short_description: row.short_description}).eq('id', id), `update ${row.slug}`);
    if (!withEditorial.has(id)) await must(db.from('stat_indicator_editorial').insert({
      indicator_id: id, intro: row.intro, why_it_matters: row.why_it_matters, historical_context: row.historical_context,
      limitations: row.limitations, source_notes: row.source_notes, reviewed_on: today, is_published: true,
      reference_links: source.source_urls.map((url, index) => ({url, title: `${source.source_name} — مرجع ${index + 1}`})),
    }), `editorial ${row.slug}`);
  }
  for (const row of domains) {
    if (!check(`domain:${row.slug}`, row.description, 400)) continue;
    described++;
    if (write) await must(db.from('stat_domains').update({description: row.description}).eq('slug', row.slug), `domain ${row.slug}`);
  }
  console.log(`manual editorial: ${readings} readings, ${described} domain descriptions ${write ? 'written' : 'ready'}`);
}

if (problems.length) { console.log(`\n${problems.length} problems:`); for (const problem of problems.slice(0, 60)) console.log(' - ' + problem); }
