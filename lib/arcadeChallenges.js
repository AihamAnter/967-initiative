import {seededShuffle,dailySeed,GAME_ROUND_SIZE} from './gameEngine.js';
import {historyStarter} from './yemenHistory.js';
import {historyPhotoLibrary,historyPhotoSource,historyPhotoPage} from './historyVisuals.js';
import {yemenGovernorates} from './yemeniFigures.js';
import {selectFreshTasks} from './practiceRotation.js';

export const gameTypes={
 place:{title:'خمن المكان',description:'شاهد الصورة وحدد المكان من بين أربعة اختيارات.',english:'GUESS THE PLACE'},
 timeline:{title:'رتب التاريخ',description:'المس الأحداث بالترتيب الزمني من الأقدم إلى الأحدث.',english:'TIME ORDER'},
 map:{title:'أين تقع؟',description:'انقر على المحافظة الصحيحة في خريطة اليمن.',english:'MAP QUEST'},
};
const historicSlugs=[
 'saba','sirwah','awam-temple','baran-temple','timna','ancient-sea-trade',
 'islamic-sanaa','ziyadids','yu-firids','al-hadi-legacy','najahids','sulayhids',
 'queen-arwa-administration','ayyubid-takeover','rasulids','rasulid-taiz',
 'tahirids','aden-1839','aden-suez','ottoman-end-1918',
 'constitutional-revolution-1948','revolution-1962','independence-1967',
 'unity-1990','war-1994','2011-protests','national-dialogue-2013','un-truce-2022'
];
const legacyTimelineEvents=historicSlugs.map(slug=>historyStarter.find(item=>item.slug===slug))
 .filter(Boolean).map(({slug,title,year})=>({id:slug,title,year,source:'/yemen-history/'+slug}));

/** Expand the timeline from the site's own published, dated historical articles. */
const allDatedEvents=historyStarter.filter(item=>item.isPublished!==false
 &&typeof item.slug==='string'&&Number.isFinite(item.year)&&item.year!==0
 &&item.title&&item.certainty!=='تمهيدي'&&item.certainty!=='تقريبي');
export const timelineEvents=[...new Map([...legacyTimelineEvents,
 ...allDatedEvents.map(({slug,title,year})=>({id:slug,title,year,source:'/yemen-history/'+slug}))
 ].map(event=>[event.id,event])).values()];

