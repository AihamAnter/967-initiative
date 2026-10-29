// UTC is the shared school day boundary across devices.
export const SCHOOL_GOALS=[1,2,3];
export function utcDay(value){const d=new Date(value);return Number.isFinite(d.valueOf())?d.toISOString().slice(0,10):null;}
export function learningActivity(attempts=[],dailyGoal=1,now=new Date()){
 const goal=SCHOOL_GOALS.includes(dailyGoal)?dailyGoal:1,days=new Map();
 for(const row of attempts){
  if(!['passed','failed'].includes(row?.status)||(typeof row.course_slug!=='string'||!/^[a-z][a-z0-9-]{2,39}$/.test(row.course_slug)))continue;
  const day=utcDay(row.submitted_at);
  if(!day||!Number.isInteger(row.stage_index)||row.stage_index<0||row.stage_index>11)continue;
  if(!days.has(day))days.set(day,new Set());
  days.get(day).add(row.course_slug+':'+row.stage_index);
 }
 const today=utcDay(now),todayCount=days.get(today)?.size||0;
 const activeDays=new Set([...days].filter(([,v])=>v.size>0).map(([day])=>day));
 const cursor=new Date(today+'T00:00:00.000Z');
 if(!activeDays.has(today))cursor.setUTCDate(cursor.getUTCDate()-1);
 let streak=0;
 while(activeDays.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1);}
 return {dailyGoal:goal,todayCount,todayProgress:Math.min(100,Math.round(todayCount/goal*100)),reachedGoal:todayCount>=goal,streak,activeDays:activeDays.size,day:today};
}
