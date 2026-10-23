# أدلة الأمان والتواصل — 23 أكتوبر 2026

هذه مراجعة وتنفيذ محليان. لم تُستخدم حسابات إنتاج، ولم تُطبق SQL على Supabase المستضاف، ولم تُنقل ملفات أو تُرسل دعوات/رسائل بريد. الملفات الجديدة للمراجعة والتطبيق المنفصل فقط.

| البند | الدليل الأصلي | الإصلاح المحلي | التحقق والحد المتبقي |
|---|---|---|---|
| L-05 | `authorizeEditorRequest` يتحقق من الدور كل طلب؛ مسارات تغيير الأدوار كررت حارساً منفصلاً. دوال RLS السابقة تقرأ `editors` دون حالة حظر المصادقة أو تأكيد البريد. | توحيد حارس إدارة الحسابات؛ رفض البريد غير المؤكد والحظر حتى مع JWT قديم؛ دالة `active_editor_role` مشتركة لـRLS/المناظرات/المهام/الترتيب، دون صلاحية self-assignment. | اختبارات API للحارس وSQL/RLS حقيقية مع anon/regular/unconfirmed/admin/management/auth-banned/revoked نجحت محلياً على PostgreSQL17.10 وPGlite. اختبار SMTP والتسجيل والخروج وتدوير JWT وStorage HTTP المستضاف يحتاج Staging؛ لا يدعي هذا الملف اكتمالها. |
| L-06 | أعدنا إنتاج `42501` لاستعلام anon عن الأعمال بسبب سياسة قديمة تستعلم عن `editors`، وأثبتنا ظهور مجال منشور تحت قسم غير منشور في SQL القديم. | migration مستقل يفصل public/editor ويقيد مجال/مؤشر/قيمة/صلة المصدر بنشر الوالد ونشاط المصدر. لا تغيير للمحتوى/المراجع. | استعلامات RLS للأدوار نجحت على مخطط معزول؛ مصدر معطل يخفي القيم/الصلات العامة ويظل متاحاً للمحرر. التطبيق المستضاف والتحقق من السياسات الفعلية قبل/بعد مطلوبان. |
| L-07 | `messages` لا تحمل حالة وواجهة الإدارة تعرض النص فقط؛ النموذج يحتفظ بنصه عند الخطأ أصلاً. | حالات `new`/`in_progress`/`resolved`، افتراضي متوافق للسجلات القديمة، ترشيح وعدّ الجديد، تحديث status فقط بصلاحية العمود وRLS مع وقت/فاعل التغيير. المرجع يُحفظ نصياً داخل message بلا كسر المخطط القديم. مسودات التصحيح مفصولة حسب صفحة المرجع. معرّف إرسال عشوائي يمنع تكرار نفس محاولة الحفظ عند إعادة المحاولة. | حفظ API والتحقق من فشل503/حد429/مرجع/إعادة إرسال بنفس UUID وحالات السجلات القديمة اختُبرت. لا إرسال بريد أو إشعار خارجي. سيناريو المتصفح الحقيقي `scripts/test-prelaunch-contact.mjs` نجح7/7؛ `evidence/contact/results.json` و8 صور320/390/768/1440 للنموذج ولوحة الرسائل. API وRLS رفضا المحرر بعد سحب دوره. |
| S-02 | `checkRoleChange` يجري count ثم mutation؛ وحده لا يحمي من سباق طلبين. guard المقترح يستخدم advisory lock ثم SELECT قد يبقى تحت لقطة Repeatable Read قديمة. | `management_guard` بصف واحد وعدّاد يُحدّث ذرياً داخل trigger لكل ترقية/تخفيض/حذف، مع قفل الجدول أثناء التهيئة. رفض آخر مدير، تحديث bulk يُرجع المعاملة كاملة، وتصادم API يصبح409. self-demotion يبقى مرفوضاً في API. | الاختبار التسلسلي حقيقي وناجح في PGlite؛ **ليس إثبات تزامن**. اختبار اتصالين PostgreSQL17.10 مستقلين وbarrier لقفل فعلي موجود في `tests/prelaunch-management-concurrency.test.mjs` ويختبر Read Committed وRepeatable Read مع DELETE/UPDATE؛ **نجح5/5** بلا skip. أُثبت انتظار القفل، رفض الطلب الثاني23514/40001، وبقاء مدير واحد والعداد1. كشف الاختبار تضخيم العداد مع BEFORE INSERT/UPSERT؛ أصلحناه باستخدام AFTER trigger وأضفنا regression. التطبيق والتحقق المستضافان فقط متبقيان. |
| S-03 | `media` عام و`getPublicUrl` يستخدم للـPDF/صور الأعمال حتى قبل نشر سجل العدد. README يصرح بذلك. لا يوجد متطلب أو دليل محلي يثبت وجود ملفات سرية فعلية. | توضيح ظاهر عند الرفع أن الملفات عامة وأن المسودة قد تكون غير سرية. لا bucket جديد ولا نقل/حذف ملفات إنتاج ولا تغيير الروابط. | Verified لنموذج المواد العامة/المسودات غير السرية فقط؛ سرية ملفات محددة لا يمكن إثباتها من الكود. خطة الملفات السرية أدناه مشروطة بإثبات الحاجة. |
| S-04 | خريطة rate limit داخل process قابلة للتجاوز بتعدد نسخ serverless وتستخدم IP خام داخل الذاكرة. Turnstile يتحقق من success فقط. | عدّاد PostgreSQL مشترك:8 محاولات صحيحة/10 دقائق؛ HMAC-SHA256 لا IP خام؛ RPC للخدمة فقط، جدول غير مقروء للمستخدمين، تنظيف منتهي الصلاحية عند الطلب التالي. رفض آمن503 إذا migration غير مثبتة. Turnstile يتأكد من success/hostname/action=contact مع timeout وعدم إرسال remoteip. | اختبارات SQL للحد والتنظيف ومنع قراءة الجدول/RPC، واختبارات API لـ429/503 وتطابق hostname/action نجحت. CAPTCHA خارجي حقيقي وقياس حمل Vercel متعدد النسخ يحتاجان Staging. البنية المشتركة لا تحتاج خدمة مدفوعة جديدة. |

