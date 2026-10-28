import {DAILY_GAME_ORDER,utcDay} from './dailyGame.js';

const DAY_MS=86400000;
const WEEK_MS=7*DAY_MS;
const WEEK_ANCHOR=Date.parse('2026-10-26T00:00:00.000Z');

/** Official gaming weeks run Monday 00:00 UTC through the following Monday. */
export function officialGameWeek(value=new Date()){
 const today=utcDay(value);
 const day=Date.parse(today+'T00:00:00.000Z');
 const weekday=new Date(day).getUTCDay();
 const start=day-((weekday+6)%7)*DAY_MS;
 const end=start+WEEK_MS;
 const cycle=((Math.floor((start-WEEK_ANCHOR)/WEEK_MS)%3)+3)%3;
 return {
  start:utcDay(start),end:utcDay(end),
  resetsAt:new Date(end).toISOString(),
  cycle
 };
}

const weeklyPlans=[
 [
  {id:'complete-2',title:'البداية القوية',description:'أكمل تحدي اليوم الرسمي في يومين مختلفين.',metric:'days',goal:2,icon:'calendar',kind:'المشاركة'},
  {id:'correct-12',title:'حصاد المعرفة',description:'اجمع 12 إجابة صحيحة في تحديات هذا الأسبوع.',metric:'correct',goal:12,icon:'target',kind:'المعرفة'},
  {id:'variety-2',title:'جرب شيئًا جديدًا',description:'أكمل تحديات رسمية في لعبتين مختلفتين.',metric:'different',goal:2,icon:'puzzle',kind:'التنوع'},
 ],
 [
  {id:'complete-3',title:'ثلاثة أيام من التحدي',description:'أكمل تحدي اليوم في ثلاثة أيام مختلفة هذا الأسبوع.',metric:'days',goal:3,icon:'calendar',kind:'المشاركة'},
  {id:'accurate-2',title:'دقة الاستكشاف',description:'حقق 7 إجابات صحيحة على الأقل في جولتين رسميتين.',metric:'accurate',goal:2,icon:'target',kind:'الإتقان'},
  {id:'variety-3',title:'التجول بين الألعاب',description:'أكمل التحدي الرسمي في ثلاث ألعاب مختلفة.',metric:'different',goal:3,icon:'puzzle',kind:'التنوع'},
 ],
 [
  {id:'complete-4',title:'مثابرة الأربعة أيام',description:'أكمل تحدي اليوم في أربعة أيام مختلفة هذا الأسبوع.',metric:'days',goal:4,icon:'calendar',kind:'المشاركة'},
  {id:'correct-24',title:'جامع الإجابات',description:'اجمع 24 إجابة صحيحة في تحديات الأسبوع.',metric:'correct',goal:24,icon:'target',kind:'المعرفة'},
  {id:'strong-750',title:'نتيجة استثنائية',description:'احصل على 750 نقطة أو أكثر في تحدٍ رسمي واحد.',metric:'strong',goal:1,icon:'zap',kind:'الإتقان'},
 ]
];

export function getWeeklyGameMissions(week=officialGameWeek()){
 return weeklyPlans[week.cycle].map(mission=>({...mission}));
}

/** Progress derives only from authoritative completed attempts, never from submitted scores. */
export function calculateWeeklyGameMissions(attempts,week=officialGameWeek()){
 const valid=Array.isArray(attempts)?attempts.filter(item=>item
  &&item.phase==='finished'
  &&typeof item.challenge_date==='string'
  &&item.challenge_date>=week.start&&item.challenge_date<week.end
  &&DAILY_GAME_ORDER.includes(item.game_type)
  &&Number.isInteger(item.score)&&item.score>=0&&item.score<=1000
  &&Number.isInteger(item.correct_count)&&item.correct_count>=0&&item.correct_count<=10):[];
 // A player can only finish one official challenge per UTC date.
 const attemptsByDate=new Map();
 for(const item of valid)if(!attemptsByDate.has(item.challenge_date))
  attemptsByDate.set(item.challenge_date,item);
 const rows=[...attemptsByDate.values()];
 const values={
  days:rows.length,
  correct:rows.reduce((sum,item)=>sum+item.correct_count,0),
  different:new Set(rows.map(item=>item.game_type)).size,
  accurate:rows.filter(item=>item.correct_count>=7).length,
  strong:rows.some(item=>item.score>=750)?1:0
 };
 const missions=getWeeklyGameMissions(week).map(mission=>{
  const progress=Math.min(mission.goal,values[mission.metric]||0);
  return {...mission,progress,completed:progress>=mission.goal};
 });
 return {
  weekStart:week.start,weekEnd:week.end,resetsAt:week.resetsAt,
  completed:missions.filter(m=>m.completed).length,
  total:missions.length,missions,
  verifiedRounds:rows.length
 };
}

/** Public definitions for guests: do not falsely display zero as their real progress. */
export function publicWeeklyGameMissions(week=officialGameWeek()){
 return {
  weekStart:week.start,weekEnd:week.end,resetsAt:week.resetsAt,
  completed:null,total:3,verifiedRounds:null,
  missions:getWeeklyGameMissions(week).map(m=>({...m,progress:null,completed:null}))
 };
}
