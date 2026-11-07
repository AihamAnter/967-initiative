import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCardSnapshot, cardDraft, applyCardCheck, finishCards, starsFromScore} from '../lib/schoolCardProgress.js';

const snapshot = [
  {format: 2, id: 'a', kind: 'choice', answer: 1, explain: 'لأن السعر ارتفع.'},
  {format: 2, id: 'b', kind: 'truefalse', answer: [true, false], explain: 'العبارة الثانية خاطئة.'},
  {format: 2, id: 'c', kind: 'type', answer: ['صنعاء'], explain: 'صنعاء هي العاصمة.'},
];

test('the snapshot is recognised and the draft keeps answers empty (table constraint ≤ 5)', () => {
  assert.equal(isCardSnapshot(snapshot), true);
  assert.equal(isCardSnapshot([{id: 'x', kind: 'choice'}]), false);
  assert.deepEqual(cardDraft(null), {answers: [], cards: {}});
});

test('first try counts, a second wrong try reveals the answer and closes the card', () => {
  let {draft, result} = applyCardCheck(snapshot, null, 'a', 1);
  assert.deepEqual([result.correct, result.done, result.explain], [true, true, 'لأن السعر ارتفع.']);
  ({draft, result} = applyCardCheck(snapshot, draft, 'b', [true, true]));
  assert.equal(result.correct, false); assert.equal(result.done, false); assert.equal(result.reveal, undefined); assert.equal(result.explain, undefined);
  ({draft, result} = applyCardCheck(snapshot, draft, 'b', [false, false]));
  assert.equal(result.done, true); assert.deepEqual(result.reveal, [true, false]);
  assert.equal(draft.cards.b.first, false, 'a later correct answer never upgrades the first try');
  const again = applyCardCheck(snapshot, draft, 'a', 0);
  assert.equal(again.result.already, true, 'a finished card cannot be re-graded');
  assert.equal(applyCardCheck(snapshot, draft, 'zzz', 1).error.length > 0, true);
});

test('finishing needs every card; stars and score feed the attempts table and the first-pass XP trigger', () => {
  let {draft} = applyCardCheck(snapshot, null, 'a', 1);
  assert.match(finishCards(snapshot, draft).error, /أكمل/);
  ({draft} = applyCardCheck(snapshot, draft, 'b', [true, false]));
  ({draft} = applyCardCheck(snapshot, draft, 'c', ' صَنعاء '));
  const result = finishCards(snapshot, draft);
  assert.deepEqual([result.stars, result.score, result.passed, result.firstTry, result.total], [3, 6, true, 3, 3]);
  assert.equal(result.submission.format, 2);
  assert.equal(starsFromScore(6), 3); assert.equal(starsFromScore(5), 2);
});

test('server wiring: card lessons skip the old lab gate and question bank, check stays server-side, reviews skip v2', () => {
  const server = readFileSync(new URL('../lib/schoolGenericServer.js', import.meta.url), 'utf8');
  assert.ok(server.includes("const cardLesson=activeStage.format===2;"));
  assert.ok(server.includes('questions=cardSnapshot(activeStage)'));
  assert.ok(server.includes('export async function checkGenericCard('));
  assert.ok(server.includes(".eq('draft_version',attempt.draft_version||0)"), 'per-card saves are optimistic');
  const route = readFileSync(new URL('../app/api/school/custom/route.js', import.meta.url), 'utf8');
  assert.ok(route.includes("body.action==='check'"));
  const review = readFileSync(new URL('../lib/schoolReview.js', import.meta.url), 'utf8');
  assert.ok(review.includes('row.questions[0]?.format===2'));
});
