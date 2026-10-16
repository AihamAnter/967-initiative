import test from 'node:test';
import assert from 'node:assert/strict';
import {normalisePdfPage, facingPdfPages} from '../lib/pdfNavigation.js';
import {mapScreenPoint, zoomMapViewport} from '../lib/mapViewport.js';
import {canComparePercent, firstTimelineValue, timelineRows} from '../lib/timeline.js';
import {canOptimizeImage, parseMediaUrl, safeExternalUrl, safeImageUrl, workThumbnail} from '../lib/media.js';

test('PDF jump accepts Arabic digits, clamps bounds, and rejects incomplete/decimal pages', () => {
  assert.equal(normalisePdfPage('١٢', 40), 12);
  assert.equal(normalisePdfPage('۱۲', 40), 12);
  assert.equal(normalisePdfPage(99, 40), 40);
  assert.equal(normalisePdfPage(0, 40), 1);
  assert.equal(normalisePdfPage(2.5, 40), null);
  assert.equal(normalisePdfPage('invalid', 40), null);
  assert.equal(normalisePdfPage('', 40), null);
  assert.equal(normalisePdfPage(1, 0), null);
});

test('every page remains reachable in odd/even Arabic spreads without phantom pages', () => {
  for (let count = 1; count <= 40; count++) {
    const seen = new Set();
    for (let page = 1; page <= count; page = page === 1 ? 2 : page + 2) {
      for (const number of Object.values(facingPdfPages(page, count, true)).filter(Boolean)) {
        assert.ok(number >= 1 && number <= count);
        seen.add(number);
      }
    }
    assert.equal(seen.size, count);
    for (let page = 1; page <= count; page++) {
      const spread = facingPdfPages(page, count, true);
      assert.ok(Object.values(spread).includes(page));
      assert.equal(facingPdfPages(page, count, false).single, page);
    }
  }
});

test('map button/wheel/pinch zoom stays finite with a fixed anchor and aspect ratio', () => {
  const start = {x: 40, y: -20, width: 15, height: 10};
  const anchor = {x: 47.5, y: -15};
  let view = start;
  for (let i = 0; i < 2000; i++) view = zoomMapViewport(view, 0.8, anchor);
  assert.equal(view.width, 0.015);
  assert.ok(Math.abs(view.width / view.height - 1.5) < 1e-10);
  for (let i = 0; i < 2000; i++) view = zoomMapViewport(view, 1.2, anchor);
  assert.equal(view.width, 60);
  for (const factor of [0, -1, NaN, Infinity]) assert.equal(zoomMapViewport(view, factor, anchor), view);
  assert.ok(Object.values(view).every(Number.isFinite));
  assert.ok(Math.abs(view.x + view.width / 2 - anchor.x) < 1e-10);
});

test('map coordinate conversion honors SVG aspect-ratio margins for wheel anchors', () => {
  const rect = {left: 10, top: 20, width: 1000, height: 1000};
  const view = {x: 40, y: -20, width: 20, height: 10};
  assert.deepEqual(mapScreenPoint(rect, {clientX: 510, clientY: 520}, view), {x: 50, y: -15});
  assert.deepEqual(mapScreenPoint(rect, {clientX: 10, clientY: 270}, view), {x: 40, y: -20});
});

test('timeline comparison uses chronological baseline, preserves zero/missing years, and avoids divide-by-zero', () => {
  const indicator = {id: 'a', values: [{year: 2023,value: 30}, {year: 2020,value: 10}, {year: 2021,value: null}, {year: 2024,value: 0}]};
  assert.equal(firstTimelineValue(indicator, 2020, 2024).year, 2020);
  assert.equal(canComparePercent([indicator], 2020, 2024), true);
  assert.deepEqual(timelineRows([indicator], 2020, 2024), [
    {year: 2020,a: 10},{year: 2021,a: null},{year: 2022,a: null},{year: 2023,a: 30},{year: 2024,a: 0},
  ]);
  assert.equal(timelineRows([indicator], 2020, 2024, 'percent').at(-1).a, -100);
  assert.equal(canComparePercent([indicator], 2024, 2024), false);
  assert.equal(canComparePercent([indicator], 2025, 2026), false);
  assert.equal(canComparePercent([], 2020, 2024), false);
  assert.deepEqual(timelineRows([indicator], 2024, 2020), []);
});

test('media links reject executable/credential URLs and accept actual local thumbnails', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'https://user:secret@example.org/video.mp4']) {
    assert.equal(safeExternalUrl(value), null);
    assert.equal(parseMediaUrl(value).embedUrl, null);
  }
  for (const value of ['//evil.example/image.png', '/\\evil.example/image.png']) assert.equal(safeImageUrl(value), null);
  assert.equal(safeImageUrl('/images/work.png'), '/images/work.png');
  assert.equal(canOptimizeImage('//evil.example/image.png'), false);
  assert.equal(workThumbnail({thumbnail_url: '/images/work.png'}), '/images/work.png');
  assert.equal(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ').kind, 'youtube');
  assert.equal(parseMediaUrl('https://not-youtube.com/watch?v=dQw4w9WgXcQ').embedUrl, null);
});