## ما اختُبر فعلياً

- `node --test tests/prelaunch-security.test.mjs tests/security.test.mjs tests/content-pages.test.mjs tests/tasks.test.mjs`: **34 ناجحاً، 0 فاشل** في أول تشغيل ناجح. تشمل12 حالة في الملف الجديد (مع الاختبارات الفرعية).
- `node --test tests/prelaunch-management-concurrency.test.mjs` مع `TEST_POSTGRES_ADMIN_URL` المحلي: **5 ناجحة، 0 فاشل، 0 skipped**؛ سجل `evidence/management-concurrency.txt` يثبت انتظار القفل من اتصالين مستقلين.
- ESLint لملفات ContactForm/AdminDashboard/contactService/contactMessages/contactSubmission/adminAuthorization وواجهتي API: خرج0 دون تحذيرات.
- التشغيل النهائي `node --test tests/prelaunch-security.test.mjs tests/prelaunch-management-concurrency.test.mjs` مع متغيري PostgreSQL المحليين: **18 ناجحة، 0 فاشل، 0 skipped**، منها13 للحارس/API/RLS/الرسائل والحد ومعرّف الإرسال، و5 للتزامن؛ `evidence/security-postgresql-combined.txt`. نجحت12/12 على PGlite قبل إضافة اختبار بصمة الإرسال؛ `evidence/security-database.txt`. لا نستخدم PGlite لإثبات التزامن.
- الفحص الأول لم يجد PostgreSQL/Docker. جهّز المشرف لاحقاً PostgreSQL17.10 في أدوات الاختبار المعزولة على127.0.0.1:55439 مع pg8.16.3، فاستُكملت الاختبارات الحقيقية. لم يُستخدم اتصال محتمل بالإنتاج.

- المتصفح النهائي: **7 سيناريوهات ناجحة، 8 قياسات وصور، 0 أخطاء JavaScript، 0 overflow**. حفظ فعلي201 في قاعدة fixture؛ commit حقيقي ثم إسقاط الرد عمداً ثم تعديل النص وUUID مختلف وحفظ النسخة المعدلة؛ فشل503 محاكى مع إعادة تحميل ناجحة للمسودة؛ 429 فعلي من العداد؛ حالات متابعة محفوظة بعد reload؛ سحب صلاحية يرفض API/الواجهة. أصلح الاختبار عيب native form.reset/React onChange عند إعادة تعبئة القيم نفسها باستخدام onInput وحفظ snapshot قبل الإرسال.

## ترتيب الترحيل ومراجعة الاقتراح السابق

1. خذ snapshot من `pg_policies` و`pg_get_functiondef` ونسخة احتياطية وفق إجراءات المشروع خارج هذه المهمة، وراجع مخطط البيئة المستهدفة.
2. بعد ملفات المخطط/modules الحالية و`admin-roles.sql`، اختبر ثم اعتمد `202610230001_prelaunch_roles_rls.sql`، ثم `202610230002_management_guard.sql`، ثم `202610230003_contact_workflow.sql`.
3. اختبر الأدوار الفعلية على Supabase REST/Storage/RPC وعلى API قبل نشر الكود. الحساب المعتمد يحتاج بريداً مؤكداً وغير محظور؛ تعليق المشاركة في المناظرات عبر `public_profiles.suspended` منفصل عن حظر حساب المصادقة، وتظل قواعد المشاركة السابقة كما هي.
4. لا تطبق `launch-hardening-proposed.sql` بعد migrations الجديدة: راجعناه، وأصبحت إصلاحات سياساته في001 مع فحص وجود modules، وحل حارسه البديل في002. تطبيق المقترح لاحقاً يعيد استبدال guard العدّاد وقد يسبب drift؛ أبقه وثيقة اقتراح تاريخية فقط.
5. خدمة التواصل الجديدة تعتمد على RPC المشترك قبل النشر؛ غيابه ينتج503 ويحفظ مسودة المستخدم. متغير `CONTACT_RATE_LIMIT_SECRET` اختياري، ويستخدم المفتاح الخدمي الموجود عند غيابه؛ لا متغير NEXT_PUBLIC جديد للأسرار.

