import {seededShuffle,dailySeed,GAME_ROUND_SIZE} from './gameEngine.js';
import {historyStarter} from './yemenHistory.js';
import {historyPhotoLibrary,historyPhotoSource,historyPhotoPage} from './historyVisuals.js';
import {yemenGovernorates} from './yemeniFigures.js';

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
export const timelineEvents=historicSlugs.map(slug=>historyStarter.find(item=>item.slug===slug))
 .filter(Boolean).map(({slug,title,year})=>({id:slug,title,year,source:'/yemen-history/'+slug}));
export function buildTimelineChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const amount=mode==='daily'?3:4;
 const shuffled=seededShuffle(timelineEvents,key+'|timelines');
 return Array.from({length:GAME_ROUND_SIZE},(_,index)=>{
  const start=(index*amount)%shuffled.length;
  const chosen=[],years=new Set();
  for(let i=0;chosen.length<amount&&i<shuffled.length;i++){
   const event=shuffled[(start+i)%shuffled.length];
   if(!years.has(event.year)){chosen.push(event);years.add(event.year);}
  }
  const events=seededShuffle(chosen,key+'|timeline-'+index);
  return {id:'timeline-'+index,events,correct:[...chosen].sort((a,b)=>a.year-b.year).map(e=>e.id),difficulty:amount===3?1:2};
 });
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
];
export const placeChallenges=locationBank.map(([imageKey,answer,options,hint,source],i)=>{
 const photo=historyPhotoLibrary[imageKey];
 if(!photo)throw Error('Unknown photo '+imageKey);
 return {id:'place-'+i,photo:{url:historyPhotoSource(photo),page:historyPhotoPage(photo),credit:photo.credit,license:photo.license},answer,options,hint,source,difficulty:1};
});
export function buildPlaceChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 const tasks=seededShuffle(placeChallenges,key+'|places').slice(0,GAME_ROUND_SIZE);
 return tasks.map((item,index)=>{
  const options=seededShuffle(item.options,key+'|answers-'+index);
  return {...item,options,correct:options.indexOf(item.answer)};
 });
}
export function buildMapChallenges({mode='practice',date,seed='967'}={}){
 const key=mode==='daily'?dailySeed(date):seed;
 return seededShuffle(yemenGovernorates,key+'|regions').slice(0,GAME_ROUND_SIZE).map(region=>({
  id:'region-'+region.id,regionId:region.id,name:region.name,difficulty:1,
  source:'/yemen-map?region='+region.id,
 }));
}
export function formatYear(year){return year<0?Math.abs(year)+' ق.م':year+'م';}
export function isTimelineCorrect(events,orderedIds){
 return events.length===orderedIds.length&&
 orderedIds.every((id,index)=>id===[...events].sort((a,b)=>a.year-b.year)[index].id);
}
