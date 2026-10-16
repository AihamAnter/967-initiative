// Read-only anonymous probes. No service-role key, mutations, or record values.
import {writeFile} from 'node:fs/promises';
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Anonymous Supabase configuration is missing');
const probes = [
  ['messages', 'select=id&limit=1'], ['editors', 'select=user_id&limit=1'],
  ...['works', 'issues', 'yemeni_companies', 'professionals', 'yemeni_figures', 'stat_sections', 'stat_domains', 'stat_indicators', 'stat_values'].map(table => [table, 'select=id&is_published=eq.false&limit=1']),
  ['stat_sources', 'select=id&is_active=eq.false&limit=1'],
];
const results = [];
for (const [table, query] of probes) {
  try {
    const response = await fetch(`${base}/rest/v1/${table}?${query}`, {
      headers: {apikey: key, Authorization: `Bearer ${key}`}, signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    results.push({table, status: response.status, visibleRows: Array.isArray(data) ? data.length : null, safe: response.status === 401 || response.status === 403 || (response.ok && Array.isArray(data) && data.length === 0)});
  } catch (error) { results.push({table, status: null, safe: null, error: error.name}); }
}
const report = {checkedAt: new Date().toISOString(), credentials: 'anonymous key only', methods: ['GET'], note: 'Negative visibility only. No account or record data included. No write-permission claim.', results};
await writeFile('docs/audit/live-anonymous-rls.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
