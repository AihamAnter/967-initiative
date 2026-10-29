import {seededShuffle,dailySeed,GAME_ROUND_SIZE} from './gameEngine.js';
import {historyPhotoLibrary,historyPhotoSource,historyPhotoPage} from './historyVisuals.js';
import {selectFreshTasks} from './practiceRotation.js';

export const extraGameTypes={
 who:{title:'من أنا؟',english:'WHO AM I?',description:'ثلاثة تلميحات متدرجة عن شخصية يمنية معروفة، هل تتعرف عليها قبل انتهاء الوقت؟',kind:'شخصيات'},
 bigger:{title:'أيهما أكبر؟',english:'HIGHER OR LOWER',description:'قارن مساحات المحافظات وارتفاعات الجبال اليمنية واختر الأكبر بدقة.',kind:'مقارنات'},
 connect:{title:'اربط المعلومة',english:'MATCH QUEST',description:'اختر عنصرًا من اليمين ثم اربطه بالمعلومة الصحيحة في اليسار. أكمل ثلاث وصلات.',kind:'مطابقة'},
 yemenword:{title:'خمن الإجابة اليمنية',english:'WORD QUEST',description:'ركّب الحروف لتعرف المكان أو الشخصية أو الحدث أو المفردة اليمنية.',kind:'كلمات'},
 object:{title:'ما هذا الشيء؟',english:'OBJECT QUEST',description:'شاهد صورة حقيقية لقطعة أو معلم أو رمز من التراث اليمني، وحدد ماهيته.',kind:'صور'},
};

