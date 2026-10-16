import {authorizeRankingEditor, isRankingId, rankingFailure, rankingJson} from '@/lib/rankingAdmin';
import {fetchWorldBankDataset} from '@/lib/rankingProvider';
import {getRankingSnapshotSummary} from '@/lib/rankings';
import {isMissingRankingSchema, rankingIndicatorFields} from '@/lib/rankingRepository';
import {readJsonObject, RequestValidationError} from '@/lib/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  const auth = await authorizeRankingEditor(request); if (auth.error) return auth.error;
  try {
    const {id} = await readJsonObject(request, 2000);
    if (!isRankingId(id)) throw new RequestValidationError('معرّف المؤشر غير صالح.');
    const initial = await auth.db.from('ranking_indicators').select(rankingIndicatorFields).eq('id', id).maybeSingle();
    if (isMissingRankingSchema(initial.error)) return rankingFailure('يلزم تشغيل supabase/yemen-ranking.sql أولاً.', 503);
    if (initial.error) throw initial.error;
    if (!initial.data) return rankingFailure('المؤشر غير موجود.', 404);
    const dataset = await fetchWorldBankDataset(initial.data.code);
    const current = await auth.db.from('ranking_indicators').select(rankingIndicatorFields).eq('id', id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data || current.data.code !== initial.data.code) return rankingFailure('تغير رمز المؤشر أثناء الجلب. أعد المحاولة باستخدام النسخة الحالية.', 409);
    const summary = {...getRankingSnapshotSummary(dataset), indicatorCode: dataset.indicatorCode};
    const result = await auth.db.from('ranking_snapshots').upsert({indicator_id: id, payload: dataset, summary}, {onConflict: 'indicator_id'}).select('updated_at').single();
    if (isMissingRankingSchema(result.error)) return rankingFailure('جدول بيانات الترتيب غير مفعّل. شغّل ملف الإعداد أولاً.', 503);
    if (result.error) throw result.error;
    // Refresh updates the snapshot only, never the publication flag or the
    // indicator's editorial timestamp. A withdrawn indicator remains withdrawn.
    const snapshot = {...summary, updatedAt: result.data.updated_at};
    return rankingJson({ok: true, indicator: {...current.data, snapshot}, snapshot});
  } catch (error) {
    if (error instanceof RequestValidationError) return rankingFailure(error.message, error.status);
    console.error('ranking snapshot refresh failed', error?.code || error?.name || 'provider');
    return rankingFailure('تعذر تحديث البيانات من البنك الدولي. تبقى آخر نسخة محفوظة متاحة إن وجدت.', 503);
  }
}
