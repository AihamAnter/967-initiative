# نتائج الاختبارات

التاريخ 23 أكتوبر 2026؛ Node24.18.0، Next15.5.28، Chromium1228، PostgreSQL17.10 محلي و PGlite معزول. لا تُحمّل fixtures ملف البيئة ولا تتصل بالإنتاج.

| الفحص | النتيجة | الدليل |
|---|---|---|
| النسخة الأصلية npm test |236 ناجحاً قبل التعديل|تشغيل هذه الجلسة على HEAD6158419؛ الرقم مستقل عن الاختبارات الجديدة|
| npm test النهائي |272 اختباراً ناجحاً، 0 فاشل، 0 skipped|[unit-tests.txt](evidence/unit-tests.txt)|
| PostgreSQL الفعلي للأمان والتزامن |18/18 بلا تخطٍّ في التشغيل الموجه؛ مشمولة في المجموعة الكاملة عند ضبط المتغيرين|[security-postgresql-combined.txt](evidence/security-postgresql-combined.txt)|
| حارس آخر مدير |اتصالان مستقلان، RC/RR، حذف/تخفيض، انتظار قفل مثبت|[management-concurrency.txt](evidence/management-concurrency.txt)|
| المراجع المستقل |31/31 على PGlite، مع regression التسجيل المموه|[supervisor-review.md](supervisor-review.md)|
| UX |12/12 رحلة؛ 48 قياساً و 12axe؛ 0JS errors|[ux-browser-results.json](evidence/ux-browser-results.json)|
| المناظرات |15 سيناريو، 4 مقاسات، 0axe/runtime errors|[browser-results.json](evidence/debates/browser-results.json)|
| التواصل والإدارة |7/7، 8 قياسات، 0JS errors؛ حفظ وحالات وحد حقيقي، والأعطال المصطنعة معلّمة|[results.json](evidence/contact/results.json)|
| المنصة على production build |21 مساراً، 147 قياساً، 42axe، 21 تكبير 200%؛ 0runtime/hydration errors|[platform-browser.json](evidence/platform-browser.json)|
| Lint |0 أخطاء، 3 تحذيرات img سابقة|[lint.txt](evidence/lint.txt)|
| بناء الإنتاج |exit0؛ بناء منفصل NEXT_VALIDATION_BUILD=1|[production-build.txt](evidence/production-build.txt)|
| Lighthouse |12 مساراً محلياً، عينات مختبرية؛ لا INP ميداني|[after-lighthouse.json](evidence/after-lighthouse.json)|
| إنتاج للقراءة فقط |approved/approved و lifecycle و RPC200null|[production-publication-readonly.json](evidence/production-publication-readonly.json)|
| SEO عبر HTTP |165/165 ناجحة على بناء التسليم|[seo-http.json](evidence/seo-http.json)|
| API سلبي وترويسات الأمان |27/27 ناجحة، دون رسالة صحيحة أو حساب إنتاج|[security-http-after.json](evidence/security-http-after.json)|
| مسودة بريد موجود بلا جلسة |نجحت رحلة متصفح على بناء التسليم؛ التسجيل المموه محاكى والدخول محلي فعلي|[auth-handoff-browser.json](evidence/auth-handoff-browser.json)|
| وظائف PDF الفعلية |تحميل ورسم، زر/لوحة مفاتيح، تكبير، رقم عربي، بحث لا نتائج؛ صفر أخطاء تشغيل|[pdf-browser.json](evidence/pdf-browser.json)|
| فحص الأسرار |صفر تطابق للمفتاح الخدمي في الملفات المرشحة و112 ملف عميل؛ env.local خارج Git|[secret-check.json](evidence/secret-check.json)|

لا تُجمع إعادة تشغيل المجموعة المستقلة أو الموجهة مع 272 لتضخيم عدد الاختبارات. فحوص المتصفح تصف صفحات وسيناريوهات وقياسات، وليست 272 اختباراً إضافياً.

اكتشفت الاختبارات عيوباً وأُعيدت بعد الإصلاح: عداد BEFORE INSERT عند upsert؛ فقدان draft بعد reset؛ idempotency عند ضياع رد ثم تعديل النص؛ Tab trap؛ تسجيل مموه دون session. صححت أيضاً افتراضات محددات/hydration ومحاكي REST لمعلمة columns؛ النتائج الخام المشار إليها نتائج الجولة الناجحة الأخيرة.

## إعادة التشغيل

شغّل PostgreSQL محلياً مستقلاً ثم اضبط TEST_POSTGRES_ADMIN_URL و TEST_SECURITY_POSTGRES_ADMIN_URL على loopback فقط. مكتبة pg وأدوات Playwright/axe/Lighthouse معزولة في .audit-tools وليست اعتماديات إنتاج. npm test دون متغير PostgreSQL يتخطى اختبار التزامن صراحةً؛ لا يعد ذلك إثباتاً له.

شغّل fixture بـ node scripts/inline-editor-preview-fixture.mjs --publication-preview --prelaunch-security، ومزوّد المناظرات المنفصل بأعلامه في [debates-notes.md](debates-notes.md). اختبارات تغيير المصدر وبيانات المجلة والإعدادات تُشغّل متتابعة دون التقاط صور أو قياسات أداء بالتزامن مع الأعطال المصطنعة.

لم نختبر SMTP أو Turnstile حقيقيين أو Supabase REST/Storage المستضافين بحسابات، أو أجهزة فعلية أو قارئ شاشة أو Safari/Firefox. المتاح محلياً Chromium فقط. تم فحص reduced-motion وتكبير نص CSS إلى 200%؛ هذا لا يساوي اختبار قارئ شاشة بشرياً.