// Editorially recognizable historical and modern personalities; questions avoid obscure names.
export const famousPeople=[
 ['arwa','الملكة أروى','حكمت في العهد الصليحي.','ارتبط حكمها بمدينة جبلة.','عُرفت بالسيدة الحرة.','https://www.britannica.com/biography/Arwa-al-Sulayhi'],
 ['bardouni','عبد الله البردوني','شاعر وأديب يمني معاصر.','فقد بصره في طفولته.','من أشهر دواوينه «من أرض بلقيس».','https://ar.wikipedia.org/wiki/عبد_الله_البردوني'],
 ['zubairi','محمد محمود الزبيري','شاعر وسياسي يمني.','شارك في معارضة نظام الإمامة.','عُرف بكتابات تتصل بثورة 26 سبتمبر.','https://ar.wikipedia.org/wiki/محمد_محمود_الزبيري'],
 ['tawakkol','توكل كرمان','صحفية وناشطة يمنية.','برزت في احتجاجات 2011م.','حصلت على جائزة نوبل للسلام عام 2011م.','https://www.nobelprize.org/prizes/peace/2011/karman/facts/'],
 ['hamdi','إبراهيم الحمدي','رئيس يمني في سبعينيات القرن العشرين.','قاد الحركة التصحيحية عام 1974م.','تولى رئاسة الجمهورية العربية اليمنية حتى 1977م.','https://ar.wikipedia.org/wiki/إبراهيم_الحمدي'],
 ['sallal','عبد الله السلال','قائد عسكري ورئيس يمني.','ارتبط بثورة 26 سبتمبر 1962م.','كان أول رئيس للجمهورية العربية اليمنية.','https://ar.wikipedia.org/wiki/عبد_الله_السلال'],
 ['saleh','علي عبد الله صالح','رئيس يمني سابق.','تولى رئاسة اليمن الشمالي عام 1978م.','أصبح رئيس اليمن الموحد بعد عام 1990م.','https://www.britannica.com/biography/Ali-Abdullah-Saleh'],
 ['iryani','عبد الرحمن الإرياني','قاض وسياسي يمني.','تولى الرئاسة في الجمهورية العربية اليمنية.','خلف عبد الله السلال عام 1967م.','https://ar.wikipedia.org/wiki/عبد_الرحمن_الإرياني'],
 ['ayoub','أيوب طارش','ملحن ومغنٍ يمني.','اشتهر بأغنيات وطنية وعاطفية.','لحّن وغنّى نشيد «رددي أيتها الدنيا نشيدي».','https://ar.wikipedia.org/wiki/أيوب_طارش'],
 ['abubakr','أبو بكر سالم','مطرب وملحن وشاعر.','ارتبط بالفن الحضرمي.','اشتهر بأغنية «سر حبي فيك غامض».','https://ar.wikipedia.org/wiki/أبو_بكر_سالم'],
 ['morshed','محمد مرشد ناجي','مطرب يمني بارز من القرن العشرين.','عمل على إحياء ألوان من الغناء اليمني.','اشتهر بلقب «المرشدي».','https://ar.wikipedia.org/wiki/محمد_مرشد_ناجي'],
 ['maqaleh','عبد العزيز المقالح','شاعر وناقد وأكاديمي.','ترأس جامعة صنعاء لسنوات.','كان من أبرز وجوه الشعر والنقد اليمني الحديث.','https://ar.wikipedia.org/wiki/عبد_العزيز_المقالح'],
 ['fathi','أحمد فتحي','عازف ومطرب وملحن يمني.','يُعرف بمهارته في العزف على العود.','قدم ألحانًا وأعمالًا يمنية وعربية على العود.','https://ar.wikipedia.org/wiki/أحمد_فتحي_(موسيقي)'],
 ['sayf','سيف بن ذي يزن','شخصية ارتبطت بتاريخ اليمن القديم ورواياته الشعبية.','تُنسب إليه حكايات في سيرة شعبية طويلة.','ارتبط اسمه بمقاومة الحكم الحبشي في اليمن بحسب المرويات.','https://ar.wikipedia.org/wiki/سيف_بن_ذي_يزن'],
 ['hamdani','الهمداني','عالم يمني من القرن الرابع الهجري.','ألّف في الجغرافيا والأنساب.','من أشهر مؤلفاته «صفة جزيرة العرب».','https://ar.wikipedia.org/wiki/الحسن_بن_أحمد_الهمداني'],
 ['nashwan','نشوان الحميري','عالم وأديب يمني من العصور الإسلامية.','اشتهر بالتاريخ واللغة.','من مؤلفاته «شمس العلوم».','https://ar.wikipedia.org/wiki/نشوان_الحميري'],
 ["yahya","الإمام يحيى حميد الدين","حاكم يمني من أوائل القرن العشرين.","ارتبط بتأسيس المملكة المتوكلية بعد العثمانيين.","اغتيل خلال أحداث الثورة الدستورية عام 1948م.","https://www.britannica.com/place/Yemen"],
 ["ahmad-imam","الإمام أحمد حميد الدين","حاكم يمني في النصف الأول من القرن العشرين.","تولى الحكم بعد وفاة والده عام 1948م.","انتهى حكمه بوفاته عام 1962م قبل ثورة 26 سبتمبر.","https://www.britannica.com/place/Yemen"],
 ["ali-nasser","علي ناصر محمد","رجل دولة يمني تولى مسؤوليات في جنوب اليمن.","ارتبط برئاسة دولة الجنوب في ثمانينيات القرن العشرين.","كان رئيس جمهورية اليمن الديمقراطية الشعبية عام 1986م.","https://www.britannica.com/place/Yemen"],
 ["abdulfattah","عبد الفتاح إسماعيل","سياسي يمني ارتبط بتاريخ دولة الجنوب.","شارك في تأسيس الجبهة القومية في الجنوب.","تولى رئاسة دولة الجنوب بين 1978م و1980م.","https://www.britannica.com/place/Yemen"],
 ["ali-alansi","علي بن علي الآنسي","مغنٍ وملحن يمني من القرن العشرين.","ارتبط بتقديم الأغنية الصنعانية.","من رموز الغناء اليمني التقليدي المعروفين.","https://ar.wikipedia.org/wiki/علي_بن_علي_الآنسي"],
 ["faisal-alawi","فيصل علوي","فنان يمني اشتهر بالغناء والعزف.","ارتبط باللون اللحجي من الغناء.","من أشهر فناني الأغنية اللحجية في اليمن.","https://ar.wikipedia.org/wiki/فيصل_علوي"],
].map(([id,name,h1,h2,h3,source])=>({id:'who-'+id,name,hints:[h1,h2,h3],source,difficulty:1}));

