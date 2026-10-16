# قياس الأداء وإصلاحاته

المسؤول: المدير التقني. التاريخ:16 أكتوبر2026. قياس Lighthouse mobile بالمحاكاة الافتراضية على Chromium نفسه. المقارنة الأساسية قبل/بعد هي محلية؛ صف النسخة المنشورة أدناه خط أساس مستقل لا يُنسب إليه تحسن لم يُنشر بعد. هذه عينات مختبرية منفردة وليست توزيع CrUX أو قياس INP ميدانياً.

| المقياس | المنشور قبل | المحلي قبل | المحلي بعد |
|---|---|---|---|
| Performance | 60 | 56 | 84 |
| FCP | 1.90 s | 2.83 s | 1.97 s |
| LCP | 4.49 s | 4.14 s | 4.02 s |
| CLS | 0.525 | 0.525 | 0.0035 |
| TBT | 59 ms | 47 ms | 73 ms |
| انتظار الخادم في Lighthouse | 43 ms | 2261 ms | 1845 ms |
| حجم النقل | 522.0 KiB | 533.5 KiB | 588.4 KiB |

درجات المحلي بعد: Accessibility 100، Best Practices 96، SEO 100. درجة Lighthouse SEO100 لا تختبر جميع Canonical/Schema/الفهرسة؛ فحص SEO المستقل132 تحققاً له نطاق أوسع.

## الإصلاحات والمشكلة المتبقية

- **PERF-01 (P2) — أُصلح محلياً:** طلب خط خارجي حاجب للعرض واعتماد على Google Fonts وقت الزيارة. الملفات: `app/fonts.css`, `app/globals.css`, `app/layout.jsx`, `public/fonts/`. التحقق: Self-hosted WOFF2 with original license and source manifest; no Google Fonts stylesheet on final page.
- **PERF-02 (P1) — أُصلح محلياً:** قفزة كبيرة في التخطيط عند وصول المحتوى المؤجل وتحرك التذييل. الملفات: `components/PageLoading.jsx`, `app/layout.jsx`, `app/search/loading.jsx`, `app/contribute/loading.jsx`, `app/yemen-in-numbers/timeline/loading.jsx`. التحقق: Local lab CLS 0.525 to 0.0035407455176914428.
- **PERF-03 (P2) — أُصلح محلياً:** طلب فارغ إضافي في نهاية كل قائمة Supabase يزيد زمن انتظار الخادم. الملفات: `lib/pagination.js`, `lib/data.js`, `tests/platform.test.mjs`. التحقق: Exact count terminates pagination without truncating lower server caps; 1203 rows with cap200 uses7 calls vs8; small1-row list1 call vs2.
- **PERF-04 (P2) — متبقٍ:** LCP المختبري ما زال فوق هدف2.5 ثانية مع تأخر استجابة البيانات من بيئة الفحص. الملفات: `lib/data.js`, `lib/supabase-server.js`. التحقق: Measured 4019.309999999999 ms; remeasure real deployment/region before deciding cache architecture; no stale-data cache introduced.

## التفسير والحدود

- تحسن ثبات التخطيط بوضوح؛ قيمة CLS النهائية ضمن هدف0.1. قصر زمن منع الخيط الرئيسي في العينة لا يثبت INP≤200ms؛ INP لم يُقَس ميدانياً.
- LCP النهائي ما زال فوق2.5ث؛ لا إعلان اجتياز Core Web Vitals. تتأثر النتيجة بموقع Supabase بالنسبة إلى خادم الفحص وتبدل الشبكة والتحميل. ظهرت بعض مهلات قراءة إعدادات الموقع في الفحص الجماعي؛ يعرض التطبيق الإعدادات الافتراضية عندها، ولم تفشل صفحات المحتوى في الجولة النهائية.
- TBT وحجم النقل لم ينخفضا في كل عينة. ارتفع حجم النقل بعد استضافة الخطوط الحالية محلياً؛ لا ادعاء بتخفيض جميع الأحجام. الحزمة المشتركة بقيت103kB في build قبل/بعد؛ زاد قارئ PDF والمقارنة قليلاً مقابل وظائف الأمان والوصول والتصدير.
- لم يُضف cache عابر للجلسات إلى البيانات التحريرية أو الخاصة لإخفاء زمن الجلب. pagination المحسن يبقي نتائج النشر والمصادر الحالية، ويحافظ على إكمال الصفحات حتى مع سقف استجابة أقل من المطلوب.
- ملفات الخط مع الرخصة وSOURCES.json محفوظة في public/fonts. تحميل PDF والمشغلات الثقيلة يبقى عند الحاجة؛ الفيديو الخارجي لا يُحمّل قبل طلب الزائر.
- الصور والرسوم النهائية فُحصت بصرياً، ومنها timeline-after.png بعد إصلاح اختيار SVG ورؤوس الرسم. عرض152حالة لا يمثل اختبار جميع الأجهزة أو الشبكات أو حمل إنتاج متزامن.

المراجع: [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)، [Web Vitals](https://web.dev/articles/vitals)، [Next.js streaming/status codes](https://nextjs.org/docs/app/api-reference/file-conventions/loading). الأرقام الخام في evidence/lighthouse-*.json، والفرق في evidence/performance-comparison.json.
