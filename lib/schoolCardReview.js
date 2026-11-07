// مدرسة 967 — الإصدار الثاني: المراجعة الذكية لدروس البطاقات (بلا واجهة وبلا قاعدة بيانات، قابلة للاختبار).
// الخطأ في أول محاولة يعود للمراجعة بعد 1 و3 و7 أيام من إنهاء الدرس، ومراجعة اليوم 5 بطاقات ثابتة طوال اليوم.
import {isCardSnapshot} from './schoolCardProgress.js';

export const REVIEW_DAYS = [1, 3, 7];
export const DAILY_REVIEW_SIZE = 5;
const DAY = 86400000;
const SLUG = /^[a-z][a-z0-9-]{2,39}$/;

// كل بطاقات الدروس المجتازة: الخطأ (أول محاولة خاطئة) مع عمره بالأيام، والبقية للتدريب.
export function cardReviewPool(rows = [], now = Date.now()) {
  const seen = new Map();
  for (const row of rows) {
    if (row?.status !== 'passed' || !SLUG.test(row.course_slug || '') || !Number.isInteger(row.stage_index) || !isCardSnapshot(row.questions)) continue;
    const at = Date.parse(row.submitted_at || '');
    const cards = row.submission?.cards && typeof row.submission.cards === 'object' ? row.submission.cards : {};
    for (const q of row.questions) {
      const id = `${row.course_slug}:${row.stage_index}:${q.id}`;
      const prev = seen.get(id);
      if (prev && prev.at >= at) continue; // أحدث محاولة مجتازة هي المرجع
      seen.set(id, {id, slug: row.course_slug, stage: row.stage_index, cardId: q.id, kind: q.kind,
        missed: cards[q.id]?.first === false, at: Number.isFinite(at) ? at : 0, age: Number.isFinite(at) ? Math.floor((now - at) / DAY) : 0});
    }
  }
  return [...seen.values()];
}

const dueToday = item => item.missed && REVIEW_DAYS.includes(item.age);

// رقم ثابت من نص (لترتيب ثابت طوال اليوم لكل متعلم).
function hash(text) { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// مراجعة اليوم: المستحق اليوم أولًا، ثم أخطاء أقدم من يوم، ثم بطاقات تدريب من الدروس المجتازة. المختبرات لا تُراجع.
export function dailyReview(pool, {now = Date.now(), seed = '', size = DAILY_REVIEW_SIZE} = {}) {
  const day = new Date(now).toISOString().slice(0, 10);
  const order = item => hash(seed + day + item.id);
  const usable = pool.filter(i => i.kind !== 'lab');
  const due = usable.filter(dueToday).sort((a, b) => a.age - b.age || order(a) - order(b));
  const older = usable.filter(i => i.missed && i.age >= 1 && !dueToday(i)).sort((a, b) => order(a) - order(b));
  const practice = usable.filter(i => !i.missed && i.age >= 1).sort((a, b) => order(a) - order(b));
  const picked = [];
  for (const [list, reason] of [[due, 'due'], [older, 'mistake'], [practice, 'practice']])
    for (const item of list) { if (picked.length >= size) break; picked.push({...item, reason}); }
  return {items: picked, due: due.length, mistakes: usable.filter(i => i.missed).length};
}

// أيام المراجعة القادمة لخطأ واحد (لعرض «يعود بعد…»).
export function nextReviewIn(age) {
  const next = REVIEW_DAYS.find(d => d > age);
  return next === undefined ? null : next - age;
}