export function buildWhoChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const people=mode==='daily'?seededShuffle(famousPeople,key+'|people').slice(0,GAME_ROUND_SIZE):selectFreshTasks(famousPeople,{seed:key+'|people',seen,count:GAME_ROUND_SIZE});
 return people.map((p,i)=>{
  const distractors=seededShuffle(famousPeople.filter(x=>x.id!==p.id),key+'|distractors|'+p.id).slice(0,3);
  const options=seededShuffle([p,...distractors],key+'|options|'+i).map(x=>x.name);
  return {...p,options,correct:options.indexOf(p.name)};
 });
}

// Stable Wikidata-derived governorate area figures in km²; mountain figures from GeoNames.
const area=[['حضرموت',193032],['المهرة',82405],['شبوة',47728],['الجوف',30620],['أبين',21939],['مأرب',20023],['الحديدة',17509],['لحج',15210],['صنعاء',15052],['صعدة',15022],['تعز',12605],['البيضاء',11193],['ذمار',9495],['حجة',8228],['إب',6484],['سقطرى',3650],['عدن',1114]];
const mountain=[['جبل النبي شعيب',3666],['جبل الطيال',3491],['جبل القلة',3233],['جبل شخب عمار',3218],['جبل عيبان',3187],['جبل صبر',3070],['جبل ظفار',3004]];
const areaPairs=area.flatMap((_,i)=>area.slice(i+1).map((__,offset)=>[i,i+offset+1]));
const mountainPairs=mountain.flatMap((_,i)=>mountain.slice(i+1).map((__,offset)=>[i,i+offset+1]));
const compareBank=[
 ...areaPairs.map(([a,b],i)=>({id:'area-'+i,unit:'كم²',topic:'مساحة المحافظات',question:'أي المحافظتين أكبر مساحة؟',a:{name:area[a][0],value:area[a][1]},b:{name:area[b][0],value:area[b][1]},source:'https://geotaria.com/en/map/yemen'})),
 ...mountainPairs.map(([a,b],i)=>({id:'mountain-'+i,unit:'متر',topic:'ارتفاع الجبال',question:'أي الجبلين أعلى ارتفاعًا؟',a:{name:mountain[a][0],value:mountain[a][1]},b:{name:mountain[b][0],value:mountain[b][1]},source:'https://www.geonames.org/YE/highest-mountains-in-yemen.html'})),
];
export function buildBiggerChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return (mode==='daily'?seededShuffle(compareBank,key+'|comparisons').slice(0,GAME_ROUND_SIZE):selectFreshTasks(compareBank,{seed:key+'|comparisons',seen,count:GAME_ROUND_SIZE})).map((item,i)=>{
  const options=seededShuffle([item.a,item.b],key+'|compare-'+i);
  return {...item,options,correct:options[0].value>options[1].value?0:1,difficulty:1};
 });
}

