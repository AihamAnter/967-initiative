import {buildQuizRound,dailySeed,questionPoints} from './gameEngine.js';
import {buildPlaceChallenges,buildTimelineChallenges,buildMapChallenges} from './arcadeChallenges.js';
import {readGameCatalog} from './gameRepository.js';

const builders={place:buildPlaceChallenges,timeline:buildTimelineChallenges,map:buildMapChallenges};
export const OFFICIAL_QUESTION_COUNT=10;
export const OFFICIAL_ANSWER_WINDOW_MS=8200; // 7s player timer + bounded request latency.
export async function officialQuestionSnapshot(db,game,date){
 let items;
 if(game==='quiz'){
  const catalog=await readGameCatalog(db);
  items=buildQuizRound(catalog.questions,{mode:'daily',seed:dailySeed(date)});
 }else if(Object.hasOwn(builders,game)){
  items=builders[game]({mode:'daily',date});
 }else throw Error('Unsupported game');
 if(items.length!==OFFICIAL_QUESTION_COUNT)throw Error('Incomplete daily challenge');
 return items.map(task=>({
  id:task.id,
  difficulty:task.difficulty,
  key:game==='map'?task.regionId:task.correct
 }));
}
export function validateOfficialChoice(game,choice){
 if(choice===null)return true; // A missed question or an expired client timer.
 if(game==='map')return typeof choice==='string'&&/^YE[A-Za-z0-9-]{1,8}$/.test(choice);
 if(game==='timeline')return Array.isArray(choice)&&choice.length===3&&choice.every(x=>typeof x==='string'&&x.length<=64)&&new Set(choice).size===choice.length;
 return Number.isInteger(choice)&&choice>=0&&choice<=3;
}
export function officialCorrect(game,key,choice){
 if(choice===null)return false;
 return game==='timeline'?Array.isArray(key)&&Array.isArray(choice)&&key.length===choice.length&&key.every((id,i)=>id===choice[i]):choice===key;
}
export function officialPoints(questions,answers){
 let raw=0,correct=0,streak=0;
 for(let i=0;i<answers.length;i++){
  if(answers[i].correct){raw+=questionPoints(questions[i],true,streak);correct++;streak++;}
  else streak=0;
 }
 const perfect=questions.reduce((sum,item,i)=>sum+questionPoints(item,true,i),0);
 return {scoreRaw:raw,score:Math.min(1000,Math.round(1000*raw/perfect)),correctCount:correct};
}
