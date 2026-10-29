import {ARUD_STAGES} from './schoolArud.js';
// Server-only answer banks. Learners never receive the correct key before grading.
const fundamentals=[
 ['أيُّهما أساس التقطيع العروضي؟','الصوت المنطوق',['الصوت المنطوق','الرسم الإملائي فقط','عدد الكلمات','معاني الكلمات'],'نزن الأصوات كما تُنطق عند الإنشاد.'],
 ['كيف نعامل ألف كلمة «هذا» في الكتابة العروضية؟','نكتب الألف المسموعة',['نكتب الألف المسموعة','نحذف الهاء','نهمل المد','نعدّ حروف الرسم فقط'],'تكتب عروضيا «هاذا» لأن الألف منطوقة.'],
 ['أي كتابة عروضية تقرّب لفظ «لكن»؟','لاكن',['لكن','لاكن','لكنا','لكنن'],'يظهر المد المسموع في «لاكن».'],
 ['ماذا نفعل بحرف عليه شدة في التقطيع؟','نفكه إلى ساكن ثم متحرك',['نحذفه','نعده حرفًا واحدًا دائمًا','نفكه إلى ساكن ثم متحرك','نضاعف الحركة فقط'],'الحرف المشدد في النطق حرفان: الأول ساكن والثاني متحرك.'],
 ['كيف يُمثّل التنوين في الوصل عروضيا؟','نون ساكنة',['ألف زائدة دائمًا','نون ساكنة','حرف مد دائمًا','لا شيء'],'عند الوصل ينطق التنوين نونًا ساكنة.'],
 ['هل يُحتسب حرف مكتوب لكنه غير منطوق؟','لا، لا يدخل في التقطيع',['نعم دائمًا','لا، لا يدخل في التقطيع','يحسب حرفين','يعادل شدة'],'العبرة بالنطق لا بوجود الحرف على الورق.'],
 ['لماذا تختلف الكتابة العروضية عن المعتادة؟','لتمثيل الأصوات التي نسمعها',['لتغيير معنى البيت','لتمثيل الأصوات التي نسمعها','لتجميل الخط','لتغيير القافية'],'الكتابة العروضية تدون الملفوظ لتسهيل قياس الوزن.'],
 ['ماذا نراعي قبل تقطيع البيت الشعري؟','النطق الصحيح مع الضبط',['عدد الحروف المكتوبة','النطق الصحيح مع الضبط','عدد علامات الترقيم','طول القصيدة'],'تُحسم الحركات والوصل والوقف بحسب الأداء الصحيح.'],
 ['كيف تُعامل الحروف غير المنطوقة في الوزن؟','تُترك دون عدّ',['تُترك دون عدّ','تُحسب ساكنة دائمًا','تُحسب متحركة دائمًا','تُعد سببًا ثقيلًا'],'لا يدخل في سلسلة الوزن إلا ما ينطق.'],
 ['ما المقصود بعلم العروض؟','علم أوزان الشعر العربي',['علم أوزان الشعر العربي','علم الإعراب','علم الجغرافيا','علم الخط'],'يدرس أوزان الشعر وبحوره وما يطرأ عليها.'],
 ['أيُّهما صحيح في الشدة؟','حرفان منطوقان',['ثلاثة أحرف','حرفان منطوقان','حرف واحد ساكن فقط','مد دائم'],'مثل إنَّ: نون ساكنة ثم نون متحركة.'],
 ['ما دور الحركات في أول درس عروض؟','تحديد المتحرك من الساكن',['تغيير معنى البحر','تحديد المتحرك من الساكن','تحديد الشاعر','اختيار القافية'],'الحركات والسكنات أساس التقطيع.'],
 ['في الكتابة العروضية، هل نستطيع تجاهل التنوين عند الوصل؟','لا، لأنه نون منطوقة',['نعم دائمًا','لا، لأنه نون منطوقة','نحوله إلى ألف دائمًا','نضاعف الكلمة'],'يظهر نون التنوين الساكن في الوصل.'],
 ['ما أول خطوة لفهم تفعيلة؟','التمييز بين الحركات والسكنات',['التمييز بين الحركات والسكنات','حفظ أسماء الشعراء','عد كلمات القصيدة','تغيير الضبط'],'من تسلسل الأصوات نصل إلى المقاطع ثم التفعيلات.'],
 ['لماذا نضبط النص بالحركات؟','لأن الضبط يحدد الصوت والوزن',['لأن الضبط يحدد الصوت والوزن','لزيادة طول البيت','لتغيير نوع الخط','لعدّ الكلمات فقط'],'الحركة أو السكون قد يغير النمط العروضي.'],
 ['في «إنَّ» ماذا يحدث للنون المشددة؟','تنقسم إلى نون ساكنة وأخرى متحركة',['تُحذف النون','تنقسم إلى نون ساكنة وأخرى متحركة','تتحول إلى حرف مد','تصبح ميمًا'],'لفظ الحرف المشدد يظهر في الكتابة العروضية حرفين.']
].map(([prompt,answer,options,explanation],i)=>({id:'rule-'+i,kind:'choice',prompt,options,answer,explanation}));
const scan=[
 ['كَتَبَ','///'],['دَرَسَ','///'],['جَلَسَ','///'],['نَصَرَ','///'],['فَهِمَ','///'],
 ['مَنْ','/0'],['لَمْ','/0'],['قَدْ','/0'],['عَنْ','/0'],['بَلْ','/0'],
 ['مَا','/0'],['لَا','/0'],['فِي','/0'],['كَتَبْ','//0'],['دَرَسْ','//0'],['جَلَسْ','//0'],
 ['كَاتِبْ','/0/0'],['قَمَرْ','//0'],['عَمَلْ','//0'],['بَابٌ','/0/0']
].map(([target,pattern],i)=>({id:'sound-'+i,kind:'sequence',prompt:'قطّع الكلمة إلى متحرك / وساكن 0 بحسب نطقها المشكّل.',target,options:['/','0'],answer:[...pattern],explanation:'تقطيع «'+target+'» هو '+pattern+' (متحرك /، ساكن 0).'}));
const syllables=[
 ['مَنْ','—'],['لَمْ','—'],['قَدْ','—'],['مَا','—'],['لَا','—'],['فِي','—'],
 ['كَتَبَ','ᴗᴗᴗ'],['نَصَرَ','ᴗᴗᴗ'],['دَرَسَ','ᴗᴗᴗ'],
 ['كَاتِبْ','——'],['قَمَرْ','ᴗ—'],['عَمَلْ','ᴗ—'],
 ['جَلَسْ','ᴗ—'],['مَكْتَبْ','——'],['كَاتِبَ','—ᴗᴗ'],
 ['قَلَمٌ','ᴗᴗ—'],['جَبَلٌ','ᴗᴗ—'],['طَالِبٌ','—ᴗ—'],
 ['كَاتِبٌ','—ᴗ—'],['مَكَانٌ','ᴗ——']
].map(([target,pattern],i)=>({id:'syllable-'+i,kind:'sequence',prompt:'رتّب المقاطع بحسب النطق: ᴗ قصير، و— طويل.',target,options:['ᴗ','—'],answer:[...pattern],explanation:'المقاطع الصوتية لـ«'+target+'» هي '+[...pattern].join(' ')+'؛ ᴗ قصير و— طويل.'}));
const feet=[
 ['فعولن','ᴗ — —'],['فاعلن','— ᴗ —'],['مفاعيلن','ᴗ — — —'],
 ['فاعلاتن','— ᴗ — —'],['مستفعلن','— — ᴗ —'],
 ['متفاعلن','ᴗ ᴗ — ᴗ —'],['مفاعلن','ᴗ — ᴗ —']
];
const footQuestions=feet.flatMap(([name,pattern],i)=>{
 const others=feet.filter(x=>x[0]!==name);
 const alternate=[name,...others.slice(i%others.length).concat(others.slice(0,i%others.length)).slice(0,3).map(x=>x[0])];
 const patternOptions=[pattern,...others.slice((i+1)%others.length).concat(others.slice(0,(i+1)%others.length)).slice(0,3).map(x=>x[1])];
 return [
  {id:'foot-name-'+i,kind:'choice',prompt:'أي تفعيلة أصلية توافق هذا النمط من المقاطع؟',target:pattern,options:alternate,answer:name,explanation:'تفعيلة '+name+' تقابل '+pattern+' في صورتها الأصلية.'},
  {id:'foot-pattern-'+i,kind:'choice',prompt:'أي نمط مقاطع يقابل التفعيلة التالية؟',target:name,options:patternOptions,answer:pattern,explanation:'تقطيع '+name+' هو '+pattern+'.'}
 ];
});
const pools=[fundamentals,scan,syllables,footQuestions];
function mix(items,seed){let state=2166136261;for(const ch of seed){state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;}return [...items].map((value,i)=>({value,weight:(state^Math.imul(i+1,2654435761))>>>0})).sort((a,b)=>a.weight-b.weight).map(x=>x.value);}
export function makeArudQuestions(stage,attempt){
 if(!Number.isInteger(stage)||stage<0||stage>=ARUD_STAGES.length||!Number.isInteger(attempt)||attempt<1||attempt>100000)throw Error('Invalid Arud stage or attempt');
 const pool=mix(pools[stage],'bank:'+stage);
 const offset=(attempt-1)%pool.length;
 return mix([...pool.slice(offset),...pool.slice(0,offset)].slice(0,6),'attempt:'+stage+':'+attempt).map(q=>q.kind==='choice'?{...q,options:mix(q.options,'choices:'+q.id+':'+attempt)}:{...q});
}
export function publicArudQuestions(questions){return questions.map(({id,kind,prompt,target,options})=>({id,kind,prompt,target:target||null,options}));}
export function gradeArudQuestions(questions,answers){
 if(!Array.isArray(questions)||questions.length!==6||!Array.isArray(answers)||answers.length!==6)throw Error('Invalid question batch');
 let score=0;
 const review=questions.map((q,i)=>{
  const submission=answers[i];
  if(!submission||submission.id!==q.id)throw Error('Question mismatch');
  let correct=false;
  if(q.kind==='choice'){
   if(!Number.isInteger(submission.choice)||submission.choice<0||submission.choice>=q.options.length)throw Error('Invalid choice');
   correct=q.options[submission.choice]===q.answer;
  }else if(q.kind==='sequence'){
   const choice=submission.choice;
   if(!Array.isArray(choice)||choice.length<1||choice.length>8||choice.some(x=>!q.options.includes(x)))throw Error('Invalid sequence');
   correct=choice.length===q.answer.length&&choice.every((x,j)=>x===q.answer[j]);
  }else throw Error('Unknown question type');
  if(correct)score++;
  return {id:q.id,correct,answer:q.kind==='sequence'?q.answer.join(' '):q.answer,explanation:q.explanation};
 });
 return {score,total:6,passed:score>=5,review};
}
