// مدرسة 967 — معاينة دروس التجربة (المرحلة 7) للمحررين فقط. قراءة فقط.
import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {pilotOverview, pilotLesson} from '@/lib/schoolPilotServer';
import {RequestValidationError} from '@/lib/requestSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const respond = (body, status = 200) => NextResponse.json(body, {status, headers: {'Cache-Control': 'private, no-store', 'Pragma': 'no-cache', 'Vary': 'Authorization'}});

export async function GET(request) {
  try {
    const db = serverDb(), user = await schoolUser(request, db);
    const url = new URL(request.url), slug = url.searchParams.get('course'), lesson = url.searchParams.get('lesson');
    if (!slug) return respond(await pilotOverview(db, user));
    if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug) || !/^\d{1,2}$/.test(lesson || '')) throw new RequestValidationError('طلب غير صالح.');
    return respond(await pilotLesson(db, user, slug, Number(lesson)));
  } catch (e) {
    if (e instanceof RequestValidationError) return respond({error: e.message}, e.status);
    console.error('School pilot preview failed', e?.name || 'unknown');
    return respond({error: 'تعذر تحميل معاينة التجربة.'}, 503);
  }
}
