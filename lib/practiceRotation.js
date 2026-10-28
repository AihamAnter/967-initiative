import {seededShuffle} from './gameEngine.js';

const KEY='967-practice-seen-v2-';
const MAX_HISTORY=1600;
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=180;

/** Select unseen questions before seen ones; when a finite bank runs out, replay the oldest. */
export function selectFreshTasks(items,{seed='967',seen=[],count=10}={}){
 const unique=[...new Map(items.filter(item=>item&&validId(item.id)).map(item=>[item.id,item])).values()];
 const shuffled=seededShuffle(unique,seed+'|practice-pool');
 const lastSeen=new Map(seen.filter(validId).map((id,index)=>[id,index]));
 const fresh=[],old=[];
 for(const item of shuffled)(lastSeen.has(item.id)?old:fresh).push(item);
 old.sort((a,b)=>lastSeen.get(a.id)-lastSeen.get(b.id));
 return [...fresh,...old].slice(0,count);
}

/** Anonymous and signed-in free play retain a bounded browser history, never a score claim. */
export function readPracticeSeen(game){
 try{
  const data=JSON.parse(localStorage.getItem(KEY+game)||'[]');
  return Array.isArray(data)?data.filter(validId).slice(-MAX_HISTORY):[];
 }catch{return [];}
}
export function rememberPracticeTasks(game,ids){
 try{
  const before=readPracticeSeen(game);
  const upcoming=ids.filter(validId);
  const used=new Set(upcoming);
  const merged=[...before.filter(id=>!used.has(id)),...new Set(upcoming)];
  localStorage.setItem(KEY+game,JSON.stringify(merged.slice(-MAX_HISTORY)));
 }catch{/* Private browsing and blocked storage must not prevent practice. */}
}
