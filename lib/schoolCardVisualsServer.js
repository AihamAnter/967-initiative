// مدرسة 967 — الإصدار الثاني: تعبئة العناصر المرئية من بيانات الموقع على الخادم قبل إرسال الدرس.
// stat: سلسلة المؤشر من «اليمن بالأرقام» (القيم المنشورة نفسها في صفحة المؤشر، ومصدرها).
import {getStatIndicator} from './data';
import {lessonVisuals, statSeries} from './schoolCardVisuals';

// يعيد نسخة من الدرس فيها data لكل عنصر stat؛ فشل التحميل لا يكسر الدرس (يظهر تنبيه داخل الرسم).
export async function resolveCardVisuals(lesson) {
  const copy = structuredClone(lesson);
  const stats = lessonVisuals(copy).filter(v => v.kind === 'stat');
  const slugs = [...new Set(stats.map(v => v.indicator))];
  const found = new Map(await Promise.all(slugs.map(async slug => [slug, await getStatIndicator(slug).catch(() => null)])));
  for (const v of stats) v.data = statSeries(found.get(v.indicator), v.years);
  return copy;
}
