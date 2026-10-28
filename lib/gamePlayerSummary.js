import {utcDay} from './dailyGame.js';

/** Completed, server-verified official attempts only. Free-play browser points are excluded. */
export function summarizeOfficialAttempts(attempts,today=utcDay()){
 const completed=attempts.filter(row=>row?.phase==='finished'&&
  /^\d{4}-\d{2}-\d{2}$/.test(row.challenge_date)&&
  Number.isFinite(row.score)&&row.score>=0&&row.score<=1000);
 const bestScore=completed.reduce((high,row)=>Math.max(high,row.score),0);
 const totalScore=completed.reduce((sum,row)=>sum+row.score,0);
 const totalCorrect=completed.reduce((sum,row)=>sum+(Number(row.correct_count)||0),0);
 const days=[...new Set(completed.map(row=>row.challenge_date))].sort().reverse();
 const yesterday=utcDay(Date.parse(today+'T00:00:00Z')-86400000);
 let streak=0;
 // A streak remains active until the following UTC midnight, so a player
 // who played yesterday still has a chance to continue it today.
 if(days[0]===today||days[0]===yesterday){
  for(let i=0;i<days.length;i++){
   if(i&&Date.parse(days[i-1]+'T00:00:00Z')-Date.parse(days[i]+'T00:00:00Z')!==86400000)break;
   streak++;
  }
 }
 return {played:completed.length,bestScore,totalScore,totalCorrect,streak};
}
