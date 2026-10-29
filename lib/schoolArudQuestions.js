import {ARUD_STAGES} from './schoolArud.js';
// Server-only answer banks. Learners never receive the correct key before grading.
// Short, question-specific real-word examples support comprehension without
// revealing the correct option. They are public instructional context only.
const FUNDAMENTAL_EXAMPLES=[
 "انطق «هٰذا» بصوت مسموع، ثم قارن شكل الكلمة بما تسمعه عند قراءتها.",
 "انطق «هذا» ببطء، وركّز على الصوت الممتد بعد الهاء.",
 "قل «لكن» كما تقولها في حديثك اليومي، ولاحظ طول الصوت بعد اللام.",
 "انطق «مُعَلِّم» ببطء، واستمع جيدًا عند اللام المشددة.",
 "اقرأ «كِتابٌ جَميلٌ» موصولتين، ولا تقف بعد كلمة «كتابٌ».",
 "في «كَتَبُوا» تظهر ألف بعد واو الجماعة. اقرأ الكلمة وراقب نهاية نطقها.",
 "قارن بين هيئة كلمة «هذا» في الكتابة وما تسمعه عند النطق ببطء.",
 "اقرأ «مِنْ بَعْدِ» ببطء، ثم جرّب وصل الكلمتين كما في الكلام الطبيعي.",
 "انظر إلى الألف الأخيرة في «سافَرُوا»، ثم انطق الكلمة بصوت مرتفع.",
 "ردّد «فَعُولُنْ» و«فَاعِلُنْ»؛ لاحظ اختلاف إيقاعهما رغم تشابه الحروف.",
 "جرّب قراءة «إِنَّ» بتمهّل، وركّز على صوت النون.",
 "قارن بين «كَتَبَ» و«كَتَبْ»: ماذا يتغير في صوت الباء في النهاية؟",
 "اقرأ «قَلَمٌ جَديدٌ» في نَفَس واحد، ثم جرّب الوقف بعد «قَلَمٌ».",
 "انطق «فَعُولُنْ» ببطء، وحاول تتبّع تغير الصوت من حرف إلى آخر.",
 "انطق «عَلِمَ» ثم «عَلِمْ»، وانتبه إلى الاختلاف في آخر الكلمة.",
 "تأمل الشدة فوق النون في «إِنَّ»، وكرّر نطق الكلمة ببطء."
];
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
].map(([prompt,answer,options,explanation],i)=>({id:'rule-'+i,kind:'choice',prompt,options,answer,explanation,example:FUNDAMENTAL_EXAMPLES[i]}));
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

 // Verified real verse examples for the new applied lessons.
 // The long-meter feet are taken from the annotated "Qifa nabki" lesson
 // (Al Jazeera Learning); the second pair follows a published school solution.
const LONG_FEET=['فعولن','مفاعيلن','مفاعلن','فعولُ'];
const longLines=[
 {text:'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ',feet:['فعولن','مفاعيلن','فعولن','مفاعلن'],poet:'امرؤ القيس'},
 {text:'بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ',feet:['فعولن','مفاعيلن','فعولُ','مفاعلن'],poet:'امرؤ القيس'},
 {text:'بِلَادِي هَوَاهَا فِي لِسَانِي وَفِي دَمِي',feet:['فعولن','مفاعيلن','فعولن','مفاعلن'],poet:'شاهد مدرسي على البحر الطويل'},
 {text:'يُمَجِّدُهَا قَلْبِي وَيَدْعُو لَهَا فَمِي',feet:['فعولن','مفاعيلن','فعولن','مفاعلن'],poet:'شاهد مدرسي على البحر الطويل'}
];
const hemistichQuestions=longLines.flatMap((line,i)=>[
 {id:'verse-feet-'+i,kind:'sequence',prompt:'رتّب تفعيلات هذا الشطر الأربع بالترتيب الذي تنطقه.',target:line.text,
  attribution:line.poet,options:LONG_FEET,steps:4,answer:line.feet,
  explanation:'تفعيلات الشطر: '+line.feet.join(' | ')+'. يعتمد التقطيع على النطق المتصل، مع القبض عند الحاجة.'},
 {id:'verse-focus-'+i,kind:'choice',prompt:'ما التفعيلة رقم '+([2,3,1,4][i])+' في تقطيع هذا الشطر؟',target:line.text,
  attribution:line.poet,options:LONG_FEET,answer:line.feet[[1,2,0,3][i]],
  explanation:'التفعيلة في هذا الموضع هي «'+line.feet[[1,2,0,3][i]]+'». لا تشترط أن تنتهي عند حدود الكلمة.'}
]);
// Each meter is attested in a named published poem. The two halves are
// separate prompts, not invented approximations or algorithmic meter guesses.
const meterVerses=[
 ['قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ','الطويل','امرؤ القيس'],
 ['بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ','الطويل','امرؤ القيس'],
 ['إِذَا الشَّعْبُ يَوْمًا أَرَادَ الْحَيَاةَ','المتقارب','أبو القاسم الشابي'],
 ['فَلَا بُدَّ أَنْ يَسْتَجِيبَ الْقَدَرْ','المتقارب','أبو القاسم الشابي'],
 ['إِذَا غَامَرْتَ فِي شَرَفٍ مَرُومِ','الوافر','المتنبي'],
 ['فَلَا تَقْنَعْ بِمَا دُونَ النُّجُومِ','الوافر','المتنبي'],
 ['وَإِنَّمَا الْأُمَمُ الْأَخْلَاقُ مَا بَقِيَتْ','البسيط','أحمد شوقي'],
 ['فَإِنْ هُمُ ذَهَبَتْ أَخْلَاقُهُمْ ذَهَبُوا','البسيط','أحمد شوقي']
];
const meterChoices=['الطويل','المتقارب','الوافر','البسيط'];
const meterQuestions=meterVerses.map(([target,answer,attribution],i)=>({
 id:'meter-verse-'+i,kind:'choice',prompt:'إلى أي بحر ينتمي هذا الشطر الشعري؟',target,attribution,
 options:meterChoices,answer,
 explanation:'هذا الشطر من بحر «'+answer+'»، من شعر '+attribution+'. لاحظ الإيقاع المتكرر عند وصل الكلمات.'
}));
const pools=[fundamentals,scan,syllables,footQuestions,hemistichQuestions,meterQuestions];
function mix(items,seed){let state=2166136261;for(const ch of seed){state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;}return [...items].map((value,i)=>({value,weight:(state^Math.imul(i+1,2654435761))>>>0})).sort((a,b)=>a.weight-b.weight).map(x=>x.value);}
export function makeArudQuestions(stage,attempt){
 if(!Number.isInteger(stage)||stage<0||stage>=ARUD_STAGES.length||!Number.isInteger(attempt)||attempt<1||attempt>100000)throw Error('Invalid Arud stage or attempt');
 const pool=mix(pools[stage],'bank:'+stage);
 const offset=(attempt-1)%pool.length;
 return mix([...pool.slice(offset),...pool.slice(0,offset)].slice(0,6),'attempt:'+stage+':'+attempt).map(q=>q.kind==='choice'?{...q,options:mix(q.options,'choices:'+q.id+':'+attempt)}:{...q});
}
export function publicArudQuestions(questions){
 return questions.map(({id,kind,prompt,target,options,example,attribution,steps})=>({
  id,kind,prompt,target:target||null,options,attribution:attribution||null,steps:steps||null,
  // Older active attempts were saved before examples were added.
  example:example||((typeof id==='string'&&/^rule-\d+$/.test(id))?FUNDAMENTAL_EXAMPLES[Number(id.slice(5))]||null:null)
 }));
}
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
