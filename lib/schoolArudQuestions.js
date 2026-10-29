import {ARUD_STAGES} from './schoolArud.js';
import {ARUD_METERS,ARUD_METER_GROUPS} from './schoolArudMeters.js';
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

// These two full verses have independently published scansion, including changes
// within the two hemistichs: Al Jazeera Learning and a published prosody analysis.
// Do not extrapolate foot boundaries from a poem's words automatically.
const FULL_VERSES=[
 {id:'imru',name:'امرؤ القيس',meter:'الطويل',
  first:'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ',
  second:'بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ',
  firstFeet:['فعولن','مفاعيلن','فعولن','مفاعلن'],
  secondFeet:['فعولن','مفاعيلن','فعولُ','مفاعلن']},
 {id:'mutanabbi',name:'المتنبي',meter:'الوافر',
  first:'إِذَا غَامَرْتَ فِي شَرَفٍ مَرُومِ',
  second:'فَلَا تَقْنَعْ بِمَا دُونَ النُّجُومِ',
  firstFeet:['مفاعيلن','مفاعلتن','فعولن'],
  secondFeet:['مفاعيلن','مفاعيلن','فعولن']}
];
const FULL_FOOT_KEYS=['فعولن','مفاعيلن','فعولُ','مفاعلن','مفاعلتن'];
const fullVerseQuestions=FULL_VERSES.flatMap(verse=>{
 const target=verse.first+'\n'+verse.second;
 const feet=[...verse.firstFeet,...verse.secondFeet];
 const shared={target,attribution:verse.name,options:FULL_FOOT_KEYS};
 return [
  {...shared,id:'full-order-'+verse.id,kind:'sequence',steps:feet.length,
   prompt:'رتّب تفعيلات البيت الكامل: الصدر أولًا ثم العجز.',answer:feet,
   explanation:'الصدر: '+verse.firstFeet.join(' | ')+'؛ العجز: '+verse.secondFeet.join(' | ')+'.'},
  {...shared,id:'full-first-'+verse.id,kind:'sequence',steps:verse.firstFeet.length,
   prompt:'رتّب تفعيلات صدر البيت فقط.',answer:verse.firstFeet,
   explanation:'تفعيلات الصدر: '+verse.firstFeet.join(' | ')+'.'},
  {...shared,id:'full-second-'+verse.id,kind:'sequence',steps:verse.secondFeet.length,
   prompt:'رتّب تفعيلات عجز البيت فقط.',answer:verse.secondFeet,
   explanation:'تفعيلات العجز: '+verse.secondFeet.join(' | ')+'.'},
  {id:'full-meter-'+verse.id,kind:'choice',target,attribution:verse.name,
   prompt:'من أي بحر هذا البيت؟',options:['الطويل','المتقارب','الوافر','البسيط'],
   answer:verse.meter,explanation:'البيت من بحر '+verse.meter+'، مع التغيّرات العروضية الواردة في تقطيعه.'},
  {id:'full-count-'+verse.id,kind:'choice',target,attribution:verse.name,
   prompt:'كم عدد التفعيلات في صدر هذا البيت في التقطيع المعتمد؟',options:['2','3','4','5'],
   answer:String(verse.firstFeet.length),explanation:'يضم صدر هذا البيت '+verse.firstFeet.length+' تفعيلات.'},
  {id:'full-end-'+verse.id,kind:'choice',target,attribution:verse.name,
   prompt:'ما التفعيلة الأخيرة في عجز البيت؟',options:FULL_FOOT_KEYS,
   answer:verse.secondFeet.at(-1),explanation:'آخر تفعيلة في العجز هي '+verse.secondFeet.at(-1)+'.'},
  {id:'full-start-'+verse.id,kind:'choice',target,attribution:verse.name,
   prompt:'ما التفعيلة الأولى في صدر البيت بحسب التقطيع؟',options:FULL_FOOT_KEYS,
   answer:verse.firstFeet[0],explanation:'تبدأ تفعيلات الصدر بـ '+verse.firstFeet[0]+'.'}
 ];
});
const CHANGES=[
 {id:'qabd',name:'القبض',category:'زحاف',before:'مفاعيلن',after:'مفاعلن',action:'حذف الخامس الساكن'},
 {id:'khabn',name:'الخبن',category:'زحاف',before:'فاعلن',after:'فَعِلُنْ',action:'حذف الثاني الساكن'},
 {id:'tay',name:'الطي',category:'زحاف',before:'مستفعلن',after:'مستعلن',action:'حذف الرابع الساكن'},
 {id:'idmar',name:'الإضمار',category:'زحاف',before:'متفاعلن',after:'مستفعلن',action:'إسكان الثاني المتحرك'},
 {id:'asb',name:'العصب',category:'زحاف',before:'مفاعلتن',after:'مفاعيلن',action:'إسكان الخامس المتحرك'},
 {id:'hadf',name:'الحذف',category:'علة',before:'فاعلاتن',after:'فاعلن',action:'حذف السبب الخفيف من النهاية'},
 {id:'qat',name:'القطع',category:'علة',before:'فاعلن',after:'فَعْلُنْ',action:'حذف ساكن الوتد المجموع وإسكان ما قبله'},
 {id:'qasr',name:'القصر',category:'علة',before:'فعولن',after:'فعولْ',action:'حذف ساكن السبب الخفيف وإسكان ما قبله'}
];
const changeNames=CHANGES.map(x=>x.name);
const changeActions=CHANGES.map(x=>x.action);
const variationQuestions=CHANGES.flatMap((change,i)=>[
 {id:'variation-name-'+i,kind:'choice',
  prompt:'ما اسم هذا التغيّر العروضي؟',target:change.before+' ← '+change.after,
  options:[change.name,...CHANGES.filter(x=>x.name!==change.name).slice(i%7).concat(CHANGES.filter(x=>x.name!==change.name).slice(0,i%7)).slice(0,3).map(x=>x.name)],
  answer:change.name,explanation:change.name+' '+change.action+'، وهو '+change.category+'.'},
 {id:'variation-mechanism-'+i,kind:'choice',
  prompt:'ما التغيّر الصوتي أو البنيوي هنا؟',target:change.before+' ← '+change.after,
  options:[change.action,...changeActions.filter(x=>x!==change.action).slice(0,3)],
  answer:change.action,explanation:change.name+': '+change.action+'.'},
 {id:'variation-type-'+i,kind:'choice',
  prompt:'إلى أي نوع ينتمي هذا التغيّر في المثال المعروض؟',target:change.before+' ← '+change.after,
  options:['زحاف','علة'],answer:change.category,
  explanation:change.name+' يُصنف هنا '+change.category+' بحسب الصورة التعليمية المعروضة.'}
]);
const ADVANCED_GROUP_POOLS=ARUD_METER_GROUPS.map((group,g)=>group.flatMap((meter,i)=>{
 const names=group.map(m=>m.name),patterns=group.map(m=>m.pattern);
 return [
  {id:'new-meter-'+g+'-'+i,kind:'choice',prompt:'ما البحر الذي يوافق أصل ترتيب هذه التفعيلات؟',
   target:meter.pattern,options:names,answer:meter.name,
   explanation:meter.name+' هو '+meter.pattern+'. هذه صورة نظرية تعليمية، وليست تقطيعًا لشطر بعينه.'},
  {id:'new-pattern-'+g+'-'+i,kind:'choice',prompt:'ما ترتيب التفعيلات النظري للبحر المذكور؟',
   target:meter.name,options:patterns,answer:meter.pattern,
   explanation:'أصل وزن '+meter.name+': '+meter.pattern+'. تختلف صور الاستعمال باختلاف الأعاريض والأضرب.'}
 ];
}));
const finalReviewQuestions=ARUD_METERS.flatMap((meter,i)=>{
 const rest=ARUD_METERS.filter(x=>x.name!==meter.name);
 const distractors=[...rest.slice(i%rest.length),...rest.slice(0,i%rest.length)].slice(0,3);
 return [
  {id:'final-meter-'+i,kind:'choice',prompt:'ما البحر المناسب لهذه التفعيلات في صورتها النظرية؟',
   target:meter.pattern,options:[meter.name,...distractors.map(x=>x.name)],
   answer:meter.name,explanation:meter.name+' = '+meter.pattern+'.'},
  {id:'final-pattern-'+i,kind:'choice',prompt:'اختر أصل التفعيلات لهذا البحر.',
   target:meter.name,options:[meter.pattern,...distractors.map(x=>x.pattern)],
   answer:meter.pattern,explanation:'الوزن النظري لـ'+meter.name+': '+meter.pattern+'.'}
 ];
});