const matchSets=[
 ['شخصيات وإبداعاتها',[['عبد الله البردوني','الشعر'],['أيوب طارش','الموسيقى'],['عبد العزيز المقالح','النقد الأدبي']]],
 ['محطات وتواريخها',[['ثورة 26 سبتمبر','1962م'],['استقلال جنوب اليمن','1967م'],['قيام الوحدة اليمنية','1990م']]],
 ['مدن ومحافظاتها',[['شبام','حضرموت'],['زبيد','الحديدة'],['جسر شهارة','عمران']]],
 ['ممالك وعواصمها',[['سبأ','مأرب'],['قتبان','تمنع'],['حمير','ظفار']]],
 ['معالم ووصفها',[['سد مأرب','منظومة ري تاريخية'],['معبد أوام','موقع أثري سبئي'],['جسر شهارة','جسر جبلي حجري']]],
 ['أماكن وطبيعتها',[['سقطرى','أرخبيل'],['تهامة','سهل ساحلي'],['حراز','مرتفعات جبلية']]],
 ['ثقافة وتراث',[['البرع','رقصة شعبية'],['الخط المسند','كتابة جنوبية قديمة'],['الجنبية','خنجر تقليدي']]],
 ['مدن وما اشتهرت به',[['المخا','تجارة البن'],['عدن','ميناء بحري'],['جبلة','مقر حكم الملكة أروى']]],
 ['شخصيات وأحداث',[['توكل كرمان','نوبل للسلام 2011م'],['عبد الله السلال','ثورة سبتمبر 1962م'],['إبراهيم الحمدي','حركة 1974م']]],
 ['جامعات ومدن',[['جامعة صنعاء','صنعاء'],['جامعة عدن','عدن'],['جامعة تعز','تعز']]],
 ['مواقع وتاريخ',[['صنعاء القديمة','التراث العمراني'],['زبيد التاريخية','التعليم الإسلامي'],['شبام حضرموت','العمارة الطينية']]],
 ['رموز يمنية',[['القهوة اليمنية','الزراعة والتجارة'],['أشجار دم الأخوين','سقطرى'],['الخط المسند','نقوش قديمة']]],
 ["معالم وعصور",[["معبد برآن","عصر سبأ"],["مسجد الملكة أروى","العهد الصليحي"],["جامع الأشاعر","تاريخ زبيد الإسلامي"]]],
 ["مدن وتضاريس",[["المكلا","ساحل حضرموت"],["تعز","مرتفعات جنوب غرب اليمن"],["الحديدة","سهل تهامة"]]],
 ["شعراء وفنون",[["عبد الله البردوني","شعر"],["أبو بكر سالم","غناء حضرمي"],["محمد مرشد ناجي","موسيقى يمنية"]]],
 ["ممالك وآثار",[["سبأ","معبد أوام"],["قتبان","تمنع"],["حمير","ظفار يريم"]]],
 ["مواقع عالمية",[["سقطرى","تراث طبيعي"],["زبيد","تراث ثقافي"],["مأرب القديمة","معالم سبئية"]]],
 ["موانئ ومناطق",[["المخا","البحر الأحمر"],["عدن","خليج عدن"],["المكلا","بحر العرب"]]],
 ["تواريخ اليونسكو",[["شبام","1982م"],["صنعاء القديمة","1986م"],["زبيد","1993م"]]],
 ["معالم ومواقعها",[["سد مأرب","مأرب"],["جسر شهارة","عمران"],["قلعة القاهرة","تعز"]]],
 ["طبيعة اليمن",[["دم الأخوين","سقطرى"],["المدرجات الزراعية","المرتفعات"],["السهول الساحلية","تهامة"]]],
 ["دول وقادة",[["الدولة الصليحية","الملكة أروى"],["الجمهورية العربية اليمنية","عبد الله السلال"],["المملكة المتوكلية","الإمام يحيى"]]],
 ["أحداث ونتائج",[["ثورة سبتمبر 1962م","قيام الجمهورية بالشمال"],["استقلال 1967م","انتهاء الحكم البريطاني في عدن"],["الوحدة 1990م","قيام الجمهورية اليمنية"]]],
 ["ملامح مدن",[["شبام","منازل طينية برجية"],["صنعاء القديمة","زخارف الجص الأبيض"],["زبيد","مساجد ومدارس تاريخية"]]],
 ["أماكن ومحافظات",[["جبلة","إب"],["صرواح","مأرب"],["تريم","حضرموت"]]],
 ["آثار وأساليب",[["الخط المسند","نقوش حجرية"],["قنوات مأرب","الري الزراعي"],["الطوب الطيني","مباني شبام"]]],
 ["نساء وتاريخ",[["الملكة أروى","حكم اليمن الصليحي"],["توكل كرمان","جائزة نوبل للسلام"],["بلقيس","ملكة سبأ في المرويات"]]],
 ["زراعة ومناخ",[["البن اليمني","تجارة المخا"],["مدرجات حراز","زراعة جبلية"],["نخيل تهامة","سهل ساحلي"]]],
 ["مواقع وتواريخ إدراج",[["سقطرى","2008م"],["معالم سبأ في مأرب","2023م"],["شبام","1982م"]]],
 ["مجالات وشخصيات",[["الهمداني","الجغرافيا والأنساب"],["نشوان الحميري","اللغة والمعاجم"],["الملكة أروى","الحكم والإدارة"]]],
 ["ثقافة وتاريخ",[["البرع","رقص شعبي"],["الجنبية","زي تقليدي"],["النقش المسندي","كتابة قديمة"]]],
 ["مدن وطرق",[["المخا","تجارة البن"],["شبام حضرموت","طريق القوافل"],["عدن","التجارة البحرية"]]],
].map(([topic,pairs],i)=>({
 id:'match-'+i,topic,pairs:pairs.map(([left,right],j)=>({id:'m'+j,left,right})),difficulty:1,
 source:i===3?'https://www.britannica.com/place/Yemen/History':'/yemen-history'
}));
export function buildConnectChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return (mode==='daily'?seededShuffle(matchSets,key+'|matching').slice(0,GAME_ROUND_SIZE):selectFreshTasks(matchSets,{seed:key+'|matching',seen,count:GAME_ROUND_SIZE})).map((item,i)=>({
  ...item,question:'اربط العناصر بالمعلومات الصحيحة',
  leftOrder:seededShuffle(item.pairs.map(p=>p.id),key+'|match-left-'+i),
  rightOrder:seededShuffle(item.pairs.map(p=>p.right),key+'|match-right-'+i),
  correct:item.pairs.map(p=>p.right),
 }));
}

