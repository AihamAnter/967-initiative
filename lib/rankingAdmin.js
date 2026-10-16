import 'server-only';
import {NextResponse} from 'next/server';
import {serverDb} from './supabase-server';
import {isSameOrigin, RequestValidationError} from './requestSecurity.js';
import {rankingCategories} from './rankingCatalog.js';
import {isRankingCode, isRankingSlug} from './rankings.js';

export const rankingJson = (data, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}});
export const rankingFailure = (message, status = 400) => rankingJson({error: message}, status);
export const isRankingId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

export async function authorizeRankingEditor(request) {
  if (!isSameOrigin(request)) return {error: rankingFailure('طلب غير مسموح.', 403)};
  const token = request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
  if (!token) return {error: rankingFailure('سجّل الدخول بحساب تحرير أولاً.', 401)};
  const db = serverDb();
  if (!db) return {error: rankingFailure('خدمة الإدارة غير مفعّلة.', 503)};
  try {
    const userResult = await db.auth.getUser(token);
    if (userResult.error || !userResult.data?.user) return {error: rankingFailure('تعذر التحقق من الجلسة. سجّل الدخول مجدداً.', userResult.error?.status >= 500 ? 503 : 401)};
    const editor = await db.from('editors').select('role').eq('user_id', userResult.data.user.id).maybeSingle();
    if (editor.error) return {error: rankingFailure('تعذر التحقق من صلاحيات التحرير.', 503)};
    if (!['admin', 'management'].includes(editor.data?.role)) return {error: rankingFailure('هذه العملية متاحة للمحررين المعتمدين فقط.', 403)};
    return {db, user: userResult.data.user};
  } catch { return {error: rankingFailure('خدمة التحقق من الجلسة غير متاحة حالياً.', 503)}; }
}

export function validateRankingIndicator(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestValidationError('بيانات المؤشر غير صالحة.');
  const text = (field, max, min = 0) => {
    if (typeof input[field] !== 'string') throw new RequestValidationError(`الحقل ${field} غير صالح.`);
    const value = input[field].trim();
    if (value.length < min || value.length > max) throw new RequestValidationError(`طول الحقل ${field} غير صالح.`);
    return value;
  };
  const result = {
    slug: text('slug', 100, 1), name: text('name', 160, 2), category: text('category', 50, 1),
    unit: text('unit', 120, 1), code: text('code', 80, 2), description: text('description', 3000),
    direction: input.direction, better: input.better, display_order: input.display_order, is_published: input.is_published,
  };
  if (!isRankingSlug(result.slug) || !isRankingCode(result.code)) throw new RequestValidationError('الرابط المختصر أو رمز البنك الدولي غير صالح.');
  if (!rankingCategories.some(category => category.id === result.category)) throw new RequestValidationError('تصنيف المؤشر غير صالح.');
  if (!['asc', 'desc'].includes(result.direction) || !['higher', 'lower', 'contextual'].includes(result.better)) throw new RequestValidationError('اتجاه الترتيب أو دلالة المؤشر غير صالحة.');
  if (!Number.isInteger(result.display_order) || result.display_order < 0 || result.display_order > 10000 || typeof result.is_published !== 'boolean') throw new RequestValidationError('ترتيب الظهور أو حالة النشر غير صالحة.');
  return result;
}
