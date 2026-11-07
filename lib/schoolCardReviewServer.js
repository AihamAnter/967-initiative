import 'server-only';
// مدرسة 967 — الإصدار الثاني: مراجعة اليوم على الخادم. قراءة فقط: لا تكتب أي صف ولا تمنح نقاطًا.
// البطاقات تأتي من الدروس التي اجتازها المتعلم فقط، والمفاتيح لا تغادر الخادم.
import {RequestValidationError} from './requestSecurity.js';
import {publishedSchoolStage} from './schoolContentServer.js';
import {SCHOOL_SLUG} from './schoolContent.js';
import {validateCardLesson, gradeCard} from './schoolCards.js';
import {isCardSnapshot} from './schoolCardProgress.js';
import {cardReviewPool, dailyReview, nextReviewIn} from './schoolCardReview.js';
import {resolveCardVisuals} from './schoolCardVisualsServer.js';

const TABLE = 'school_stage_attempts';
const fail = (text, status = 400) => { throw new RequestValidationError(text, status); };
const CARD = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function lessonOf(db, slug, stage) {
  const published = await publishedSchoolStage(db, slug, stage);
  if (!published || published.format !== 2) return null;
  try { return validateCardLesson(published); } catch { return null; }
}

export async function cardReviewSession(db, user, now = Date.now()) {
  if (!db || !user?.id) fail('سجّل الدخول للمراجعة.', 401);
  const {data, error} = await db.from(TABLE).select('course_slug,stage_index,status,questions,submission,submitted_at')
    .eq('user_id', user.id).eq('status', 'passed').order('submitted_at', {ascending: false}).limit(200);
  if (error) fail('تعذر تحميل المراجعة.', 503);
  const pool = cardReviewPool((data || []).filter(r => isCardSnapshot(r.questions)), now);
  const pick = dailyReview(pool, {now, seed: user.id});
  const lessons = new Map();
  const items = [];
  for (const item of pick.items) {
    const key = item.slug + ':' + item.stage;
    if (!lessons.has(key)) lessons.set(key, await lessonOf(db, item.slug, item.stage));
    const lesson = lessons.get(key)?.lesson;
    const card = lesson?.cards.find(c => c.id === item.cardId && c.task);
    if (!card) continue; // تغيّر الدرس بعد المحاولة: تُتجاوز البطاقة
    const resolved = (await resolveCardVisuals({cards: [card]})).cards[0];
    items.push({slug: item.slug, stage: item.stage, cardId: item.cardId, reason: item.reason, lessonTitle: lesson.title,
      again: item.reason === 'due' ? nextReviewIn(item.age) : null, card: resolved});
  }
  return {items, due: pick.due, mistakes: pick.mistakes};
}

export async function checkReviewCard(db, user, {slug, stage, cardId, answer}) {
  if (!db || !user?.id) fail('سجّل الدخول للمراجعة.', 401);
  if (!SCHOOL_SLUG.test(slug || '') || !Number.isInteger(stage) || stage < 0 || stage > 11 || !CARD.test(cardId || '') || cardId.length > 60) fail('البطاقة غير صالحة.');
  if (JSON.stringify(answer ?? null).length > 2000) fail('الإجابة أطول من المسموح.');
  const {data: passed, error} = await db.from(TABLE).select('id').eq('user_id', user.id).eq('course_slug', slug)
    .eq('stage_index', stage).eq('status', 'passed').limit(1);
  if (error) fail('تعذر التحقق من الدرس.', 503);
  if (!passed?.length) fail('راجع الدروس التي أنهيتها فقط.', 403);
  const lesson = await lessonOf(db, slug, stage);
  const key = lesson?.keys[cardId];
  if (!key || key.kind === 'lab') fail('البطاقة غير متاحة للمراجعة.', 404);
  const correct = gradeCard(key, answer);
  return {correct, done: true, explain: key.explain, ...(correct ? {} : {reveal: key.display ?? key.answer})};
}
