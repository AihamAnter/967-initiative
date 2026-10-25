import 'server-only';
import {NextResponse} from 'next/server';
import {serverDb} from './supabase-server';
import {RequestValidationError} from './requestSecurity.js';
import {authorizeEditorRequest} from './adminAuthorization.js';
import {rankingCategories} from './rankingCatalog.js';
import {isRankingCode, isRankingSlug} from './rankings.js';

export const rankingJson = (data, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}});
export const rankingFailure = (message, status = 400) => rankingJson({error: message}, status);
export const isRankingId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

export async function authorizeRankingEditor(request) {
  const db = serverDb();
  try {
    const actor=await authorizeEditorRequest(request,db);return {db,...actor};
  } catch(error) { return {error: rankingFailure(error instanceof RequestValidationError?error.message:'خدمة التحقق من الجلسة غير متاحة حالياً.',error instanceof RequestValidationError?error.status:503)}; }
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
