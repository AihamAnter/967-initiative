import {buildQuizRound} from './gameEngine.js';
import {buildPlaceChallenges,buildTimelineChallenges,buildMapChallenges} from './arcadeChallenges.js';
import {extraGameBuilders} from './extraGames.js';
import {readGameCatalog} from './gameRepository.js';
import {FRIEND_GAMES,FRIEND_SECONDS,FRIEND_QUESTIONS,friendGameTitle} from './friendChallengeMeta.js';
export {FRIEND_GAMES,FRIEND_SECONDS,FRIEND_QUESTIONS,friendGameTitle} from './friendChallengeMeta.js';
import {officialCorrect,officialPoints,validateOfficialChoice} from './dailyVerifiedScore.js';

const builders={place:buildPlaceChallenges,timeline:buildTimelineChallenges,map:buildMapChallenges,...extraGameBuilders};
export function validFriendId(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
export function friendTaskKey(game,task){return game==='map'?task.regionId:game==='yemenword'?task.answer:task.correct;}
export async function createFriendTasks(db,game,seed){
 if(!FRIEND_GAMES.includes(game))throw Error('Invalid friend game');
 const tasks=game==='quiz'
  ?buildQuizRound((await readGameCatalog(db)).questions,{mode:'practice',seed})
  :builders[game]({mode:'practice',seed,seen:[]});
 if(!Array.isArray(tasks)||tasks.length!==FRIEND_QUESTIONS||new Set(tasks.map(task=>task.id)).size!==FRIEND_QUESTIONS)throw Error('Challenge content unavailable');
 return tasks.map(task=>({...task,key:friendTaskKey(game,task)}));
}
/** A direct JSON data boundary: hide solution indices, years, relationships, values and names. */
export function friendPublicTask(game,task,{reveal=false}={}){
 if(!task)return null;
 const {key,correct,answer,regionId,name,a,b,source,explanation,...safe}=task;
 let visible={...safe};
 if(game==='quiz'){
  visible={id:task.id,question:task.question,options:task.options,difficulty:task.difficulty,category:task.category};
 }else if(game==='who'){
  visible={id:task.id,hints:task.hints,options:task.options,difficulty:task.difficulty};
 }else if(game==='bigger'){
  visible={id:task.id,topic:task.topic,unit:task.unit,question:task.question,
   options:task.options.map(item=>({name:item.name})),difficulty:task.difficulty};
 }else if(game==='timeline'){
  visible={id:task.id,events:task.events.map(event=>({id:event.id,title:event.title})),difficulty:task.difficulty};
 }else if(game==='map'){
  visible={id:task.id,name:task.name,difficulty:task.difficulty};
 }else if(game==='connect'){
  visible={id:task.id,question:task.question,topic:task.topic,
   pairs:task.pairs.map(pair=>({id:pair.id,left:pair.left})),
   leftOrder:task.leftOrder,rightOrder:task.rightOrder,difficulty:task.difficulty};
 }else if(game==='yemenword'){
  visible={id:task.id,question:task.question,category:task.category,letters:task.letters,difficulty:task.difficulty};
 }else if(game==='place'||game==='object'){
  visible={id:task.id,photo:task.photo,hint:task.hint,options:task.options,difficulty:task.difficulty};
 }
 if(!reveal)return visible;
 // Solutions are sent only to the player after their answer was permanently committed.
 return {...visible,correct:task.correct,answer:task.answer,regionId:task.regionId,
  ...(game==='bigger'?{options:task.options}:{}),
  ...(game==='timeline'?{events:task.events}:{}),
  ...(game==='connect'?{pairs:task.pairs}:{}),
  ...(game==='quiz'?{explanation:task.explanation,source:task.source}:{})};
}
export function validFriendChoice(game,choice){
 if(choice===null)return true;
 if(game==='timeline')return Array.isArray(choice)&&choice.length===4&&choice.every(x=>typeof x==='string'&&x.length>0&&x.length<=150)&&new Set(choice).size===4;
 return validateOfficialChoice(game,choice);
}
export function friendAnswerCorrect(game,task,choice){return officialCorrect(game,task.key,choice);}
export function friendScore(tasks,answers){return officialPoints(tasks,answers);}
