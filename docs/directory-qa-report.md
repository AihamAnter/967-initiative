# تقرير اختبار دليلي المؤسسات

تاريخ آخر تشغيل: **2026-10-26**

## النتائج الآلية

- `npm run lint`: نجح بلا أخطاء؛ بقي تحذيران قديمان في `components/PdfReader.jsx` لا يرتبطان بالدليلين.
- `npm run build`: نجح، وولّد المسارات الأربعة الجديدة كمسارات ديناميكية.
- `npm test`: نجح **328** اختبارًا من أصل **329** في التشغيل الكامل النهائي، وتُجاوز اختبار واحد فقط لأنه يتطلب `TEST_POSTGRES_ADMIN_URL` خارجيًا؛ لا توجد إخفاقات.
- `node --test tests/institution-directory-database.test.mjs`: نجح على PostgreSQL المعزول (PGlite)، ويغطي إنشاء المخطط، بقاء بيانات قديمة، RLS، منع الكتابة المباشرة، الحفظ الذري، تعارض المراجعة، الحفظ المطابق بلا مساهمة، الحذف والاستعادة وصلاحية Management.
- `npm run data:directories -- --kind=all`: نجحت المحاكاة لـ115 سجلًا تعليميًا و160 سجلًا صحيًا، ولم تفتح اتصال قاعدة بيانات ولم تكتب بيانات.

## سيناريوهات Playwright

نجحت على معاينة محلية تستخدم `LOCAL_CONTENT_FALLBACK=1` كي لا تتصل بمشروع Supabase المهيأ:

- فتح `/universities` وظهور 115 سجلًا و14 محافظة.
- البحث عن «جامعة تعز» وإرجاع نتيجة واحدة.
- فتح التفاصيل ثم الرجوع إلى رابط البحث نفسه مع `q` وموضع القسم.
- فتح `/medical-centers` وظهور 160 سجلًا و22 محافظة.
- فتح سجل صحي والتحقق من العبارة المؤرخة: «وفق بيانات 31 ديسمبر 2023؛ لا يعني ذلك أنها مفتوحة الآن».
- ظهور 12 بطاقة في الصفحة الأولى وPagination.
- لا يوجد overflow أفقي عند عرضي 390 و320 بكسل.
- لا توجد أخطاء Console. ظهر تحذير Next.js مستقبلي عام متعلق بـ`scroll-behavior: smooth` الموجود أصلًا في النمط العام.

## لقطات فعلية

- `docs/screenshots/universities-desktop.png`
- `docs/screenshots/universities-mobile.png`
- `docs/screenshots/medical-centers-desktop.png`
- `docs/screenshots/medical-centers-mobile.png`
- `docs/screenshots/medical-centers-desktop.accessibility.yml`

## ما لم يُنفذ على أنظمة خارجية

- لم تُطبق migration على Supabase إنتاجي أو تجريبي خارجي.
- لم يُشغّل الاستيراد بوضع `--apply`.
- لم تُختبر جلسة Admin حقيقية بمفاتيح إنتاج؛ عُوّض ذلك باختبار صلاحيات وحفظ RPC فعلي داخل PostgreSQL معزول.
- لم يحدث دمج في `main`، ولم يحدث push أو نشر Vercel.
