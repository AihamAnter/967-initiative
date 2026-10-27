import test from 'node:test';
import assert from 'node:assert/strict';
import {splitRankingDescription,isEnrichedRankingDescription} from '../lib/rankingEditorial.js';

test('plain descriptions render exactly as before without extra cards',()=>{
 assert.deepEqual(splitRankingDescription('قيمة المؤشر تتغير مع الزمن.'),{intro:'قيمة المؤشر تتغير مع الزمن.',sections:[]});
 assert.deepEqual(splitRankingDescription(''),{intro:'',sections:[]});
});
test('fully enriched descriptions produce three separate factual panels',()=>{
 const explanation='المعيار يقيس المقارنة الاقتصادية وفق القيم الوطنية المتاحة لكل سنة على حدة دون وصف الأداء العام.';
 const why='يوضح الفارق بين القيم المنشورة للدول المختارة، ويتيح دراسة مدى اختلاف حجم الاقتصاد دون الخلط بين الحجم والرفاه.';
 const how='يُحسب ترتيب اليمن من الدول ذات البيانات في السنة نفسها؛ إذا تغيّر عدد الدول فلا تقارن المرتبتين مباشرة دون مراجعة القيم.';
 const limits='المراتب ليست تصنيفاً رسمياً للبنك الدولي ولا تثبت السببية، ولا تسمح وحدها بالحكم على جودة حياة الفرد أو حالة اليمن الراهنة.';
 const src=[explanation,'لماذا تهم المقارنة؟\n'+why,'كيف تقرأ الترتيب؟\n'+how,'حدود القراءة:\n'+limits].join('\n\n');
 const data=splitRankingDescription(src);
 assert.equal(data.intro,explanation);
 assert.equal(data.sections.length,3);
 assert.equal(data.sections[0].body,why);
 assert.equal(data.sections[2].title,'حدود القراءة:');
 assert.equal(isEnrichedRankingDescription(src),true);
 assert.equal(isEnrichedRankingDescription(explanation),false);
 assert.equal(isEnrichedRankingDescription(src.repeat(10)),false);
});
test('unknown paragraph headings remain displayable as text rather than disappearing',()=>{
 const data=splitRankingDescription('تعريف المعيار\n\nتنبيه للمحرر: احرص على المصدر.');
 assert.equal(data.sections[0].title,'معلومة إضافية');
 assert.match(data.sections[0].body,/تنبيه/);
});