const wordBank=[
 ['saba','سبأ','حضارة','مملكة يمنية قديمة ارتبطت بمأرب.','https://www.britannica.com/place/Saba-ancient-kingdom-Arabia'],
 ['marib','مأرب','مكان','مدينة تاريخية ارتبطت بسد مشهور.','/yemen-history/saba'],
 ['socotra','سقطرى','مكان','أرخبيل يمني مشهور بتنوعه الحيوي وأشجاره.','https://whc.unesco.org/en/list/1263/'],
 ['zabid','زبيد','مكان','مدينة تهامية تاريخية ومدرجة على قائمة التراث العالمي.','https://whc.unesco.org/en/list/611/'],
 ['shibam','شبام','مكان','مدينة حضرمية بمبانٍ طينية عالية.','https://whc.unesco.org/en/list/192/'],
 ['musnad','مسند','تراث','اسم الخط المستخدم في نقوش جنوب الجزيرة العربية القديمة.','/yemen-history/ancient-inscriptions'],
 ['jambiya','جنبية','تراث','خنجر تقليدي يرتبط بالزي اليمني.','https://en.wikipedia.org/wiki/Jambiya'],
 ['bura','برع','تراث','اسم رقصة يمنية يؤديها رجال في مناسبات عديدة.','https://en.wikipedia.org/wiki/Bara%27_(dance)'],
 ['mokha','المخا','مكان','ميناء يمني ارتبط تاريخيًا بتجارة البن.','/yemen-history/qasimi-mocha-trade'],
 ['arwa','أروى','شخصية','اسم ملكة صليحية اتخذت جبلة مركزًا للحكم.','/yemen-history/queen-arwa-administration'],
 ['bilqis','بلقيس','تراث','اسم ملكة سبأ في المرويات والتقاليد الأدبية.','https://www.britannica.com/biography/Queen-of-Sheba'],
 ['himyar','حمير','حضارة','مملكة قديمة ارتبطت بظفار يريم.','https://www.britannica.com/place/Yemen/History'],
 ['tihama','تهامة','مكان','سهل ساحلي على البحر الأحمر.','https://en.wikipedia.org/wiki/Tihamah'],
 ['haraz','حراز','مكان','مرتفعات يمنية عُرفت بمدرجاتها الزراعية.','https://en.wikipedia.org/wiki/Haraz_Mountains'],
 ['dam','سد','تراث','منشأة لإدارة المياه، وأشهر أمثلتها التاريخية في مأرب.','/yemen-history/marib-dam'],
 ['bakhour','بخور','تراث','مادة عطرية ارتبطت بتجارة جنوب الجزيرة العربية قديمًا.','https://www.britannica.com/topic/frankincense'],
 ['qahwa','قهوة','تراث','مشروب ونبات ارتبط بتاريخ التجارة عبر ميناء المخا.','/yemen-history/qasimi-mocha-trade'],
 ['sanaa','صنعاء','مكان','مدينة يمنية معروفة بعمارتها البرجية القديمة.','https://whc.unesco.org/en/list/385/'],
 ['aden','عدن','مكان','مدينة ساحلية تاريخية تطل على خليج يحمل اسمها.','/yemen-history/aden-1839'],
 ['jibla','جبلة','مكان','مدينة ارتبطت بحكم الملكة أروى.','/yemen-history/jibla-capital'],
 ['hadr','حضرموت','مكان','محافظة يمنية واسعة في الشرق وتضم مدينة المكلا.','https://geotaria.com/en/map/yemen'],
 ['sabr','صبر','مكان','جبل معروف يطل على مدينة تعز.','https://www.geonames.org/YE/highest-mountains-in-yemen.html'],
 ['bard','البردوني','شخصية','اسم شاعر يمني كفيف مشهور من ذمار.','https://ar.wikipedia.org/wiki/عبد_الله_البردوني'],
 ['tawakkol','كرمان','شخصية','لقب ناشطة يمنية حصلت على نوبل للسلام عام 2011م.','https://www.nobelprize.org/prizes/peace/2011/karman/facts/'],
 ['rasuli','الرسوليون','تاريخ','دولة حكمت أجزاء واسعة من اليمن في العصر الوسيط.','/yemen-history/rasulids'],
 ["mahra","المهرة","مكان","اسم محافظة يمنية شرقية وعاصمتها الغيضة.","https://en.wikipedia.org/wiki/Al_Mahrah_Governorate"],
 ["raymah","ريمة","مكان","محافظة جبلية يمنية تقع غربي ذمار.","https://en.wikipedia.org/wiki/Raymah_Governorate"],
 ["ibb","إب","مكان","محافظة يمنية معروفة بمرتفعاتها الخضراء.","https://en.wikipedia.org/wiki/Ibb_Governorate"],
 ["saada","صعدة","مكان","مدينة يمنية تاريخية في أقصى الشمال.","https://en.wikipedia.org/wiki/Saada"],
 ["shabwa","شبوة","مكان","محافظة يمنية عاصمتها مدينة عتق.","https://en.wikipedia.org/wiki/Shabwah_Governorate"],
 ["taizword","تعز","مكان","مدينة تاريخية ارتبطت بالدولة الرسولية.","https://en.wikipedia.org/wiki/Taiz"],
 ["hajjah","حجة","مكان","محافظة يمنية شمال غربية تضم مدينة تحمل الاسم نفسه.","https://en.wikipedia.org/wiki/Hajjah_Governorate"],
 ["dhamar","ذمار","مكان","مدينة يمنية في المرتفعات جنوب صنعاء.","https://en.wikipedia.org/wiki/Dhamar"],
 ["lahij","لحج","مكان","محافظة يمنية معروفة بالفن اللحجي.","https://en.wikipedia.org/wiki/Lahij_Governorate"],
 ["abs","عبس","مكان","اسم مديرية يمنية في محافظة حجة.","https://en.wikipedia.org/wiki/Abs_District"],
 ["zubair","الزبيري","شخصية","لقب شاعر يمني ارتبط بالدعوة للجمهورية.","https://ar.wikipedia.org/wiki/محمد_محمود_الزبيري"],
 ["hamdiword","الحمدي","شخصية","لقب رئيس يمني تولى الحكم عام 1974م.","https://ar.wikipedia.org/wiki/إبراهيم_الحمدي"],
 ["sallalword","السلال","شخصية","لقب أول رئيس للجمهورية العربية اليمنية.","https://ar.wikipedia.org/wiki/عبد_الله_السلال"],
 ["ayoubword","أيوب","شخصية","الاسم الأول لفنان يمني لحّن النشيد الوطني.","https://ar.wikipedia.org/wiki/أيوب_طارش"],
 ["anse","الآنسي","شخصية","لقب فنان يمني اشتهر بالغناء الصنعاني.","https://ar.wikipedia.org/wiki/علي_بن_علي_الآنسي"],
 ["faisalword","فيصل","شخصية","الاسم الأول لفنان يمني ارتبط بالغناء اللحجي.","https://ar.wikipedia.org/wiki/فيصل_علوي"],
 ["jabal","جبل","طبيعة","تضاريس مرتفعة تكثر في المرتفعات اليمنية.","https://www.britannica.com/place/Yemen"],
 ["wadi","وادي","طبيعة","منخفض طبيعي تجري فيه السيول وقت الأمطار.","https://www.britannica.com/place/Yemen"],
 ["terraces","مدرجات","تراث","شكل زراعي متدرج على سفوح الجبال اليمنية.","https://www.britannica.com/place/Yemen"],
 ["flood","سيول","طبيعة","مياه أمطار تتدفق في الأودية وقد تُستغل للري.","https://www.britannica.com/place/Yemen"],
 ["incense","لبان","تراث","مادة عطرية تاريخية ارتبطت بتجارة جنوب الجزيرة.","https://www.britannica.com/topic/frankincense"],
 ["silver","فضة","تراث","معدن اشتهرت به حرفة صناعة الحلي التقليدية.","https://en.wikipedia.org/wiki/Yemenite_silversmithing"],
 ["musand","النقوش","تراث","كتابات قديمة محفوظة على الأحجار والقطع الأثرية.","https://whc.unesco.org/en/list/1700/"],
 ["rasul","رسولي","تاريخ","نسبة إلى دولة حكمت اليمن في العصر الوسيط.","https://www.britannica.com/place/Yemen"],
 ["sulayhi","صليحي","تاريخ","نسبة إلى دولة حكمت أجزاء من اليمن في القرن الحادي عشر.","https://www.britannica.com/place/Yemen"],
 ["qataban","قتبان","تاريخ","مملكة قديمة عاصمتها تمنع في وادي بيحان.","https://whc.unesco.org/en/tentativelists/6856/"],
 ["timna","تمنع","تاريخ","اسم عاصمة مملكة قتبان القديمة.","https://whc.unesco.org/en/tentativelists/6856/"],
 ["awam","أوام","تراث","اسم معبد سبئي أثري في مأرب.","https://whc.unesco.org/en/list/1700/"],
 ["barran","برآن","تراث","اسم معبد أثري سبئي في مأرب.","https://whc.unesco.org/en/list/1700/"],
 ["unity","الوحدة","حدث","اتحاد شطري اليمن في مايو 1990م.","https://history.state.gov/countries/yemen"],
 ["sept","سبتمبر","حدث","اسم شهر يرتبط بثورة 26 عام 1962م.","https://history.state.gov/countries/yemen"],
 ["nov","نوفمبر","حدث","شهر إعلان استقلال جنوب اليمن عام 1967م.","https://history.state.gov/countries/yemen"],
 ["soqotri","سقطرية","ثقافة","لغة محلية مميزة يتحدث بها سكان أرخبيل سقطرى.","https://www.unesco.org/en/mab/socotra-archipelago"],
 ["tihami","تهامي","ثقافة","وصف ينتسب إلى سهل تهامة في غرب اليمن.","https://whc.unesco.org/en/list/611/"],
].map(([id,answer,category,question,source])=>({id:'word-'+id,answer,category,question,source,difficulty:1}));
export function buildYemenWordChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return (mode==='daily'?seededShuffle(wordBank,key+'|words').slice(0,GAME_ROUND_SIZE):selectFreshTasks(wordBank,{seed:key+'|words',seen,count:GAME_ROUND_SIZE})).map((task,i)=>({
  ...task,letters:seededShuffle(Array.from(task.answer).map((letter,index)=>({letter,id:index})),key+'|letters-'+i)
 }));
}

