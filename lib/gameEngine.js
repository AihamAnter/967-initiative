import {quizCategories,difficultyLabels} from './gameQuestions.js';
export const GAME_ROUND_SIZE=10;
export function stableHash(input){
 let h=2166136261>>>0;for(const c of String(input)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h>>>0;
}
export function seededShuffle(items,seed){
 const arr=[...items];let state=stableHash(seed)||1;
 const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;
}
export function buildQuizRound(questions,{mode='practice',category='all',difficulty='all',seed='967'}={}){
 const published=questions.filter(q=>q.isPublished!==false);
 const eligible=published.filter(q=>(category==='all'||q.category===category)&&(difficulty==='all'||q.difficulty===Number(difficulty)));
 const pool=seededShuffle(eligible,seed+'|pool');
 const selected=pool.slice(0,GAME_ROUND_SIZE);
 return selected.map((q,index)=>{
  const shuffled=seededShuffle(q.options.map((label,original)=>({label,original})),seed+'|'+q.id+'|'+index);
  return {...q,options:shuffled.map(x=>x.label),correct:shuffled.findIndex(x=>x.original===q.correct)};
 });
}
export function dailySeed(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Daily date must use YYYY-MM-DD');
 return '967-daily-'+date;
}
export function questionPoints(question,isCorrect,streak=0){
 if(!isCorrect)return 0;
 return 100+20*(question.difficulty-1)+Math.min(5,Math.max(0,streak))*10;
}
export function scoreRound(round,answers){
 let total=0,correct=0,streak=0;
 round.forEach((q,i)=>{
  const right=answers[i]===q.correct;
  if(right){correct++;total+=questionPoints(q,true,streak);streak++;}else{streak=0;}
 });
 return {total,correct,answered:answers.filter(Number.isInteger).length,max:round.reduce((s,q)=>s+questionPoints(q,true,0),0)};
}
export function gameLevels(count){return count>=50?'خبير اليمن':count>=20?'مستكشف متمرس':count>=5?'مستكشف':'مبتدئ';}
export {quizCategories,difficultyLabels};