const pools=[fundamentals,scan,syllables,footQuestions,hemistichQuestions,meterQuestions,fullVerseQuestions,variationQuestions,...ADVANCED_GROUP_POOLS,finalReviewQuestions];
function mix(items,seed){let state=2166136261;for(const ch of seed){state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;}return [...items].map((value,i)=>({value,weight:(state^Math.imul(i+1,2654435761))>>>0})).sort((a,b)=>a.weight-b.weight).map(x=>x.value);}
export function makeArudQuestions(stage,attempt){
 if(!Number.isInteger(stage)||stage<0||stage>=ARUD_STAGES.length||!Number.isInteger(attempt)||attempt<1||attempt>100000)throw Error('Invalid Arud stage or attempt');
 const pool=mix(pools[stage],'bank:'+stage);
 const offset=(attempt-1)%pool.length;
 const ordered=[...pool.slice(offset),...pool.slice(0,offset)];
 // The complete-verse station always contains a hands-on scansion exercise.
 const featured=stage===6?ordered.find(q=>q.kind==='sequence'):null;
 const sample=featured?[featured,...ordered.filter(q=>q.id!==featured.id).slice(0,5)]:ordered.slice(0,6);
 return mix(sample,'attempt:'+stage+':'+attempt).map(q=>q.kind==='choice'?{...q,options:mix(q.options,'choices:'+q.id+':'+attempt)}:{...q});
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
   if(!Array.isArray(choice)||choice.length<1||choice.length>8||choice.some(x=>!q.options.includes(x))||(q.steps&&choice.length!==q.steps))throw Error('Invalid sequence');
   correct=choice.length===q.answer.length&&choice.every((x,j)=>x===q.answer[j]);
  }else throw Error('Unknown question type');
  if(correct)score++;
  return {id:q.id,correct,answer:q.kind==='sequence'?q.answer.join(' '):q.answer,explanation:q.explanation};
 });
 return {score,total:6,passed:score>=5,review};
}
