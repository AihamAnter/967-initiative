import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTodayFeed, todayItems} from '../lib/todayFeed.js';
import {formatCompact} from '../lib/format.js';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const work = (id, date, extra = {}) => ({id, slug: 'w' + id, title: 'عمل ' + id, published_at: date, thumbnail_url: 'https://i.ytimg.com/vi/x' + id + '/hqdefault.jpg', ...extra});

test('newest items lead across content types, and demo rows are never shown', () => {
  const items = todayItems({
    works: [work(1, '2026-11-01'), work(2, '2026-11-05', {is_demo: true})],
    issues: [{id: 1, slug: 'i1', title: 'العدد الأول', issue_date: '2026-11-03'}],
    indicators: [{id: 7, slug: 'pop', name: 'السكان', updated_at: '2026-11-04', latestValue: {value: 42961653, year: 2026}}],
  }, NOW);
  assert.deepEqual(items.map(item => item.kind), ['indicator', 'issue', 'work']);
  assert.ok(!items.some(item => item.title === 'عمل 2'));
});

test('a live or upcoming debate outranks newer stories; cancelled ones are dropped', () => {
  const items = todayItems({
    works: [work(1, '2026-11-06T10:00:00Z')],
    debates: [
      {id: 'a', slug: 'live', title: 'مناظرة مباشرة', stage: 'live', created_at: '2026-10-01'},
      {id: 'b', slug: 'gone', title: 'ملغاة', stage: 'cancelled', created_at: '2026-11-06'},
    ],
  }, NOW);
  assert.equal(items[0].href, '/debates/live');
  assert.equal(items[0].live, true);
  assert.ok(!items.some(item => item.href === '/debates/gone'));
});

test('lead prefers a picture, numbers never crowd the list, hidden sections are respected', () => {
  const feed = buildTodayFeed({
    works: [work(1, '2026-11-02')],
    indicators: [1, 2, 3].map(n => ({id: n, slug: 's' + n, name: 'مؤشر ' + n, updated_at: '2026-11-0' + (3 + n), latestValue: {value: n, year: 2025}})),
  }, {now: NOW});
  assert.equal(feed.lead.kind, 'work');
  assert.equal(feed.rest.filter(item => item.kind === 'indicator').length, 1);
  const hidden = buildTodayFeed({works: [work(1, '2026-11-02')]}, {now: NOW, isVisible: section => section !== 'works'});
  assert.equal(hidden.lead, null);
});

test('large values are rounded honestly; small ones stay exact', () => {
  assert.equal(formatCompact(42961653), '43 مليون');
  assert.equal(formatCompact(21606160663.032), '21.6 مليار');
  assert.equal(formatCompact(21.69), '21.69');
  assert.equal(formatCompact(''), '');
});
