// مدرسة 967 — فحص دروس البطاقات لمسار في المستودع (بلا قاعدة بيانات).
// الاستخدام: node scripts/check-school-v2-lessons.mjs <slug> [01 02 …]
// يتحقق من كل درس بالمدقق نفسه الذي يستخدمه الاستوديو، ويطبع ملخص البطاقات والتفاعلات والمشاهد.
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {validateCardLesson} from '../lib/schoolCards.js';

const [slug, ...only] = process.argv.slice(2);
if (!slug) { console.error('اكتب معرّف المسار.'); process.exit(1); }
const dir = `data/school-v2/pilot/${slug}`;
const files = readdirSync(dir).filter(f => /^\d\d\.json$/.test(f) && (!only.length || only.includes(f.slice(0, 2)))).sort();
let bad = 0;
const kinds = {}, scenes = {}, templates = {};
for (const f of files) {
  try {
    const raw = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    const {lesson, keys} = validateCardLesson(raw);
    templates[lesson.template] = (templates[lesson.template] || 0) + 1;
    for (const k of Object.values(keys)) kinds[k.kind] = (kinds[k.kind] || 0) + 1;
    for (const c of raw.cards) for (const v of [c.visual, c.task?.visual]) if (v?.kind === 'scene') scenes[v.scene] = (scenes[v.scene] || 0) + 1;
    console.log(`✓ ${f} ${lesson.title} — ${lesson.cards.length} بطاقات، ${Object.keys(keys).length} تفاعلات`);
  } catch (e) { bad++; console.log(`✗ ${f}: ${e.message}`); }
}
if (existsSync(`${dir}/course.json`)) console.log('course.json موجود');
console.log('التفاعلات:', JSON.stringify(kinds));
console.log('المشاهد:', JSON.stringify(scenes));
console.log('القوالب:', JSON.stringify(templates));
process.exit(bad ? 1 : 0);
