// مدرسة 967 — الإصدار الثاني، المرحلة 7: دروس التجربة («أساسيات الاقتصاد» و«علم العروض»).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {validateCardLesson} from '../lib/schoolCards.js';
import {journeyUnits} from '../lib/schoolJourney.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const COURSES = ['economics-basics', 'arud'];
const lessons = slug => readdirSync(new URL(`../data/school-v2/pilot/${slug}/`, import.meta.url)).filter(f => /^\d\d\.json$/.test(f)).sort().map(f => ({file: f, json: JSON.parse(read(`data/school-v2/pilot/${slug}/${f}`))}));
// أنماط التفعيلات المعتمدة (الكتابة العروضية / و0).
const FOOT = {'فعولن': '//0/0', 'فعولُ': '//0/', 'فعول': '//0/', 'مفاعيلن': '//0/0/0', 'مفاعلن': '//0//0', 'فاعلن': '/0//0', 'فعِلن': '///0', 'فعلن': '///0',
  'مستفعلن': '/0/0//0', 'متفعلن': '//0//0', 'مستعلن': '/0///0', 'متفاعلن': '///0//0', 'متْفاعلن': '/0/0//0', 'مفاعلتن': '//0///0', 'مفاعلْتن': '//0/0/0',
  'فاعلاتن': '/0//0/0', 'فعِلاتن': '///0/0', 'فعلاتن': '///0/0', 'مفعولات': '/0/0/0/', 'مفعولن': '/0/0/0'};

for (const slug of COURSES) {
  test(`${slug}: 12 valid lessons, course config, varied templates and interactions`, () => {
    const list = lessons(slug), course = JSON.parse(read(`data/school-v2/pilot/${slug}/course.json`));
    assert.equal(list.length, 12);
    assert.deepEqual(list.map(l => l.file), Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0') + '.json'));
    const kinds = {}, templates = new Set();
    for (const {file, json} of list) {
      const {lesson, keys} = validateCardLesson(json);
      templates.add(lesson.template);
      for (const k of Object.values(keys)) kinds[k.kind] = (kinds[k.kind] || 0) + 1;
      assert.ok(lesson.cards.length >= 7, `${file}: at least 7 cards`);
    }
    const total = Object.values(kinds).reduce((a, b) => a + b, 0);
    assert.ok((kinds.choice || 0) / total <= 0.35, `${slug}: choice is ${kinds.choice}/${total}`);
    assert.ok(Object.keys(kinds).length >= 8, `${slug}: ${Object.keys(kinds).length} task kinds`);
    assert.ok(templates.size >= 4, `${slug}: ${templates.size} templates`);
    assert.equal(course.slug, slug);
    assert.equal(course.capstone, 11);
    const units = journeyUnits(list.map((_, index) => ({index})), course.units);
    assert.deepEqual(units.flatMap(u => u.stages).sort((a, b) => a - b), Array.from({length: 12}, (_, i) => i), 'units cover all 12 lessons once');
  });
}

test('arud: every foot shown in a verse visual carries its correct pattern', () => {
  for (const {file, json} of lessons('arud')) {
    const visuals = json.cards.flatMap(c => [c.visual, c.task?.visual, c.task?.reveal?.visual]).filter(v => v?.kind === 'verse');
    for (const v of visuals) for (const f of v.feet || []) {
      if (f.name && f.pattern && FOOT[f.name]) assert.equal(f.pattern.replace(/\s/g, ''), FOOT[f.name], `${file}: ${f.name}`);
    }
  }
});

test('pilot preview is editors-only and read-only; the index bundles every lesson', () => {
  const server = read('lib/schoolPilotServer.js'), route = read('app/api/school/pilot/route.js'), index = read('data/school-v2/pilot/index.js');
  assert.match(server, /^import 'server-only';/);
  assert.match(server, /schoolStaffPreview\(db, user\)/);
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(server + route), 'no writes');
  for (const slug of COURSES) for (const {file} of lessons(slug)) assert.ok(index.includes(`./${slug}/${file}'`), `${slug}/${file} in index`);
  assert.match(read('app/school/pilot/page.jsx'), /noindex:true/);
});
