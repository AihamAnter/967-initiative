// Read-only: writes the research input for the Yemeni-figures campaign — every figure whose long profile
// is under 2,000 characters, with its record and current profile — split into 8 files, plus an index of all names.
import {createClient} from '@supabase/supabase-js';
import {writeFileSync} from 'node:fs';
import {readFigureProfile} from '../lib/figureProfileRepository.js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const dir = new URL('../data/yemeni-figures/campaign-2026-11/', import.meta.url);
const {data: rows, error} = await db.from('yemeni_figures').select('*').order('display_order');
if (error) throw error;
const index = rows.map(r => ({slug: r.slug, full_name: r.full_name, field: r.field, era: r.era}));
writeFileSync(new URL('index.json', dir), JSON.stringify(index, null, 1));
const thin = [];
for (const row of rows) {
  const profile = await readFigureProfile(db, row);
  const chars = profile ? profile.sections.reduce((n, s) => n + s.paragraphs.join('').length, 0) : 0;
  if (chars >= 2000) continue;
  thin.push({record: {slug: row.slug, full_name: row.full_name, known_for: row.known_for, field: row.field, era: row.era,
    governorate_id: row.governorate_id, birth_year: row.birth_year, death_year: row.death_year, short_bio: row.short_bio}, profile});
}
const parts = 8, size = Math.ceil(thin.length / parts);
for (let i = 0; i < parts; i++) writeFileSync(new URL(`enrich-input-${i + 1}.json`, dir), JSON.stringify(thin.slice(i * size, (i + 1) * size), null, 1));
console.log('thin', thin.length, 'per part', size);
