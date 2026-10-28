import {seededShuffle,dailySeed,GAME_ROUND_SIZE} from './gameEngine.js';
import {historyPhotoLibrary,historyPhotoSource,historyPhotoPage} from './historyVisuals.js';

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
 ['morshed','محمد مرشد ناجي','مطرب يمني.','عمل على إحياء ألوان من الغناء اليمني.','اشتهر بلقب «المرشدي».','https://ar.wikipedia.org/wiki/محمد_مرشد_ناجي'],
 ['maqaleh','عبد العزيز المقالح','شاعر وناقد وأكاديمي.','ترأس جامعة صنعاء لسنوات.','كان من أبرز وجوه الشعر والنقد اليمني الحديث.','https://ar.wikipedia.org/wiki/عبد_العزيز_المقالح'],
 ['fathi','أحمد فتحي','عازف ومطرب وملحن يمني.','يُعرف بمهارته في العزف على العود.','قدم ألحانًا وأعمالًا يمنية وعربية على العود.','https://ar.wikipedia.org/wiki/أحمد_فتحي_(موسيقي)'],
 ['sayf','سيف بن ذي يزن','شخصية ارتبطت بتاريخ اليمن القديم ورواياته الشعبية.','تُنسب إليه حكايات في سيرة شعبية طويلة.','ارتبط اسمه بمقاومة الحكم الحبشي في اليمن بحسب المرويات.','https://ar.wikipedia.org/wiki/سيف_بن_ذي_يزن'],
 ['hamdani','الهمداني','عالم يمني من القرن الرابع الهجري.','ألّف في الجغرافيا والأنساب.','من أشهر مؤلفاته «صفة جزيرة العرب».','https://ar.wikipedia.org/wiki/الحسن_بن_أحمد_الهمداني'],
 ['nashwan','نشوان الحميري','عالم وأديب يمني من العصور الإسلامية.','اشتهر بالتاريخ واللغة.','من مؤلفاته «شمس العلوم».','https://ar.wikipedia.org/wiki/نشوان_الحميري'],
].map(([id,name,h1,h2,h3,source])=>({id:'who-'+id,name,hints:[h1,h2,h3],source,difficulty:1}));

export function buildWhoChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const people=seededShuffle(famousPeople,key+'|people').slice(0,GAME_ROUND_SIZE);
 return people.map((p,i)=>{
  const distractors=seededShuffle(famousPeople.filter(x=>x.id!==p.id),key+'|distractors|'+p.id).slice(0,3);
  const options=seededShuffle([p,...distractors],key+'|options|'+i).map(x=>x.name);
  return {...p,options,correct:options.indexOf(p.name)};
 });
}

// Stable Wikidata-derived governorate area figures in km²; mountain figures from GeoNames.
const area=[['حضرموت',193032],['المهرة',82405],['شبوة',47728],['الجوف',30620],['أبين',21939],['مأرب',20023],['الحديدة',17509],['لحج',15210],['صنعاء',15052],['صعدة',15022],['تعز',12605],['البيضاء',11193],['ذمار',9495],['حجة',8228],['إب',6484],['سقطرى',3650],['عدن',1114]];
const mountain=[['جبل النبي شعيب',3666],['جبل الطيال',3491],['جبل القلة',3233],['جبل شخب عمار',3218],['جبل عيبان',3187],['جبل صبر',3070],['جبل ظفار',3004]];
const areaPairs=[[0,1],[0,2],[1,2],[2,3],[3,4],[4,5],[5,10],[6,12],[7,13],[8,14],[10,15],[9,16],[11,14],[12,16],[13,15],[14,16]];
const mountainPairs=[[0,1],[0,5],[1,4],[2,5],[3,6],[4,6],[1,6],[2,4]];
const compareBank=[
 ...areaPairs.map(([a,b],i)=>({id:'area-'+i,unit:'كم²',topic:'مساحة المحافظات',question:'أي المحافظتين أكبر مساحة؟',a:{name:area[a][0],value:area[a][1]},b:{name:area[b][0],value:area[b][1]},source:'https://geotaria.com/en/map/yemen'})),
 ...mountainPairs.map(([a,b],i)=>({id:'mountain-'+i,unit:'متر',topic:'ارتفاع الجبال',question:'أي الجبلين أعلى ارتفاعًا؟',a:{name:mountain[a][0],value:mountain[a][1]},b:{name:mountain[b][0],value:mountain[b][1]},source:'https://www.geonames.org/YE/highest-mountains-in-yemen.html'})),
];
export function buildBiggerChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return seededShuffle(compareBank,key+'|comparisons').slice(0,GAME_ROUND_SIZE).map((item,i)=>{
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
].map(([topic,pairs],i)=>({
 id:'match-'+i,topic,pairs:pairs.map(([left,right],j)=>({id:'m'+j,left,right})),difficulty:1,
 source:i===3?'https://www.britannica.com/place/Yemen/History':'/yemen-history'
}));
export function buildConnectChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return seededShuffle(matchSets,key+'|matching').slice(0,GAME_ROUND_SIZE).map((item,i)=>({
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
].map(([id,answer,category,question,source])=>({id:'word-'+id,answer,category,question,source,difficulty:1}));
export function buildYemenWordChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return seededShuffle(wordBank,key+'|words').slice(0,GAME_ROUND_SIZE).map((task,i)=>({
  ...task,letters:seededShuffle(Array.from(task.answer).map((letter,index)=>({letter,id:index})),key+'|letters-'+i)
 }));
}

const objectBank=[
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
 ['shibam','عمارة شبام الطينية','مبانٍ طينية متعددة الطوابق في حضرموت.'],
 ['sanaOld','عمارة صنعاء القديمة','مبانٍ تقليدية مرتفعة ذات زخارف بيضاء.'],
 ['zabid','عمارة زبيد التاريخية','مبانٍ وشوارع تاريخية من المدينة التهامية.'],
].map(([id,answer,hint])=>{
 const photo=historyPhotoLibrary[id];
 if(!photo)throw Error('Missing curated Yemeni photo: '+id);
 return {id:'object-'+id,answer,hint,photo:{url:historyPhotoSource(photo),page:historyPhotoPage(photo),credit:photo.credit,license:photo.license},source:historyPhotoPage(photo),difficulty:1};
});
export function buildObjectChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return seededShuffle(objectBank,key+'|objects').slice(0,GAME_ROUND_SIZE).map((item,i)=>{
  const alt=seededShuffle(objectBank.filter(x=>x.id!==item.id),key+'|objects-alt-'+i).slice(0,3);
  const options=seededShuffle([item,...alt],key+'|objects-options-'+i).map(x=>x.answer);
  return {...item,options,correct:options.indexOf(item.answer)};
 });
}
export const extraGameBuilders={who:buildWhoChallenges,bigger:buildBiggerChallenges,connect:buildConnectChallenges,yemenword:buildYemenWordChallenges,object:buildObjectChallenges};
