// مدرسة 967 — مراجعة اليوم لدروس البطاقات: GET يعيد 5 بطاقات، وPOST {action:'check'} يصحح بطاقة. قراءة فقط.
import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {cardReviewSession, checkReviewCard} from '@/lib/schoolCardReviewServer';
import {isSameOrigin, readJsonObject, RequestValidationError} from '@/lib/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const respond = (body, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'private, no-store', 'Pragma': 'no-cache', 'Vary': 'Authorization'}});

export async function GET(request) {
  try {
    const db = serverDb(), user = await schoolUser(request, db);
    return respond(await cardReviewSession(db, user));
  } catch (e) {
    if (e instanceof RequestValidationError) return respond({error: e.message}, e.status);
    console.error('School review unavailable', e?.name || 'unknown');
    return respond({error: 'تعذر تحميل المراجعة حاليًا.'}, 503);
  }
}

export async function POST(request) {
  try {
    if (!isSameOrigin(request)) throw new RequestValidationError('طلب غير مسموح.', 403);
    const db = serverDb(), user = await schoolUser(request, db);
    const body = await readJsonObject(request, 4000);
    if (body.action !== 'check') throw new RequestValidationError('إجراء غير معروف.');
    return respond(await checkReviewCard(db, user, body));
  } catch (e) {
    if (e instanceof RequestValidationError) return respond({error: e.message}, e.status);
    console.error('School review check failed', e?.name || 'unknown');
    return respond({error: 'تعذر تصحيح البطاقة.'}, 503);
  }
}
