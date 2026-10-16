import {getRankingSnapshotSummary, isRankingCode, isRankingSlug, validateRankingDataset} from './rankings.js';

export const rankingIndicatorFields = 'id,slug,name,category,unit,code,direction,better,description,display_order,is_published,updated_at';
export const isMissingRankingSchema = error => ['42P01', 'PGRST205'].includes(error?.code);

async function loadCatalogRows(query) {
  const rows = [];
  for (let offset = 0; offset < 5000;) {
    const result = await query().range(offset, offset + 499);
    if (result.error) throw result.error;
    if (!result.data?.length) return rows;
    rows.push(...result.data); offset += result.data.length;
  }
  throw new Error('دليل الترتيب أكبر من الحد المسموح.');
}

function publicIndicator(row) {
  if (!row || !isRankingSlug(row.slug) || !isRankingCode(row.code) || typeof row.name !== 'string' || !row.name.trim() || !['asc', 'desc'].includes(row.direction) || !['higher', 'lower', 'contextual'].includes(row.better) || typeof row.is_published !== 'boolean') throw new Error('بيانات دليل الترتيب غير صالحة.');
  return Object.fromEntries(rankingIndicatorFields.split(',').map(key => [key, row[key] ?? (key === 'description' ? '' : null)]));
}

// Dependency injection keeps authoritative DB-vs-bundle behavior testable without
// accessing a live database or importing server-only code in Node unit tests.
export function createRankingRepository({getDb, defaultIndicators, readBundledDataset}) {
  const bundled = includeDrafts => defaultIndicators.filter(item => includeDrafts || item.is_published).map(item => ({...publicIndicator(item), snapshot: null}));
  async function getRankingCatalog({includeDrafts = false} = {}) {
    const db = getDb();
    if (!db) return {indicators: bundled(includeDrafts), setupRequired: true, mode: 'bundled'};
    let rows;
    try {
      rows = await loadCatalogRows(() => {
        let query = db.from('ranking_indicators').select(rankingIndicatorFields).order('display_order').order('id');
        if (!includeDrafts) query = query.eq('is_published', true);
        return query;
      });
    } catch (error) {
      if (isMissingRankingSchema(error)) return {indicators: bundled(includeDrafts), setupRequired: true, mode: 'bundled'};
      throw error;
    }
    const snapshotResult = await db.from('ranking_snapshots').select('indicator_id,summary,updated_at').in('indicator_id', rows.map(row => row.id));
    if (snapshotResult.error && !isMissingRankingSchema(snapshotResult.error)) throw new Error('تعذر تحميل حالة بيانات الترتيب.');
    const snapshots = new Map((snapshotResult.data || []).map(row => [row.indicator_id, row]));
    return {
      indicators: rows.filter(row => includeDrafts || row.is_published === true).map(row => {
        const indicator = publicIndicator(row);
        const snapshot = snapshots.get(indicator.id);
        // A code edit invalidates the old snapshot summary immediately.
        return {...indicator, snapshot: snapshot?.summary?.indicatorCode === indicator.code ? {...snapshot.summary, updatedAt: snapshot.updated_at} : null};
      }),
      setupRequired: Boolean(snapshotResult.error), mode: 'database',
    };
  }

  async function matchingBundle(indicator) {
    if (!defaultIndicators.some(item => item.slug === indicator.slug && item.code === indicator.code)) return null;
    const dataset = await readBundledDataset(indicator.slug);
    if (!dataset) return null;
    return validateRankingDataset(dataset, indicator.code);
  }

  async function getRankingDataset(indicator) {
    if (!indicator || !isRankingSlug(indicator.slug) || !isRankingCode(indicator.code)) throw new Error('مؤشر الترتيب غير صالح.');
    const db = getDb();
    if (!db || !indicator.id) return matchingBundle(indicator);
    const result = await db.from('ranking_snapshots').select('payload,updated_at').eq('indicator_id', indicator.id).maybeSingle();
    if (result.error) {
      if (isMissingRankingSchema(result.error)) return matchingBundle(indicator);
      throw new Error('تعذر تحميل بيانات الترتيب.');
    }
    // A shipped snapshot is a migration aid only for the exact shipped code and
    // slug. It never resurrects a deleted/hidden catalog entry or another code.
    if (!result.data) return matchingBundle(indicator);
    if (result.data.payload?.indicatorCode !== indicator.code) return null;
    return validateRankingDataset(result.data.payload, indicator.code);
  }
  return {getRankingCatalog, getRankingDataset};
}

export {getRankingSnapshotSummary};
