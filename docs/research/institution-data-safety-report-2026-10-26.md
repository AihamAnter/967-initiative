# تقرير إصلاح سلامة بيانات دليلي المؤسسات

> **تنبيه بتاريخ 26 أكتوبر 2026:** ملفات SQL ذات التواريخ القديمة المذكورة هنا موجودة في أرشيف للرجوع إليها وللاختبارات التاريخية؛ ليست ترحيلات نشطة، ولا تُشغَّل على إنتاج 967. الـBaseline الحالي المرشح هو `supabase/migrations/20261026215718_remote_schema.sql` ولم تُسوَّ حالته في سجل الإنتاج بعد.

تاريخ التنفيذ: **2026-10-26**  
الفرع: `fix/institution-directory-data-safety`  
حالة الإنتاج: **لم تحدث أي كتابة على Supabase الإنتاجي، ولم يُدمج الفرع في `main`، ولم يُنشر إلى Vercel.**

## النتيجة التنفيذية

| البند | النتيجة |
| --- | --- |
| المشاكل المؤكدة | اختلاف تمثيل بيانات المصدر بين JSON وقاعدة البيانات، إمكان نشر سجل جديد عبر خيار الحفاظ على النشر، احتساب تاريخ الوصول ضمن حداثة المعلومة، وFallback إنتاجي صامت عند غياب Supabase |
| الاستيراد المتكرر | توحيد المصدر قبل المقارنة والحفظ؛ إعادة الاستيراد المطابق لا تخطط تحديثًا ولا تكرر العلاقات أو الملاحظات |
| حماية التحرير | لا يستبدل الاستيراد قيمة حالية غير فارغة، ورُفض `--overwrite-existing`، وتبقى الهوية الثابتة وحالة النشر والحذف المنطقي كما هي |
| النشر | السجل الجديد مسودة افتراضيًا حتى لو كان JSON منشورًا؛ النشر يحتاج قائمة `stable_key` صريحة وتأكيدًا مستقلًا |
| المصادر | فُصل تاريخ نشر المصدر والوصول وحالة المعلومات والتحقق من المعلومة، مع الاحتفاظ بـ`checked_at` للتوافق القديم |
| حداثة الأدلة | أُخرج `accessed_at` و`checked_at` من حساب الحداثة؛ السنة والسنة الدراسية تبقيان بالدقة الأصلية من دون اختلاق يوم |
| Fallback | متاح فقط عندما لا تكون `NODE_ENV=production`؛ غياب Supabase أو فشله في الإنتاج يسجل حدث مراقبة ويعرض مسار الخطأ بدل بيانات JSON محلية |
| الإدارة | حفظ الإحداثيات وروابط التواصل والاتصال والعنوان والخريطة والتحقق والمصادر والبرامج والفروع والنشر والصور مثبت باختبار قاعدة معزولة |
| قاعدة البيانات | أُنشئ migration إضافي ومتوافق؛ لم يُطبق على الإنتاج |
| الإنتاج | بقي دون تعديل في هذه المهمة |

## الملفات الرئيسية المعدلة

- `lib/directoryImportMerge.js`: تمثيل موحد للمصادر، إزالة تكرار metadata من الملاحظات، هوية URL ثابتة، وحماية `stable_key` و`slug`.
- `scripts/import-institution-directories.mjs`: مسودات افتراضية، قائمة نشر فردية، تأكيدان منفصلان، ومنع الاستبدال الجماعي.
- `scripts/apply-directory-enrichment.mjs`: استخدام هوية المصدر والتمثيل الموحد نفسيهما.
- `supabase/archive/legacy-migrations/202610260001_institution_directory_data_safety.sql`: أعمدة metadata مستقلة، حفظ RPC متوافق، no-op دلالي، حماية الهوية، وحاجز نشر استيراد جديد.
- `lib/institutionDirectories.js`: حداثة الأدلة ومؤشر الجودة متعدد الأبعاد.
- `lib/data.js` و`lib/operationalEvents.js`: منع Fallback الإنتاجي الصامت وتسجيل تعطل الدليل.
- `lib/institutionAdminPayload.js` و`components/InstitutionAdminPanel.jsx`: إدخال/إخراج تواريخ المصدر المنفصلة مع دعم الصيغة القديمة.
- `components/InstitutionDetail.jsx`: عرض التواريخ بدقتها الأصلية، التحقق من الروابط الخارجية، وإظهار روابط التواصل الرسمية.
- اختبارات الدليل وقاعدة البيانات وCLI، ووثائق الإثراء وQA والتطبيق.

