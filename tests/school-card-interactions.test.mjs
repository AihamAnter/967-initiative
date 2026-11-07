// مدرسة 967 — الإصدار الثاني، المرحلة 2: تفاعلات الترتيب والتوصيل والتصنيف والمؤشر والصورة والتصحيح والفراغ والمختبر.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCardLesson, gradeCard} from '../lib/schoolCards.js';
import {cardSnapshot, applyCardCheck} from '../lib/schoolCardProgress.js';

const fixture = name => JSON.parse(readFileSync(new URL(`../data/school-v2/fixtures/${name}.json`, import.meta.url), 'utf8'));
const lesson = fixture('economics-basics-2');
const withTask = (id, patch) => ({...lesson, cards: lesson.cards.map(c => c.id === id ? {...c, task: {...c.task, ...patch}} : c)});

test('the interactions fixture is valid and uses every phase-2 kind', () => {
  const {lesson: pub, keys} = validateCardLesson(lesson);
  const kinds = new Set(pub.cards.filter(c => c.task).map(c => c.task.kind));
  for (const k of ['order', 'match', 'buckets', 'slider', 'hotspot', 'fix', 'gap', 'lab']) assert.ok(kinds.has(k), k);
  const raw = JSON.stringify(pub);
  for (const [id, key] of Object.entries(keys)) if (key.kind !== 'lab') assert.ok(!raw.includes(`"answer"`), 'no answer keys in public lesson: ' + id);
});

test('grading for each phase-2 kind', () => {
  const {keys} = validateCardLesson(lesson);
  assert.equal(gradeCard(keys.hook, 700), true);
  assert.equal(gradeCard(keys.hook, 1000), false);
  assert.equal(gradeCard(keys.shift, [0, 1, 0, 1]), true);
  assert.equal(gradeCard(keys.shift, [1, 1, 0, 1]), false);
  assert.equal(gradeCard(keys.terms, [2, 0, 1]), true);
  assert.equal(gradeCard(keys.steps, [1, 2, 0, 3]), true);
  assert.equal(gradeCard(keys.steps, [0, 1, 2, 3]), false);
  assert.equal(gradeCard(keys.point, ['eq']), true);
  assert.equal(gradeCard(keys.point, ['eq', 'low']), false);
  assert.equal(gradeCard(keys.fix, {index: 2, replacement: 0}), true);
  assert.equal(gradeCard(keys.fix, {index: 2, replacement: 1}), false);
  assert.equal(gradeCard(keys.gap, ['فائض', 'الانخفاض']), true);
  assert.equal(gradeCard(keys.gap, ['نقص', 'الانخفاض']), false);
});

test('labs need real evidence, not a bare true', () => {
  const {keys} = validateCardLesson(lesson);
  assert.equal(gradeCard(keys.lab, true), false);
  assert.equal(gradeCard(keys.lab, {kind: 'model', x: 0, y: 0}), false, 'unchanged model is not evidence');
  assert.equal(gradeCard(keys.lab, {kind: 'model', x: 10, y: 0}), true);
  assert.throws(() => validateCardLesson(withTask('lab', {lab: {kind: 'science', model: 'nope'}})));
  assert.throws(() => validateCardLesson(withTask('lab', {lab: {kind: 'gates', gate: 'MAYBE'}})));
});

test('authoring rules: scrambled order, one-to-one match', () => {
  assert.throws(() => validateCardLesson(withTask('steps', {answer: [0, 1, 2, 3]})), /مختلط/);
  assert.throws(() => validateCardLesson(withTask('terms', {answer: [0, 0, 1]})), /مرة واحدة/);
});

test('reveal shows the original wording, not the normalised key', () => {
  const snap = cardSnapshot(lesson);
  let r = applyCardCheck(snap, {}, 'gap', ['نقص', 'الارتفاع']);
  r = applyCardCheck(snap, r.draft, 'gap', ['نقص', 'الارتفاع']);
  assert.deepEqual(r.result.reveal, ['فائض', 'الانخفاض']);
  const first = cardSnapshot(fixture('economics-basics-1'));
  let t = applyCardCheck(first, {}, 'recap', 'خطأ');
  t = applyCardCheck(first, t.draft, 'recap', 'خطأ');
  assert.equal(t.result.reveal[0], 'الندرة');
});

test('player wiring: every kind has a component, a how-to line and a swipe guard', () => {
  const ui = readFileSync(new URL('../components/school/v2/CardInteractions.jsx', import.meta.url), 'utf8');
  const player = readFileSync(new URL('../components/school/v2/CardLessonPlayer.jsx', import.meta.url), 'utf8');
  for (const k of ['order', 'match', 'buckets', 'slider', 'hotspot', 'fix', 'gap', 'lab']) {
    assert.ok(ui.includes(' ' + k + ': ') && /export const INTERACTIONS = \{[^}]+\}/.test(ui) && ui.match(/export const INTERACTIONS = \{([^}]+)\}/)[1].includes(k + ':'), k);
    assert.match(ui, new RegExp(`\n  ${k}: '`), 'how-to ' + k);
  }
  assert.match(player, /data-noswipe/);
});

test('typed answers accept Eastern Arabic digits the same as Western ones', async () => {
  const {normalizeArabicAnswer} = await import('../lib/schoolCards.js');
  assert.equal(normalizeArabicAnswer('٢'), normalizeArabicAnswer('2'));
  assert.equal(normalizeArabicAnswer('۱۹۹۰'), '1990');
});
