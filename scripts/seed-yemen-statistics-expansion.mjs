// Yemen in numbers — November 2026 expansion.
// Probes every candidate World Bank series for Yemen and keeps those with at least three yearly values
// since 1990. Without --write it only reports; with --write it upserts indicators, sources and values.
// Existing indicators (same World Bank code or slug) are never overwritten.
import {createClient} from '@supabase/supabase-js';
import {writeFileSync} from 'node:fs';
import {expansionCandidates} from '../data/statistics/expansion-2026-11.mjs';

const write = process.argv.includes('--write');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase environment variables are missing.');
const db = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});

// Same source groups as scripts/seed-yemen-statistics.mjs; rows already exist and are matched by name.
const sourceNames = {
  nationalAccounts: 'البنك الدولي - الحسابات القومية',
  economy: 'البنك الدولي - مؤشرات الاقتصاد والتمويل',
  labor: 'منظمة العمل الدولية عبر البنك الدولي',
  population: 'الأمم المتحدة - بيانات السكان عبر البنك الدولي',
  education: 'معهد اليونسكو للإحصاء عبر البنك الدولي',
  health: 'منظمة الصحة العالمية وشركاؤها عبر البنك الدولي',
  infrastructure: 'البنك الدولي - مؤشرات البنية التحتية والاتصالات',
  energy: 'البنك الدولي - قاعدة الوصول إلى الكهرباء SDG7',
  agriculture: 'البنك الدولي - مؤشرات الزراعة والحسابات القومية',
  environmentFao: 'منظمة الأغذية والزراعة عبر البنك الدولي',
  environment: 'البنك الدولي - مؤشرات البيئة والمناخ',
  displacement: 'مركز رصد النزوح الداخلي IDMC عبر البنك الدولي',
  conflict: 'مصادر النزاع والأمن عبر البنك الدولي',
  aid: 'لجنة المساعدة الإنمائية عبر البنك الدولي',
  governance: 'مؤشرات الحوكمة العالمية WGI',
  tourism: 'منظمة الأمم المتحدة للسياحة عبر البنك الدولي',
  innovation: 'المنظمة العالمية للملكية الفكرية عبر البنك الدولي',
  enterprise: 'مسوح المنشآت للبنك الدولي',
};

async function must(query, label) {
  const {data, error} = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function fetchSeries(code, attempt = 1) {
  const endpoint = `https://api.worldbank.org/v2/country/YEM/indicator/${code}?format=json&per_page=200`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
    return payload[1]
      .filter(row => row.value !== null && Number(row.date) >= 1990)
      .map(row => ({year: Number(row.date), value: Number(row.value)}))
      .sort((a, b) => a.year - b.year);
  } catch (error) {
    if (attempt >= 3) throw new Error(`World Bank ${code}: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 800 * attempt));
    return fetchSeries(code, attempt + 1);
  }
}

const domains = await must(db.from('stat_domains').select('id,slug'), 'domains');
const domainIds = new Map(domains.map(domain => [domain.slug, domain.id]));
const sources = await must(db.from('stat_sources').select('id,name'), 'sources');
const sourceIds = new Map(sources.map(source => [source.name, source.id]));
const existingCodes = new Set((await must(db.from('stat_indicator_sources').select('series_label'), 'codes')).map(row => row.series_label));
const existingSlugs = new Set((await must(db.from('stat_indicators').select('slug'), 'slugs')).map(row => row.slug));

const report = {checked_at: new Date().toISOString(), write, added: [], skipped: []};
const seen = new Set();
for (const [code, domain, slug, name, unit, direction, chart, sourceKey] of expansionCandidates) {
  try {
    if (seen.has(code) || existingCodes.has(code)) throw new Error('already in the catalog');
    if (existingSlugs.has(slug)) throw new Error('slug already used');
    seen.add(code);
    const domainId = domainIds.get(domain);
    if (!domainId) throw new Error(`unknown domain ${domain}`);
    const sourceId = sourceIds.get(sourceNames[sourceKey]);
    if (!sourceId) throw new Error(`unknown source ${sourceKey}`);
    const series = await fetchSeries(code);
    if (series.length < 3) throw new Error(`only ${series.length} yearly values`);
    const entry = {code, domain, slug, name, values: series.length, first: series[0].year, latest: series.at(-1).year};
    if (write) {
      const method = `بيانات وطنية لليمن منشورة عبر World Bank Open Data تحت الرمز ${code}. قد تراجع الجهة الناشرة القيم التاريخية عند تحديث منهجيتها أو مصادرها.`;
      const saved = await must(db.from('stat_indicators').insert({
        domain_id: domainId, slug, name,
        short_description: `سلسلة سنوية وطنية لليمن حول ${name}. تعرض السنوات المتاحة فقط دون استكمال الفجوات.`,
        definition: `يقيس هذا المؤشر ${name} وفقا لتعريف الجهة الناشرة للسلسلة.`,
        unit, improvement_direction: direction, measurement_method: method,
        data_status: series.length < 5 ? 'limited' : 'partial', chart_type: chart,
        adopted_source_id: sourceId, is_published: true, hide_when_incomplete: false,
      }).select('id').single(), `indicator ${code}`);
      await must(db.from('stat_indicator_sources').insert({
        indicator_id: saved.id, source_id: sourceId, series_label: code, methodology: method, is_adopted: true,
      }), `indicator source ${code}`);
      const documentUrl = `https://data.worldbank.org/indicator/${code}?locations=YE`;
      await must(db.from('stat_values').insert(series.map(row => ({
        indicator_id: saved.id, source_id: sourceId, year: row.year, value: row.value, document_url: documentUrl,
        publication_date: null, national_scope: true,
        methodology_note: `قيمة منشورة في World Bank API للمؤشر ${code}. مصنفة هنا كتقديرية وقابلة للمراجعة.`,
        value_status: 'estimated', is_published: true,
      }))), `values ${code}`);
    }
    report.added.push(entry);
    console.log(`${write ? 'added' : 'ok'} ${code}: ${series.length} values (${entry.first}–${entry.latest})`);
  } catch (error) {
    report.skipped.push({code, slug, reason: error.message});
  }
}
report.added_values = report.added.reduce((sum, row) => sum + row.values, 0);
writeFileSync(new URL(`../docs/yemen-in-numbers-expansion-2026-11${write ? '' : '-dry-run'}.json`, import.meta.url), JSON.stringify(report, null, 1));
console.log(`\n${write ? 'Written' : 'Would add'}: ${report.added.length} indicators, ${report.added_values} yearly values. Skipped: ${report.skipped.length}.`);
