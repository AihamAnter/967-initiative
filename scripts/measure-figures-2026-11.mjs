// Read-only: measures the Yemeni figures catalog (records and stored long profiles) and writes
// data/yemeni-figures/campaign-2026-11/state.json for the enrichment campaign.
import {createClient} from '@supabase/supabase-js';
import {mkdirSync, writeFileSync} from 'node:fs';
import {readFigureProfile} from '../lib/figureProfileRepository.js';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const {data: rows, error} = await db.from('yemeni_figures').select('*').order('display_order');
if (error) throw error;
const out = [];
for (const row of rows) {
  let profile = null;
  try { profile = await readFigureProfile(db, row); } catch { profile = 'invalid'; }
  const chars = profile && profile !== 'invalid' ? profile.sections.reduce((n, s) => n + s.paragraphs.join('').length, 0) : 0;
  out.push({
    id: row.id, slug: row.slug, full_name: row.full_name, field: row.field, era: row.era, governorate_id: row.governorate_id,
    birth_year: row.birth_year, death_year: row.death_year, known_for: row.known_for, short_bio: row.short_bio,
    published: row.is_published, image: Boolean(row.image_url), image_credit: Boolean(row.image_credit),
    profile: profile === 'invalid' ? 'invalid' : Boolean(profile), profile_chars: chars,
    sections: profile?.sections?.length || 0, timeline: profile?.timeline?.length || 0, works: profile?.works?.length || 0,
    gallery: profile?.gallery?.length || 0, sources: profile?.sources?.length || 0,
  });
}
mkdirSync(new URL('../data/yemeni-figures/campaign-2026-11/', import.meta.url), {recursive: true});
writeFileSync(new URL('../data/yemeni-figures/campaign-2026-11/state.json', import.meta.url), JSON.stringify(out, null, 1));
const n = f => out.filter(f).length;
console.log({total: out.length, published: n(r => r.published), with_image: n(r => r.image), with_profile: n(r => r.profile === true),
  invalid_profile: n(r => r.profile === 'invalid'), rich_profile_2000: n(r => r.profile_chars >= 2000), avg_profile_chars: Math.round(out.reduce((s, r) => s + r.profile_chars, 0) / out.length),
  with_timeline: n(r => r.timeline), with_gallery: n(r => r.gallery), short_bio_avg: Math.round(out.reduce((s, r) => s + (r.short_bio || '').length, 0) / out.length),
  contemporary: n(r => r.era === 'معاصرة'), historical: n(r => r.era === 'تاريخية')});
const fields = {}; for (const r of out) fields[r.field] = (fields[r.field] || 0) + 1;
console.log(Object.entries(fields).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([f, c]) => `${f}:${c}`).join(' | '));
