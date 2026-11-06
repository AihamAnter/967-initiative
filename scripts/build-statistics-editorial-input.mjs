// Builds the input for the Yemen-in-numbers editorial pass: every published indicator with its
// World Bank metadata (English name, definition, source) and the computed key points of its series.
// Output: data/statistics/editorial-input-2026-11.json (read-only on the database).
import {createClient} from '@supabase/supabase-js';
import {writeFileSync} from 'node:fs';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const must = async (query, label) => { const {data, error} = await query; if (error) throw new Error(label + ': ' + error.message); return data; };

const indicators = await must(db.from('stat_indicators').select('id,slug,name,unit,improvement_direction,domain:stat_domains(slug,name,section:stat_sections(name))').eq('is_published', true), 'indicators');
const codes = await must(db.from('stat_indicator_sources').select('indicator_id,series_label'), 'codes');
const editorial = new Set((await must(db.from('stat_indicator_editorial').select('indicator_id'), 'editorial')).map(row => row.indicator_id));
const codeOf = new Map(codes.map(row => [row.indicator_id, row.series_label]));

async function meta(code, attempt = 1) {
  try {
    const response = await fetch(`https://api.worldbank.org/v2/indicator/${code}?format=json`);
    const payload = await response.json();
    const item = payload?.[1]?.[0];
    return item ? {en_name: item.name, en_definition: item.sourceNote || '', en_source: item.sourceOrganization || ''} : {};
  } catch (error) {
    if (attempt >= 3) return {};
    await new Promise(resolve => setTimeout(resolve, 600 * attempt));
    return meta(code, attempt + 1);
  }
}

const out = [];
for (const indicator of indicators) {
  const values = await must(db.from('stat_values').select('year,value').eq('indicator_id', indicator.id).eq('is_published', true).order('year'), 'values');
  const code = codeOf.get(indicator.id) || null;
  const first = values[0], latest = values.at(-1);
  const pick = year => values.find(row => row.year === year);
  out.push({
    slug: indicator.slug, code, name: indicator.name, unit: indicator.unit, direction: indicator.improvement_direction,
    section: indicator.domain?.section?.name, domain: indicator.domain?.name, has_editorial: editorial.has(indicator.id),
    values: values.length, first, latest,
    key_points: [first, pick(2000), pick(2010), pick(2014), pick(2015), pick(2020), latest].filter(Boolean)
      .filter((row, index, all) => all.findIndex(other => other.year === row.year) === index),
    ...(code ? await meta(code) : {}),
  });
}
writeFileSync(new URL('../data/statistics/editorial-input-2026-11.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('indicators', out.length, 'without editorial', out.filter(row => !row.has_editorial).length, 'with WB definition', out.filter(row => row.en_definition).length);