## تغطية الاختبارات

اختبار PostgreSQL المعزول يطبق migration الأساسي ثم migration الجديد، ويثبت:

- بقاء بيانات موجودة مسبقًا.
- إنشاء استيراد service-role كمسودة رغم `is_published: true`.
- السماح بالنشر فقط عندما يطابق `p_origin` المفتاح الثابت الموافق عليه.
- ثبات `revision` وعدد المساهمات عند الحفظ المطابق.
- عدم تكرار المصادر والعلاقات بعد القراءة وإعادة الاستيراد.
- بقاء الموقع والاتصال وروابط التواصل والشعار والبرامج والفروع.
- منع تغيير `stable_key` أو `slug`.
- منع الكتابة المباشرة، وتطبيق RLS، ومنع الجلسة القديمة من الكتابة فوق تعديل أحدث.
- الحذف المنطقي والاستعادة وصلاحية Management.

النتائج النهائية:

- `npm.cmd test`: **337 ناجح، 0 فاشل، 1 متجاوز** بسبب غياب `TEST_POSTGRES_ADMIN_URL` الاختياري.
- `npm.cmd run lint`: **0 أخطاء**؛ تحذيران قديمان في `components/PdfReader.jsx` خارج نطاق المهمة.
- `node --test tests/institution-directories.test.mjs tests/institution-directory-database.test.mjs tests/institution-directory-import-cli.test.mjs`: **14 ناجحًا، 0 فاشل** في التشغيل المرحلي قبل توسيع الاختبارات.
- `npm.cmd run build` مع `NEXT_VALIDATION_BUILD=1`: **نجح**؛ بقي تحذير CSS قديم عن `align-items: end` وتحذيرا قارئ PDF.
- `scripts/test-institution-directory-browser.mjs`: **نجح** على 1440 و390 و320 بكسل، مع 0 أخطاء Runtime، واحتفاظ رابط الرجوع بمعامل البحث، وإخفاء فلتر الطوارئ لعدم وجود قيم موثقة.

## أوامر التحقق المنفذة

```powershell
node --test tests/institution-directories.test.mjs tests/institution-directory-database.test.mjs tests/institution-directory-import-cli.test.mjs
npm.cmd run lint
npm.cmd test
$env:NEXT_VALIDATION_BUILD='1'; npm.cmd run build
$env:LOCAL_CONTENT_FALLBACK='1'; $env:NEXT_TASK_PREVIEW='1'; npm.cmd run dev -- --port 3111
$env:CHECK_BASE_URL='http://127.0.0.1:3111'; node scripts/test-institution-directory-browser.mjs
```

## مخاطر وقيود متبقية

- migration الجديد مطلوب قبل أن تحفظ قاعدة Supabase الحقول الجديدة للمصادر كأعمدة مستقلة؛ الكود يدعم قراءة الملاحظات القديمة خلال الانتقال.
- لم يُستخدم PostgreSQL خارجي حقيقي لأن `TEST_POSTGRES_ADMIN_URL` غير مضبوط؛ نُفذت دورة RPC كاملة على PGlite المعزول.
- لم تُستخدم جلسة Admin إنتاجية ولم تُجر أي كتابة أو حذف أو migration في الإنتاج.
- تطبيق migration والنشر والدمج خطوات مستقلة تحتاج موافقة صريحة ونسخة احتياطية قابلة للاستعادة.
