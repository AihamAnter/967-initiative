import {readFile,writeFile} from 'node:fs/promises';
const additions=JSON.parse(await readFile('data/yemeni-figures/additions-100.json','utf8'));
const plan=JSON.parse(await readFile('data/yemeni-figures/additions-100-plan.json','utf8'));
const saved=JSON.parse(await readFile('docs/yemeni-figures-additions-100-result.json','utf8'));
const verified=JSON.parse(await readFile('docs/yemeni-figures-additions-100-verification.json','utf8'));
if(saved.errors.length||verified.errors.length||verified.verifiedNewProfiles!==100)throw Error('Do not publish a completion report before verification passes.');
const groups=new Map();for(const x of additions){const k=x.record.field;groups.set(k,[...(groups.get(k)||[]),x]);}
const words=additions.map(x=>x.profile.sections.flatMap(s=>s.paragraphs).join(' ').trim().split(/\s+/).length);
const uniqueSources=new Set(additions.flatMap(x=>x.profile.sources.map(s=>s.url)));
const metrics=[['الشخصيات','figures'],['أقسام السير','sections'],['المعلومات التعريفية','facts'],['المحطات الزمنية','timeline'],['الأعمال والإسهامات','works'],['إحالات المصادر داخل الملفات','sources']].map(([label,key])=>key==='figures'?`| ${label} | ${plan.beforeCount} | ${plan.addedCount} | ${plan.afterCount} |`:`| ${label} | ${plan.before[key]} | ${plan.added[key]} | ${plan.after[key]} |`).join('\n');
const list=[...groups].map(([field,rows])=>`## ${field} — ${rows.length}\n\n`+rows.map(x=>`- [${x.record.full_name}](https://967-initiative.vercel.app/yemen-map/figures/${x.record.slug}) — ${x.record.known_for}`).join('\n')).join('\n\n');
const text=`# إضافة 100 شخصية إلى «اكتشف اليمن» — 24 أكتوبر 2026

أُضيفت ونُشرت **100 شخصية أخرى**، فارتفع العدد من **170 إلى 270 شخصية**، بزيادة **${(100/170*100).toFixed(1)}%**. بقيت السجلات والسير الـ170 السابقة مطابقة لنسختها قبل هذه الدفعة.

| المحتوى | قبل الدفعة | المضاف | الإجمالي |
| --- | ---: | ---: | ---: |
${metrics}

لكل شخصية جديدة **أربعة أقسام سيرة على الأقل**، وخمس معلومات تعريفية على الأقل، وثلاث محطات زمنية على الأقل، ومصدران على الأقل. بلغ متوسط السيرة **${Math.round(words.reduce((a,b)=>a+b,0)/100)} كلمة عربية**، وأقصرها **${Math.min(...words)} كلمة**، بالإضافة إلى المعلومات والجداول والأعمال. تضم الدفعة **${uniqueSources.size} رابط مصدر مختلفًا**. تختلف التفاصيل بحسب المادة المتاحة لكل شخصية. تُترك سنة المحطة فارغة عند عدم ثبوتها، ويُعرض وصفها الزمني كما تتيحه المصادر.

تغطي الملفات النشأة والتكوين، والمسيرة المهنية أو العلمية، والأعمال أو الإنجازات، والمحطات الزمنية والإسهامات. رُبطت عناصر السيرة بمصادرها. فُصلت الجنسية عن الأصول اليمنية لدى شخصيات المهجر، ووُضحت التواريخ التقريبية أو المختلف فيها. لم تُضف صور أو حسابات تواصل تخمينية، ولم تُنسخ نصوص القصائد والأغاني والخطب.

## التحقق

طُوبقت **${verified.verifiedProfiles} سيرة** مع البيانات المحفوظة، ومنها **100 ملف جديد**. ظهر **${verified.anonymousVisible} ملفًا منشورًا** في القراءة العامة. اجتازت **${verified.http.length} صفحة عامة** فحص الاستجابة والمحتوى، بما فيها صفحات الشخصيات المئة الجديدة. بقيت السير المنظمة في حاوي التخزين الخاص، وبقي الوصول المباشر غير المصرح به مرفوضًا. استُخدمت آلية الحفظ وسجل التدقيق الحاليان دون ترحيل قاعدة البيانات.

اجتازت اختبارات المشروع **269 اختبارًا** دون إخفاق، مع اختبار واحد متجاوز. وأعيد تشغيل الاختبارات العشرة الخاصة بالشخصيات بعد آخر جولة تحرير فنجحت جميعها. تحقق الفحص من سلامة المراجع، وعدم تكرار الأسماء أو الهويات، وتطابق الشخصيات السابقة مع نسختها المحفوظة.

تُحفظ تفاصيل النتيجة في [تقرير الاستيراد](yemeni-figures-additions-100-result.json)، و[تقرير التحقق المستقل](yemeni-figures-additions-100-verification.json)، و[خطة المحتوى والتعداد لكل شخصية](../data/yemeni-figures/additions-100-plan.json).

${list}

## تشغيل الحزمة

الحزمة الجديدة: [additions-100.json](../data/yemeni-figures/additions-100.json). والحزمة الكاملة: [profiles.json](../data/yemeni-figures/profiles.json). تُحفظ دفعات المراجعة الأربع بجوارها. تُعد تقارير التوسعة السابقة سجلات تاريخية.

الأمر التالي يفحص الإضافات ولا يغير البيانات. يتطلب إعدادات الاتصال والنسخة المرجعية الخاصة المحلية في .audit-tools/figures-expansion-100/live-baseline.json:

    node --env-file=.env.local scripts/import-figure-additions-100.mjs --dry-run

للتطبيق يستخدم الأمر نفسه مع --apply. الأداة تضيف الملفات الناقصة فقط، وترفض الكتابة فوق أي شخصية موجودة تختلف عن الحزمة. وللتحقق المستقل: node --env-file=.env.local scripts/verify-figure-additions-100.mjs.

[فتح صفحة اكتشف اليمن](https://967-initiative.vercel.app/yemen-map#yemeni-figures).
`;
await writeFile('docs/yemeni-figures-additions-100-report.md',text);
console.log(JSON.stringify({before:170,added:100,total:270,averageBiographyWords:Math.round(words.reduce((a,b)=>a+b,0)/100),minimumBiographyWords:Math.min(...words),uniqueSources:uniqueSources.size,groups:[...groups].map(([field,rows])=>({field,count:rows.length}))},null,2));
