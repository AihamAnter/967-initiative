// The official round must match the questions and options that are visible
// to the player. The fingerprint contains no hidden answer keys and is NOT
// an anti-cheat secret; server-side grading is still authoritative.
import {utcDay} from './dailyGame.js';
import {stableHash} from './gameEngine.js';

export const OFFICIAL_ROUND_LENGTH=10;
export function dailyPublicQuestionFingerprint(game,task){
 const base={id:task.id,difficulty:task.difficulty};
 let visible;
 switch(game){
  case 'quiz':
   visible={...base,question:task.question,options:task.options,category:task.category};break;
  case 'timeline':
   visible={...base,events:task.events.map(e=>({id:e.id,title:e.title}))};break;
  case 'map':
   visible={...base,name:task.name};break;
  case 'who':
   visible={...base,hints:task.hints,options:task.options};break;
  case 'bigger':
   visible={...base,topic:task.topic,unit:task.unit,question:task.question,
    options:task.options.map(o=>({name:o.name}))};break;
  case 'connect':
   visible={...base,topic:task.topic,question:task.question,
    pairs:task.pairs.map(p=>({id:p.id,left:p.left})),
    leftOrder:task.leftOrder,rightOrder:task.rightOrder};break;
  case 'yemenword':
   visible={...base,question:task.question,category:task.category,letters:task.letters};break;
  case 'place':
  case 'object':
   visible={...base,photo:task.photo,hint:task.hint,options:task.options};break;
  default:throw Error('Unsupported official game');
 }
 return stableHash(JSON.stringify(visible)).toString(36);
}
export function matchingDailyQuestionIds(ids,snapshot,fingerprints){
 if(!Array.isArray(ids)||ids.length!==OFFICIAL_ROUND_LENGTH||
   ids.some(id=>typeof id!=='string'||id.length<1||id.length>160)||
   new Set(ids).size!==OFFICIAL_ROUND_LENGTH||
   !Array.isArray(fingerprints)||fingerprints.length!==OFFICIAL_ROUND_LENGTH||
   fingerprints.some(sig=>typeof sig!=='string'||!/^[0-9a-z]{1,10}$/.test(sig))||
   !Array.isArray(snapshot)||snapshot.length!==OFFICIAL_ROUND_LENGTH)return false;
 return snapshot.every((question,i)=>question?.id===ids[i]&&question?.publicFingerprint===fingerprints[i]);
}
export function dailyAttemptDateOpen(date,now=new Date()){
 return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date===utcDay(now);
}
