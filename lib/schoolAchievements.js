import {xpSummary} from './schoolXp.js';
import {utcDay} from './schoolLearningHabits.js';

// Badges derive only from the protected XP ledger and already-graded attempts.
// Longest streak is historical, so earned badges never disappear on a missed day.
export function longestLearningStreak(rows=[]){
 const days=new Set();
 for(const row of rows){
  if(!['passed','failed'].includes(row?.status)||!['musnad','arud'].includes(row.course_slug)||
    !Number.isInteger(row.stage_index)||row.stage_index<0||row.stage_index>11)continue;
  const day=utcDay(row.submitted_at);
  if(day)days.add(day);
 }
 let longest=0,current=0,prev=null;
 for(const day of [...days].sort()){
  const time=Date.parse(day+'T00:00:00.000Z');
  current=prev!==null&&time-prev===86400000?current+1:1;
  longest=Math.max(longest,current);
  prev=time;
 }
 return longest;
}
export function schoolAchievementSummary(credits=[],attempts=[]){
 const xp=xpSummary(credits),m=xp.byCourse.musnad/100,a=xp.byCourse.arud/100;
 const completed=m+a,streak=longestLearningStreak(attempts);
 const definitions=[
  {id:'first-step',title:'البداية الموفقة',description:'إتقان أول محطة',icon:'sparkles',earned:completed>=1},
  {id:'three-stations',title:'على الطريق',description:'إتقان 3 محطات مختلفة',icon:'route',earned:completed>=3},
  {id:'eight-stations',title:'متعلم مثابر',description:'إتقان 8 محطات مختلفة',icon:'target',earned:completed>=8},
  {id:'twelve-stations',title:'12 محطة',description:'إتقان 12 محطة مختلفة',icon:'graduation-cap',earned:completed>=12},
  {id:'both-courses',title:'متعدد المعارف',description:'إتقان محطة من المسند وأخرى من العروض',icon:'book-open-check',earned:m>=1&&a>=1},
  {id:'musnad-half',title:'قارئ المسند',description:'إتقان 6 محطات من خط المسند',icon:'pen-line',earned:m>=6},
  {id:'musnad-master',title:'متقن المسند',description:'إتقان المحطات الـ12 من خط المسند',icon:'award',earned:m===12},
  {id:'arud-half',title:'عارف الأوزان',description:'إتقان 6 محطات من علم العروض',icon:'waves',earned:a>=6},
  {id:'arud-master',title:'متقن العروض',description:'إتقان المحطات الـ12 من علم العروض',icon:'medal',earned:a===12},
  {id:'three-days',title:'ثلاثة أيام من التعلم',description:'التعلم في 3 أيام متتالية',icon:'flame',earned:streak>=3},
  {id:'seven-days',title:'أسبوع من التعلم',description:'التعلم في 7 أيام متتالية',icon:'calendar-check',earned:streak>=7}
 ];
 return {earned:definitions.filter(b=>b.earned).length,total:definitions.length,longestStreak:streak,badges:definitions};
}
