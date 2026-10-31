// Align a browser's visible daily round with the authoritative snapshot before
// consuming its one-per-day attempt. IDs only: never receive answer keys here.
import {utcDay} from './dailyGame.js';

export const OFFICIAL_ROUND_LENGTH=10;
export function matchingDailyQuestionIds(ids,snapshot){
 if(!Array.isArray(ids)||ids.length!==OFFICIAL_ROUND_LENGTH||
   ids.some(id=>typeof id!=='string'||id.length<1||id.length>160)||
   new Set(ids).size!==OFFICIAL_ROUND_LENGTH||
   !Array.isArray(snapshot)||snapshot.length!==OFFICIAL_ROUND_LENGTH)return false;
 return snapshot.every((question,i)=>question?.id===ids[i]);
}
export function dailyAttemptDateOpen(date,now=new Date()){
 return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date===utcDay(now);
}