## حدود الخصوصية والتشغيل للعداد

- في Vercel فقط (`VERCEL=1`) يُستخدم header `x-vercel-forwarded-for` الذي يستبدله edge؛ تُهمل x-forwarded-for/x-real-ip القابلة للانتحال. على استضافة أخرى أو عند غياب الهوية الموثوقة يوجد حد unattributed مشترك؛ قبل إطلاق استضافة أخرى يلزم adapter موثوق خاص بها.
- يُحفظ digest ومجموع capped9 وexpires_at فقط؛ لا IP خام ولا بريد أو message في جدول الحد. البصمة ليست إخفاء هوية مضموناً؛ تعامل كبيانات تشغيل مستعارة، والمفتاح يبقى سرياً على الخادم.
- مدة صلاحية النافذة10 دقائق. التنظيف يجري عند الطلب الصحيح التالي؛ إذا انقطع المرور تبقى hashes المنتهية حتى الطلب اللاحق أو تنظيف تشغيلي. لا Cron وهمي ولا ادعاء حذف آني خلال هدوء المرور.
- التحويل إلى secret آخر يصفر حصص الهوية عملياً. لا يُطبع المفتاح أو token أو payload أو رسالة خطأ DB الخام. أحداث فشل contact تمر عبر `recordOperationalEvent` ذي schema مغلق.
- Turnstile اختياري. عند استخدامه يلزم widget hostname مطابق لـ`NEXT_PUBLIC_SITE_URL` في كل deployment وaction=contact؛ token لا يُعاد استخدامه، والنموذج يعيد ضبط challenge بعد كل محاولة.

## تشغيل اختبار PostgreSQL المتزامن

شغّل في قاعدة PostgreSQL محلية معزولة تملك صلاحية إنشاء قاعدة اختبار، باستخدام `TEST_POSTGRES_ADMIN_URL` (يُرفض غير loopback) ومكتبة `pg` المعزولة داخل `.audit-tools`، ثم `node --test tests/prelaunch-management-concurrency.test.mjs`. ينشئ قاعدة `test_967_guard_<random>` جديدة ويزيلها فقط بعد الاختبار؛ لا يستخدم جداول قاعدة قائمة. يتحقق من وصول الجلسة الثانية إلى lock wait قبل commit الجلسة الأولى، ثم يتأكد أن مديراً واحداً والعداد1 باقيان. لا تشغله بعنوان إنتاج.

أوامر إعادة التشغيل على بيئة الاختبار التي جهزها المشرف، ما دام PostgreSQL المحلي قائماً:

```powershell
$env:TEST_POSTGRES_ADMIN_URL='postgresql://prelaunch_test@127.0.0.1:55439/postgres'
$env:TEST_SECURITY_POSTGRES_ADMIN_URL=$env:TEST_POSTGRES_ADMIN_URL
node --test tests/prelaunch-security.test.mjs tests/prelaunch-management-concurrency.test.mjs
```

اختبار المتصفح يحتاج Next المحلي على3117 المرتبط بـfixture3417، مشغّلة بـ`node scripts/inline-editor-preview-fixture.mjs --publication-preview --prelaunch-security`، ثم `node scripts/test-prelaunch-contact.mjs`. ليست هذه أوامر إنتاج ولا تتصل بخدمة CAPTCHA أو SMTP. يعيد الاختبار الدور المؤقت والحدود في cleanup؛ قد تبقى رسائل fixture التجريبية إلى إعادة تشغيلها.

## خطة مشروطة للملفات السرية

إذا أكد مالك المحتوى أن ملفاً محدداً يجب أن يبقى سرياً، سجّل قائمة object keys وتصنيف السرية والمستخدمين المسموحين في سجل داخلي خارج Git. أنشئ bucket خاصاً منفصلاً لا يغيّر `media`، وضع policies للمحرر/القارئ المصرح له، وأنشئ روابط قصيرة العمر على الخادم بعد التحقق من الجلسة والدور. اختبر anon/regular/revoked/expired-link وعدم تسريب URL في HTML/الفهرسة. اختبر النسخ في Staging ثم انقل فقط الملفات المصنفة وبعد تفويض مستقل؛ أثبت نسخة سليمة وحدّث روابط السجلات المعنية بإجراء قابل للرجوع. لا تحذف المصدر العام إلا بعد فحص المراجع وتفويض إزالة الوصول العام؛ إبقاء نسخة عامة لنفس الملف لا يحقق السرية. الملفات العامة القديمة وروابطها تظل كما هي ما لم يشملها القرار المحدد.

## مراجع تقنية أولية

راجعنا سلوك UPDATE والتعارض تحت مستويات العزل في [وثائق PostgreSQL](https://www.postgresql.org/docs/16/transaction-iso.html)، ومتطلبات التحقق على الخادم في [وثائق Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/). تصميم العدّاد يتجنب الاعتماد على SELECT بلقطة قديمة؛ أُنجز الإثبات العملي لاتصالين كما هو موضح في سجل الأدلة أعلاه.
