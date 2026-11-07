// مدرسة 967 — الإصدار الثاني: منطق التقدم داخل درس البطاقات (بلا قاعدة بيانات، قابل للاختبار).
// اللقطة المخزنة في school_stage_attempts.questions: [{format:2, id, ...key}] لكل بطاقة مصحَّحة.
// التقدم يُحفظ في draft.cards = {cardId: {first, done, tries}} مع إبقاء draft.answers = [] (قيد الجدول).
import {gradeCard, lessonResult, validateCardLesson} from './schoolCards.js';

export const isCardSnapshot = questions => Array.isArray(questions) && questions.length > 0 && questions.every(q => q && q.format === 2 && typeof q.id === 'string');

export function cardSnapshot(stage) {
  const {keys} = validateCardLesson(stage);
  return Object.entries(keys).map(([id, key]) => ({format: 2, id, ...key}));
}

export function cardDraft(draft) {
  const cards = draft && typeof draft === 'object' && draft.cards && typeof draft.cards === 'object' && !Array.isArray(draft.cards) ? draft.cards : {};
  return {answers: [], cards};
}

// يصحح إجابة بطاقة ويعيد {draft, result}. بعد خطأين تُكشف الإجابة وتُعتبر البطاقة منتهية (لا تُحتسب صحيحة من أول محاولة).
export function applyCardCheck(snapshot, draft, cardId, answer) {
  const key = snapshot.find(q => q.id === cardId);
  if (!key) return {error: 'البطاقة غير موجودة في هذا الدرس.'};
  const state = cardDraft(draft);
  const prev = state.cards[cardId] || {first: null, done: false, tries: 0};
  if (prev.done) return {draft: state, result: {correct: prev.first === true, done: true, already: true, explain: key.explain}};
  const correct = gradeCard(key, answer);
  const tries = Math.min(prev.tries + 1, 20);
  const done = correct || tries >= 2;
  const next = {first: prev.first === null ? correct : prev.first, done, tries};
  const result = {correct, done, tries};
  if (done) result.explain = key.explain;
  if (!correct && done && key.kind !== 'lab') result.reveal = key.display ?? key.answer; // display: الصيغة الأصلية قبل التطبيع
  return {draft: {answers: [], cards: {...state.cards, [cardId]: next}}, result};
}

// النتيجة النهائية: تتطلب إنهاء كل البطاقات المصحَّحة.
export function finishCards(snapshot, draft) {
  const {cards} = cardDraft(draft);
  const pending = snapshot.filter(q => !cards[q.id]?.done).map(q => q.id);
  if (pending.length) return {error: 'أكمل كل بطاقات الدرس أولًا.', pending};
  const firstTry = snapshot.filter(q => cards[q.id]?.first === true).length;
  const result = lessonResult(firstTry, snapshot.length);
  return {...result, firstTry, total: snapshot.length, submission: {format: 2, stars: result.stars, firstTry, total: snapshot.length, cards}};
}

// للمحطات المكتملة في الإصدار الأول: النجوم تُشتق من الدرجة دون كتابة.
export const starsFromScore = score => score >= 6 ? 3 : score >= 5 ? 2 : 0;
