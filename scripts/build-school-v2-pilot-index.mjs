// يبني data/school-v2/pilot/index.js: استيراد ثابت لكل دروس التجربة كي تُضمَّن في حزمة الخادم.
// node scripts/build-school-v2-pilot-index.mjs
import {readdirSync, writeFileSync, existsSync} from 'node:fs';

const root = 'data/school-v2/pilot';
const courses = readdirSync(root, {withFileTypes: true}).filter(d => d.isDirectory() && existsSync(`${root}/${d.name}/course.json`)).map(d => d.name).sort();
const lines = ['// مولَّد تلقائيًا بـ scripts/build-school-v2-pilot-index.mjs — لا تعدّله يدويًا.'];
const entries = [];
for (const slug of courses) {
  const v = slug.replace(/[^a-z0-9]/g, '_');
  lines.push(`import ${v}_course from './${slug}/course.json';`);
  const lessons = readdirSync(`${root}/${slug}`).filter(f => /^\d\d\.json$/.test(f)).sort();
  lessons.forEach(f => lines.push(`import ${v}_${f.slice(0, 2)} from './${slug}/${f}';`));
  entries.push(`  {course: ${v}_course, lessons: [${lessons.map(f => `${v}_${f.slice(0, 2)}`).join(', ')}]}`);
}
lines.push('', 'export const PILOT_COURSES = [', entries.join(',\n'), '];', '');
writeFileSync(`${root}/index.js`, lines.join('\n'));
console.log('pilot index:', courses.map(c => c + ' ' + readdirSync(`${root}/${c}`).filter(f => /^\d\d\.json$/.test(f)).length).join(', '));
