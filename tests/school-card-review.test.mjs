// مدرسة 967 — الإصدار الثاني، المرحلة 5: المراجعة الذكية والمشروع الختامي.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardReviewPool, dailyReview, nextReviewIn, REVIEW_DAYS} from '../lib/schoolCardReview.js';
import {schoolAchievementSummary} from '../lib/schoolAchievements.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-20T12:00:00Z');
const daysAgo = d => new Date(NOW - d * 86400000 - 3600000).toISOString();
const snap = ids => ids.map(([id, kind = 'choice']) => ({format: 2, id, kind}));
const row = (stage, ago, cards, ids = [['a'], ['b'], ['c'], ['d', 'lab']]) => ({status: 'passed', course_slug: 'economics-basics', stage_index: stage, questions: snap(ids), submission: {format: 2, cards}, submitted_at: daysAgo(ago)});

test('mistakes come back on days 1, 3 and 7 after the lesson', () => {
  assert.deepEqual(REVIEW_DAYS, [1, 3, 7]);
  for (const [ago, due] of [[0, 0], [1, 1], [2, 0], [3, 1], [5, 0], [7, 1], [9, 0]]) {
    const pool = cardReviewPool([row(0, ago, {a: {first: false}, b: {first: true}, c: {first: true}, d: {first: true}})], NOW);
    assert.equal(dailyReview(pool, {now: NOW, seed: 'u'}).due, due, 'age ' + ago);
  }
  assert.equal(nextReviewIn(1), 2);
  assert.equal(nextReviewIn(3), 4);
  assert.equal(nextReviewIn(7), null);
});

test('daily review: due first, then older mistakes, then practice; five cards; no labs; nothing from today', () => {
  const rows = [
    row(0, 3, {a: {first: false}, b: {first: true}, c: {first: false}, d: {first: true}}),
    row(1, 5, {a: {first: false}, b: {first: true}, c: {first: true}, d: {first: true}}),
    row(2, 0, {a: {first: false}, b: {first: true}, c: {first: true}, d: {first: true}}),
  ];
  const r = dailyReview(cardReviewPool(rows, NOW), {now: NOW, seed: 'user-1'});
  assert.equal(r.items.length, 5);
  assert.deepEqual(r.items.slice(0, 2).map(i => i.reason), ['due', 'due']);
  assert.equal(r.items[2].reason, 'mistake');
  assert.ok(r.items.slice(3).every(i => i.reason === 'practice'));
  assert.ok(r.items.every(i => i.kind !== 'lab'));
  assert.ok(r.items.every(i => i.stage !== 2), 'a lesson finished today is not reviewed yet');
});

test('the daily set is stable for a day and differs between learners', () => {
  const rows = Array.from({length: 6}, (_, s) => row(s, 10, {a: {first: true}, b: {first: true}, c: {first: true}, d: {first: true}}));
  const pool = cardReviewPool(rows, NOW);
  const ids = seed => dailyReview(pool, {now: NOW, seed}).items.map(i => i.id).join();
  assert.equal(ids('u1'), ids('u1'));
  assert.notEqual(ids('u1'), ids('u2'));
  assert.notEqual(ids('u1'), dailyReview(pool, {now: NOW + 86400000, seed: 'u1'}).items.map(i => i.id).join());
});

test('only passed card attempts count; the latest pass wins', () => {
  const old = row(0, 9, {a: {first: false}});
  const newer = row(0, 3, {a: {first: true}});
  const pool = cardReviewPool([old, newer, {...row(1, 3, {a: {first: false}}), status: 'active'}, {status: 'passed', course_slug: 'arud', stage_index: 0, questions: [{id: 1}]}], NOW);
  const a = pool.find(p => p.id === 'economics-basics:0:a');
  assert.equal(a.missed, false);
  assert.ok(!pool.some(p => p.stage === 1));
});

test('capstone badge comes from passing the course capstone lesson', () => {
  const none = schoolAchievementSummary([], [{course_slug: 'economics-basics', stage_index: 10, status: 'passed'}], ['musnad', 'arud'], {'economics-basics': 11});
  assert.equal(none.badges.find(b => b.id === 'capstone').earned, false);
  const done = schoolAchievementSummary([], [{course_slug: 'economics-basics', stage_index: 11, status: 'passed'}], ['musnad', 'arud'], {'economics-basics': 11});
  assert.equal(done.badges.find(b => b.id === 'capstone').earned, true);
  assert.equal(schoolAchievementSummary([], [{course_slug: 'x-y', stage_index: 11, status: 'passed'}]).badges.find(b => b.id === 'capstone').earned, false, 'no capstone configured');
});

test('review server is read-only, grades only passed lessons and keeps keys on the server', () => {
  const server = read('lib/schoolCardReviewServer.js'), route = read('app/api/school/review/route.js');
  assert.match(server, /^import 'server-only';/);
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(server), 'no writes');
  assert.match(server, /\.eq\('status', 'passed'\)\.limit\(1\)/);
  assert.match(server, /fail\('راجع الدروس التي أنهيتها فقط\.', 403\)/);
  assert.match(server, /card: resolved/);
  assert.ok(!/keys/.test(server.split('items.push')[1].split(');')[0]), 'session items carry public cards only');
  assert.match(route, /isSameOrigin\(request\)/);
  assert.match(read('components/school/v2/SchoolContinueCard.jsx'), /href="\/school\/review"/);
  assert.match(read('lib/schoolDashboardServer.js'), /c\.capstone/);
});
