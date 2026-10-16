import {getRankingCatalog} from '@/lib/rankingData';
import {defaultRankingIndicators} from '@/lib/rankingCatalog';
import {authorizeRankingEditor, isRankingId, rankingFailure, rankingJson, validateRankingIndicator} from '@/lib/rankingAdmin';
import {isMissingRankingSchema, rankingIndicatorFields} from '@/lib/rankingRepository';
import {readJsonObject, RequestValidationError} from '@/lib/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = await authorizeRankingEditor(request); if (auth.error) return auth.error;
  try {
    const catalog = await getRankingCatalog({includeDrafts: true});
    return rankingJson({...catalog, library: defaultRankingIndicators});
  } catch (error) {
    console.error('ranking admin read failed', error?.code || error?.name || 'service');
    return rankingFailure('تعذر تحميل إدارة الترتيب حالياً.', 503);
  }
}

export async function POST(request) {
  const auth = await authorizeRankingEditor(request); if (auth.error) return auth.error;
  try {
    const body = await readJsonObject(request, 12000);
    const payload = validateRankingIndicator(body.indicator);
    const id = body.indicator.id;
    if (id !== undefined && id !== null && !isRankingId(id)) throw new RequestValidationError('معرّف المؤشر غير صالح.');
    const expected = body.expectedUpdatedAt;
    if (expected !== undefined && (!id || typeof expected !== 'string' || expected.length > 50 || !Number.isFinite(Date.parse(expected)))) throw new RequestValidationError('تاريخ نسخة المؤشر غير صالح.');
    let query = id ? auth.db.from('ranking_indicators').update(payload).eq('id', id) : auth.db.from('ranking_indicators').insert(payload);
    if (id && expected) query = query.eq('updated_at', expected);
    const result = await query.select(rankingIndicatorFields).maybeSingle();
    if (isMissingRankingSchema(result.error)) return rankingFailure('يلزم تشغيل supabase/yemen-ranking.sql في بيئة معتمدة أولاً.', 503);
    if (result.error?.code === '23505') return rankingFailure('الرابط المختصر مستخدم بالفعل. اختر رابطاً آخر.', 409);
    if (result.error) throw result.error;
    if (!result.data) return rankingFailure(expected ? 'عُدّل المؤشر في جلسة أخرى. حدّث القائمة قبل الحفظ.' : 'المؤشر غير موجود.', expected ? 409 : 404);
    return rankingJson({ok: true, indicator: {...result.data, snapshot: null}}, id ? 200 : 201);
  } catch (error) {
    if (error instanceof RequestValidationError) return rankingFailure(error.message, error.status);
    console.error('ranking indicator save failed', error?.code || error?.name || 'service');
    return rankingFailure('تعذر حفظ المؤشر. لم تُؤكد عملية الحفظ؛ حدّث القائمة قبل المحاولة.', 503);
  }
}