// The object game prioritizes tangible heritage over repeating Guess the Place.
// These additional Commons files depict a Sana'a-market jambiya and traditional Yemenite silverwork.
const objectMedia={
 jambiya:{file:'Jambiya.jpg',credit:'Bernard Gagnon',license:'CC BY-SA / التفاصيل في صفحة الصورة'},
 amulet:{file:'Amulet case.jpg',credit:'Davidbena',license:'CC BY-SA 4.0'},
 silverJewelry:{file:'Silver jewelry.jpg',credit:'Davidbena',license:'CC BY-SA 4.0'},
};
const objectBank=[
 ['jambiya','جنبية يمنية','خنجر ذو نصل مقوّس يرتبط باللباس اليمني التقليدي.'],
 ['amulet','حافظة تميمة فضية','قطعة من تراث صياغة الفضة لدى يهود اليمن.'],
 ['silverJewelry','حلي فضية يمنية','حلي تقليدية ارتبطت بحرفة صياغة الفضة في اليمن.'],
 ['musnad','نقش بالخط المسند','نقش حجري يحمل حروفًا من كتابة جنوب الجزيرة العربية القديمة.'],
 ['coffee','نبتة البن','نبات اشتهر اليمن بزراعته وتجارته عبر ميناء المخا.'],
 ['socotra','شجرة دم الأخوين','شجرة ذات تاج مظلي تشتهر بها جزيرة سقطرى.'],
 ['dam','سد مأرب','منشأة تاريخية لإدارة المياه والري في مأرب.'],
 ['barran','معبد برآن','موقع أثري مرتبط بمملكة سبأ في مأرب.'],
 ['awam','معبد أوام','أحد المعابد السبئية الأثرية في مأرب.'],
 ['shaharah','جسر شهارة','جسر حجري معلق بين موضعين جبليين.'],
 ['taiz','قلعة القاهرة','حصن تاريخي يطل على مدينة تعز.'],
 ['arwa','مسجد الملكة أروى','مبنى ديني تاريخي مرتبط بمدينة جبلة.'],
 ['aden1910','بطاقة بريدية لعدن','صورة تاريخية قديمة للميناء تظهر ضمن بطاقة بريدية.'],
 ["sana","عمارة صنعاء القديمة","مبانٍ تقليدية مزخرفة بالجص الأبيض في صنعاء."],
 ["sana2","منازل صنعانية تقليدية","مبانٍ برجية مميزة في مدينة صنعاء القديمة."],
 ["shibam","أبراج شبام الطينية","بناء مرتفع من الطوب الطيني في وادي حضرموت."],
 ["shibam2","أزقة مدينة شبام","مشهد عمراني قديم لمدينة مبنية بالطين."],
 ["arwa2","مسجد جبلة التاريخي","مبنى مرتبط بتاريخ الملكة أروى في جبلة."],
 ["aden1967","صورة تاريخية لميناء عدن","مشهد بحري بعدن من أرشيف القرن العشرين."],
 ["protest","صورة احتجاجات صنعاء","توثيق فوتوغرافي لحشود في صنعاء عام 2011م."],
 ["mountains","منظر جبلي يمني","صورة للمرتفعات حول كوكبان."],
].map(([id,answer,hint])=>{
 const photo=historyPhotoLibrary[id]||objectMedia[id];
 if(!photo)throw Error('Missing curated Yemeni photo: '+id);
 return {id:'object-'+id,answer,hint,photo:{url:historyPhotoSource(photo),page:historyPhotoPage(photo),credit:photo.credit,license:photo.license},source:historyPhotoPage(photo),difficulty:1};
});
export function buildObjectChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return (mode==='daily'?seededShuffle(objectBank,key+'|objects').slice(0,GAME_ROUND_SIZE):selectFreshTasks(objectBank,{seed:key+'|objects',seen,count:GAME_ROUND_SIZE})).map((item,i)=>{
  const alt=seededShuffle(objectBank.filter(x=>x.id!==item.id),key+'|objects-alt-'+i).slice(0,3);
  const options=seededShuffle([item,...alt],key+'|objects-options-'+i).map(x=>x.answer);
  return {...item,options,correct:options.indexOf(item.answer)};
 });
}
export const extraGameBuilders={who:buildWhoChallenges,bigger:buildBiggerChallenges,connect:buildConnectChallenges,yemenword:buildYemenWordChallenges,object:buildObjectChallenges};
