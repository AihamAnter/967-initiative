// Yemen ranking — November 2026 expansion and refresh.
//   --new      add the indicators of data/rankings/expansion-2026-11.mjs as drafts with a database snapshot.
//   --refresh  store a fresh database snapshot for every existing ranking indicator.
//   --publish  publish the new drafts that have a description (run after the descriptions are written).
// Without --write it only reports.
import {createClient} from '@supabase/supabase-js';
import {writeFileSync} from 'node:fs';
import {fetchWorldBankDataset} from '../lib/rankingProvider.js';
import {getRankingSnapshotSummary} from '../lib/rankings.js';
import {rankingExpansion} from '../data/rankings/expansion-2026-11.mjs';

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth: {persistSession: false}});
const must = async (query, label) => { const {data, error} = await query; if (error) throw new Error(label + ': ' + error.message); return data; };
const existing = await must(db.from('ranking_indicators').select('id,slug,code,display_order,description,is_published'), 'indicators');
const report = {checked_at: new Date().toISOString(), write, added: [], refreshed: [], skipped: []};

async function dataset(code) {
  for (let attempt = 1; ; attempt++) {
    try { return await fetchWorldBankDataset(code); } catch (error) { if (attempt >= 3) throw error; await new Promise(r => setTimeout(r, 1500 * attempt)); }
  }
}
function coverage(data) {
  const yemen = data.values.filter(row => row.country === 'YEM');
  const latest = yemen.length ? Math.max(...yemen.map(row => row.year)) : null;
  const peers = latest ? data.values.filter(row => row.year === latest).length : 0;
  return {latest, peers};
}
const snapshot = data => ({payload: data, summary: {...getRankingSnapshotSummary(data), indicatorCode: data.indicatorCode}});

if (args.has('--new')) {
  let order = Math.max(...existing.map(row => row.display_order || 0));
  const slugs = new Set(existing.map(row => row.slug)), codes = new Set(existing.map(row => row.code));
  for (const [slug, name, category, unit, code, better] of rankingExpansion) {
    try {
      if (slugs.has(slug) || codes.has(code)) throw new Error('already in the catalog');
      const data = await dataset(code);
      const {latest, peers} = coverage(data);
      if (!latest || latest < 2010) throw new Error(`Yemen latest ${latest}`);
      if (peers < 50) throw new Error(`only ${peers} countries in ${latest}`);
      if (write) {
        const row = await must(db.from('ranking_indicators').insert({
          slug, name, category, unit, code, better, direction: better === 'lower' ? 'asc' : 'desc',
          description: '', display_order: ++order, is_published: false,
        }).select('id').single(), `insert ${slug}`);
        await must(db.from('ranking_snapshots').insert({indicator_id: row.id, ...snapshot(data)}), `snapshot ${slug}`);
      }
      report.added.push({slug, code, name, unit, category, better, yemen_latest: latest, countries: peers, en_name: data.source?.name, en_note: data.source?.sourceNote || ''});
      console.log(`${write ? 'added' : 'ok'} ${slug}: Yemen ${latest}, ${peers} countries`);
    } catch (error) { report.skipped.push({slug, code, reason: error.message}); console.log(`skip ${slug}: ${error.message}`); }
  }
}

if (args.has('--refresh')) {
  for (const row of existing) {
    try {
      const data = await dataset(row.code);
      const {latest, peers} = coverage(data);
      if (write) await must(db.from('ranking_snapshots').upsert({indicator_id: row.id, ...snapshot(data)}, {onConflict: 'indicator_id'}), `snapshot ${row.slug}`);
      report.refreshed.push({slug: row.slug, yemen_latest: latest, countries: peers});
      console.log(`${write ? 'refreshed' : 'ok'} ${row.slug}: Yemen ${latest}, ${peers} countries`);
    } catch (error) { report.skipped.push({slug: row.slug, reason: error.message}); console.log(`skip ${row.slug}: ${error.message}`); }
  }
}

if (args.has('--publish')) {
  const drafts = existing.filter(row => !row.is_published && row.description.trim().length >= 300 && rankingExpansion.some(item => item[0] === row.slug));
  if (write) for (const row of drafts) await must(db.from('ranking_indicators').update({is_published: true}).eq('id', row.id), `publish ${row.slug}`);
  console.log(`${write ? 'published' : 'would publish'} ${drafts.length}`);
}

writeFileSync(new URL(`../docs/yemen-ranking-expansion-2026-11${write ? '' : '-dry-run'}.json`, import.meta.url), JSON.stringify(report, null, 1));
console.log(`added ${report.added.length}, refreshed ${report.refreshed.length}, skipped ${report.skipped.length}`);
