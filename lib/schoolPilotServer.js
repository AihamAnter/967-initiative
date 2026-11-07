import 'server-only';
// مدرسة 967 — تجربة الإصدار الثاني (المرحلة 7): دروس التجربة من المستودع، للمحررين فقط، بلا كتابة في قاعدة البيانات.
// تُراجع هنا قبل النشر للطلاب؛ المفاتيح تصل إلى متصفح المحرر فقط من أجل المعاينة المحلية.
import {RequestValidationError} from './requestSecurity.js';
import {schoolStaffPreview} from './schoolStageAccess.js';
import {validateCardLesson} from './schoolCards.js';
import {cardSnapshot} from './schoolCardProgress.js';
import {resolveCardVisuals} from './schoolCardVisualsServer.js';
import {PILOT_COURSES} from '../data/school-v2/pilot/index.js';

const fail = (text, status = 400) => { throw new RequestValidationError(text, status); };

async function requireStaff(db, user) {
  if (!db || !user?.id) fail('سجّل الدخول بحساب الإدارة.', 401);
  if (!(await schoolStaffPreview(db, user))) fail('معاينة التجربة متاحة للمحررين فقط.', 403);
}

const meta = (l, index) => ({index, title: l.title, subtitle: l.subtitle || '', template: l.template, minutes: l.minutes, format: 2});

export async function pilotOverview(db, user) {
  await requireStaff(db, user);
  return {courses: PILOT_COURSES.map(({course, lessons}) => ({
    slug: course.slug, title: course.title, description: course.description, units: course.units, capstone: course.capstone,
    lessons: lessons.map((l, i) => { try { validateCardLesson(l); return {...meta(l, i), valid: true}; } catch (e) { return {...meta(l, i), valid: false, error: e.message}; } }),
  }))};
}

export async function pilotLesson(db, user, slug, index) {
  await requireStaff(db, user);
  const entry = PILOT_COURSES.find(c => c.course.slug === slug);
  const raw = entry?.lessons[index];
  if (!raw || !Number.isInteger(index)) fail('الدرس غير موجود.', 404);
  let lesson;
  try { lesson = validateCardLesson(raw).lesson; } catch (e) { fail('الدرس غير صالح: ' + e.message, 422); }
  return {course: entry.course.title, lesson: await resolveCardVisuals(lesson), snapshot: cardSnapshot(raw), hasNext: index < entry.lessons.length - 1};
}
