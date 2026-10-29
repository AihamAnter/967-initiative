import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

async function scoring(){
 const source=(await readFile(new URL('../lib/dailyVerifiedScore.js',import.meta.url),'utf8'))
  .split('\n').filter(line=>!line.trimStart().startsWith('import ')).join('\n')
  .replaceAll('export const ','const ').replaceAll('export async function ','async function ')
  .replaceAll('export function ','function ');
 const fn=new Function('buildPlaceChallenges','buildTimelineChallenges','buildMapChallenges','extraGameBuilders','questionPoints',source+
  '\nreturn {officialPoints,officialCorrect,validateOfficialChoice,OFFICIAL_ANSWER_WINDOW_MS}');
 return fn(()=>[],()=>[],()=>[],{},(q,right,streak)=>right?100+20*(q.difficulty-1)+Math.min(5,streak)*10:0);
}
test('official scores normalize perfect rounds to 1000 for each difficulty',async()=>{
 const {officialPoints}=await scoring();
 for(const difficulty of [1,2,3]){
  const questions=Array.from({length:10},(_,i)=>({id:'q'+i,difficulty}));
  const full=officialPoints(questions,questions.map(()=>({correct:true})));
  assert.equal(full.correctCount,10);
  assert.equal(full.score,1000);
  assert.equal(officialPoints(questions,questions.map(()=>({correct:false}))).score,0);
 }
});
test('official score ignores user-claimed point values',async()=>{
 const {officialPoints}=await scoring();
 const questions=Array.from({length:10},(_,i)=>({difficulty:i%3+1}));
 const partial=officialPoints(questions,questions.map((_,i)=>({correct:i%2===0,points:999999})));
 assert.equal(partial.correctCount,5);
 assert.ok(partial.score>0&&partial.score<1000);
 assert.equal(officialPoints(questions,questions.map(()=>({correct:false,points:999999}))).score,0);
});
test('only exact ordering and supported answer types count',async()=>{
 const {officialCorrect,validateOfficialChoice,OFFICIAL_ANSWER_WINDOW_MS}=await scoring();
 assert.equal(officialCorrect('timeline',['saba','aden','unity'],['saba','aden','unity']),true);
 assert.equal(officialCorrect('timeline',['saba','aden','unity'],['unity','aden','saba']),false);
 assert.equal(officialCorrect('quiz',2,3),false);
 assert.equal(officialCorrect('quiz',2,null),false);
 assert.equal(validateOfficialChoice('timeline',['one','two','three']),true);
 assert.equal(validateOfficialChoice('timeline',['one','one','three']),false);
 assert.equal(validateOfficialChoice('quiz',5),false);
 assert.equal(validateOfficialChoice('map','YE31'),true);
 assert.ok(OFFICIAL_ANSWER_WINDOW_MS>=7000&&OFFICIAL_ANSWER_WINDOW_MS<=8500);
});