export function buildTimelineChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const amount=mode==='daily'?3:4;
 // Preserve the live 28–29 Oct official question snapshot and order.
 if(mode==='daily'&&date<'2026-10-30'){
  const shuffled=seededShuffle(legacyTimelineEvents,key+'|timelines');
  return Array.from({length:GAME_ROUND_SIZE},(_,index)=>{
   const start=(index*amount)%shuffled.length;
   const chosen=[],years=new Set();
   for(let i=0;chosen.length<amount&&i<shuffled.length;i++){
    const event=shuffled[(start+i)%shuffled.length];
    if(!years.has(event.year)){chosen.push(event);years.add(event.year);}
   }
   const events=seededShuffle(chosen,key+'|timeline-'+index);
   return {id:'timeline-'+index,events,correct:[...chosen].sort((a,b)=>a.year-b.year).map(e=>e.id),difficulty:1};
  });
 }
 const candidateCount=mode==='daily'?GAME_ROUND_SIZE:Math.max(110,timelineEvents.length*2);
 const candidates=Array.from({length:candidateCount},(_,index)=>{
  const shuffled=seededShuffle(timelineEvents,key+'|timeline-pool-'+Math.floor(index/6));
  const start=(index*amount)%shuffled.length;
  const chosen=[],years=new Set();
  for(let i=0;chosen.length<amount&&i<shuffled.length;i++){
   const event=shuffled[(start+i)%shuffled.length];
   if(!years.has(event.year)){chosen.push(event);years.add(event.year);}
  }
  if(chosen.length<amount)return null;
  const id='timeline-'+chosen.map(e=>e.id).sort().join('--');
  return {
   id,
   events:seededShuffle(chosen,key+'|'+id),
   correct:[...chosen].sort((a,b)=>a.year-b.year).map(e=>e.id),
   difficulty:amount===3?1:2
  };
 }).filter(Boolean);
 const unique=[...new Map(candidates.map(item=>[item.id,item])).values()];
 return mode==='daily'?unique.slice(0,GAME_ROUND_SIZE):selectFreshTasks(unique,{seed:key+'|timelines',seen,count:GAME_ROUND_SIZE});
}
const locationBank=[
 ['shibam','شبام حضرموت',['صنعاء القديمة','شبام حضرموت','زبيد','مأرب'],'مدينة منازلها الطينية مرتفعة ضمن سور تاريخي.','https://whc.unesco.org/en/list/192/'],
 ['sanaOld','صنعاء القديمة',['صنعاء القديمة','تعز','عدن','المخا'],'مدينة تشتهر بعمارتها البرجية ذات الزخارف البيضاء.','https://whc.unesco.org/en/list/385/'],
 ['zabid','زبيد',['المكلا','جبلة','زبيد','تريم'],'مدينة في تهامة تشتهر بدورها العلمي والعمراني.','https://whc.unesco.org/en/list/611/'],
 ['marib','مأرب',['صرواح','مأرب','عدن','شهارة'],'من مواقع الممالك القديمة شرق صنعاء.','https://whc.unesco.org/en/list/1700/'],
 ['barran','معبد برآن في مأرب',['معبد برآن في مأرب','قلعة القاهرة','مسجد الملكة أروى','جسر شهارة'],'معبد أثري يرتبط بمملكة سبأ.','https://whc.unesco.org/en/list/1700/'],
 ['arwa','جبلة',['صعدة','المخا','جبلة','براقش'],'مدينة ارتبطت بالملكة أروى بنت أحمد.','/yemen-history/jibla-capital'],
 ['taiz','قلعة القاهرة في تعز',['قلعة القاهرة في تعز','معبد أوام','سد مأرب','جسر شهارة'],'حصن تاريخي يشرف على مدينة يمنية في المرتفعات.','/yemen-history/medieval-taiz-monuments'],
 ['shaharah','جسر شهارة',['جسر شهارة','قلعة القاهرة','مدينة شبام','معبد برآن'],'جسر تاريخي يصل بين موضعين جبليين في عمران.','/yemen-history/shaharah-bridge'],
 ['socotra','سقطرى',['حراز','سقطرى','تهامة','بيحان'],'جزيرة تُعرف بنباتاتها الفريدة وأشجار دم الأخوين.','/yemen-map?region=YE32'],
 ['aden1910','ميناء عدن',['ميناء عدن','زبيد','تمنع','صنعاء'],'ميناء تاريخي عند مدخل البحر الأحمر وبحر العرب.','/yemen-history/aden-1839'],
 ['sana2','صنعاء القديمة',['زبيد','صنعاء القديمة','تعز','جبلة'],'المدينة المعروفة بمنازلها المميزة متعددة الطوابق.','https://whc.unesco.org/en/list/385/'],
 ['shibam2','شبام حضرموت',['شبام حضرموت','صعدة','الجوف','براقش'],'مدينة تاريخية في وادي حضرموت.','https://whc.unesco.org/en/list/192/'],
 ["awam","معبد أوام",["معبد أوام","قلعة القاهرة","جسر شهارة","مسجد الملكة أروى"],"موقع ديني وأثري قديم قرب مدينة مأرب.","https://whc.unesco.org/en/list/1700/"],
 ["dam","سد مأرب",["سد مأرب","ميناء عدن","معبد برآن","جسر شهارة"],"منشأة مائية قديمة ارتبطت بالزراعة في سبأ.","https://whc.unesco.org/en/list/1700/"],
 ["arwa2","جبلة",["جبلة","زنجبار","صعدة","تعز"],"مدينة يرتبط مسجدها بتاريخ الملكة أروى.","/yemen-history/jibla-capital"],
 ["taiz2","تعز",["المخا","صنعاء","تعز","زبيد"],"منظر لمدينة يمنية التقط من قلعة القاهرة.","/yemen-history/rasulid-taiz"],
 ["aden","عدن",["عدن","الحديدة","المكلا","صنعاء"],"مدينة مينائية يمنية تظهر في صورة تاريخية من الستينيات.","/yemen-history/aden-1839"],
 ["aden1967","ميناء عدن",["ميناء عدن","سد مأرب","مدينة شبام","ميناء المخا"],"صورة أرشيفية تاريخية لسفن ومرافق عدن.","/yemen-history/independence-1967"],
 ["aden1967b","ميناء عدن",["ميناء عدن","ميناء المخا","سقطرى","زبيد"],"صورة أرشيفية للسفن قرب مرفأ مدينة يمنية.","/yemen-history/independence-1967"],
 ["sana","صنعاء القديمة",["صنعاء القديمة","زبيد","تريم","شبام حضرموت"],"صورة أخرى لمدينة الأبراج المزخرفة.","https://whc.unesco.org/en/list/385/"],
 ["mountains","كوكبان",["كوكبان","جبلة","المكلا","زنجبار"],"منطقة جبلية يمنية ذات منظر مدرج وتاريخ عمران.","/yemen-history/kawkaban"],
];
export const placeChallenges=locationBank.map(([imageKey,answer,options,hint,source],i)=>{
 const photo=historyPhotoLibrary[imageKey];
 if(!photo)throw Error('Unknown photo '+imageKey);
 return {id:'place-'+i,photo:{url:historyPhotoSource(photo),page:historyPhotoPage(photo),credit:photo.credit,license:photo.license},answer,options,hint,source,difficulty:1};
});
export function buildPlaceChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const candidates=mode==='daily'&&date<'2026-10-30'
  ?seededShuffle(placeChallenges.slice(0,12),key+'|places').slice(0,GAME_ROUND_SIZE)
  :mode==='daily'?seededShuffle(placeChallenges,key+'|places')
  :selectFreshTasks(placeChallenges,{seed:key+'|places',seen,count:placeChallenges.length});
 // Different photos of Sana'a or Aden are not repeated as the same correct answer within one round.
 const chosen=[],answers=new Set(),rest=[];
 for(const item of candidates){
  if(!answers.has(item.answer)){chosen.push(item);answers.add(item.answer);}
  else rest.push(item);
 }
 const tasks=mode==='daily'&&date<'2026-10-30'?candidates:[...chosen,...rest].slice(0,GAME_ROUND_SIZE);
 return tasks.map((item,index)=>{
  const options=seededShuffle(item.options,key+'|answers-'+index);
  return {...item,options,correct:options.indexOf(item.answer)};
 });
}
export function buildMapChallenges({mode='practice',date,seed='967',seen=[]}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const regions=yemenGovernorates.map(region=>({...region,id:'region-'+region.id,regionId:region.id}));
 return (mode==='daily'?seededShuffle(regions,key+'|regions').slice(0,GAME_ROUND_SIZE):selectFreshTasks(regions,{seed:key+'|regions',seen,count:GAME_ROUND_SIZE})).map(region=>({
  id:region.id,regionId:region.regionId,name:region.name,difficulty:1,
  source:'/yemen-map?region='+region.regionId,
 }));
}
export function formatYear(year){return year<0?Math.abs(year)+' ق.م':year+'م';}
export function isTimelineCorrect(events,orderedIds){
 return events.length===orderedIds.length&&
 orderedIds.every((id,index)=>id===[...events].sort((a,b)=>a.year-b.year)[index].id);
}
