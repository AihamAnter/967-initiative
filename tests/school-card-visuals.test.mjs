// مدرسة 967 — الإصدار الثاني، المرحلة 3: مكتبة العناصر المرئية.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {validateCardLesson, VISUAL_KINDS, VISUAL_SCENES} from '../lib/schoolCards.js';
import {compactNumber, choroplethSteps, bindShift, statSeries, lessonVisuals} from '../lib/schoolCardVisuals.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const gallery = JSON.parse(read('data/school-v2/fixtures/visual-gallery.json'));
const withVisual = (id, visual) => ({...gallery, cards: gallery.cards.map(c => c.id === id ? {...c, visual} : c)});

test('the gallery fixture is valid and shows every visual kind', () => {
  // المعرض في درسين لأن الدرس الواحد لا يتجاوز 12 بطاقة.
  const {lesson} = validateCardLesson(gallery), second = validateCardLesson(JSON.parse(read('data/school-v2/fixtures/visual-gallery-2.json'))).lesson;
  const kinds = new Set([...lessonVisuals(lesson), ...lessonVisuals(second)].map(v => v.kind));
  for (const k of VISUAL_KINDS) assert.ok(kinds.has(k), k);
});

test('every fixture lesson stays valid', () => {
  for (const f of ['economics-basics-1', 'economics-basics-2', 'visual-gallery', 'visual-gallery-2']) assert.doesNotThrow(() => validateCardLesson(JSON.parse(read(`data/school-v2/fixtures/${f}.json`))), f);
});

test('visual validation rejects broken or unsafe data', () => {
  const bad = [
    {kind: 'chart', alt: 'منحنى بلا نوع محدد'},
    {kind: 'chart', type: 'line', alt: 'منحنى بلا سلاسل', series: []},
    {kind: 'map', alt: 'خريطة بلا محافظات'},
    {kind: 'map', alt: 'خريطة برمز غير صالح', highlight: ['YE99']},
    {kind: 'scene', alt: 'مشهد غير موجود', scene: 'moon'},
    {kind: 'image', alt: 'صورة من موقع آخر', src: 'https://example.com/a.png', credit: 'x x', license: 'CC0'},
    {kind: 'stat', alt: 'مؤشر بمعرّف غير صالح', indicator: 'Bad Slug'},
    {kind: 'stat', alt: 'مؤشر ببيانات مزروعة', indicator: 'population-total', data: {points: [[1, 2]]}},
    {kind: 'glyphs', alt: 'حروف غير معروفة', letters: ['qq9']},
    {kind: 'verse', alt: 'بيت بتفعيلة غير صالحة', sadr: 'صدر البيت', ajuz: 'عجز البيت', feet: [{text: 'فعو', pattern: 'abc'}]},
    {kind: 'timeline', alt: 'خط زمني بحدث واحد', events: [{year: 1990, label: 'حدث'}]},
  ];
  for (const v of bad) assert.throws(() => validateCardLesson(withVisual('map', v)), undefined, JSON.stringify(v));
});

test('scenes listed in the schema all exist in the scene library', () => {
  const ui = read('components/school/v2/visuals/Scenes.jsx');
  for (const s of VISUAL_SCENES) assert.ok(ui.includes(`'${s}': () =>`) || ui.includes(`  ${s}: () =>`) || ui.includes(`draw.${s} =`), s);
});

test('number formatting, map steps and slider binding', () => {
  assert.equal(compactNumber(41800000), '41.8 مليون');
  assert.equal(compactNumber(2500000000), '2.5 مليار');
  assert.equal(compactNumber(35000), '35 ألف');
  assert.equal(compactNumber(12.345), '12.35');
  assert.ok(!/[٠-٩]/.test(compactNumber(123456789)));
  const s = choroplethSteps({YE11: 0, YE12: 50, YE13: 100});
  assert.deepEqual([s.step(0), s.step(50), s.step(100)], [1, 3, 4]);
  const task = {kind: 'slider', min: -20, max: 20, initial: 0};
  assert.equal(bindShift({bind: 'demand'}, task, 20), 25);
  assert.equal(bindShift({bind: 'demand'}, task, 0), 0);
  assert.equal(bindShift({}, task, 20), 0);
});

test('indicator series: published values in range, with their source', () => {
  const ind = {name: 'السكان', unit: 'نسمة', values: [{year: 1999, value: '17'}, {year: 2000, value: '18', source: {publisher: 'World Bank', url: 'https://data.worldbank.org'}}, {year: 2001, value: '19', source: {name: 'UN', url: 'javascript:alert(1)'}}]};
  const s = statSeries(ind, [2000, 2001]);
  assert.deepEqual(s.points, [[2000, 18], [2001, 19]]);
  assert.deepEqual(s.source, {name: 'UN', url: ''}, 'unsafe source links are dropped');
  assert.equal(statSeries({values: [{year: 2000, value: 1}]}), null, 'one point is not a chart');
});

test('the lesson map file exists, is small and has every governorate with a proper name', () => {
  const file = 'public/data/school-v2/yemen-governorates.json';
  assert.ok(existsSync(new URL('../' + file, import.meta.url)));
  const raw = read(file), map = JSON.parse(raw);
  assert.ok(raw.length < 40000, 'light enough for a lesson');
  assert.equal(map.governorates.length, 22);
  for (const g of map.governorates) { assert.match(g.id, /^YE\d\d$/); assert.ok(g.d.length > 40, g.id); assert.ok(!/ه$/.test(g.nameAr) || g.nameAr === 'ه', g.nameAr); }
  assert.ok(map.governorates.some(g => g.nameAr === 'أمانة العاصمة'));
});

test('stage page resolves indicator data on the server before rendering', () => {
  const page = read('app/school/courses/[slug]/[stage]/page.jsx');
  assert.match(page, /lesson=await resolveCardVisuals\(lesson\)/);
});
