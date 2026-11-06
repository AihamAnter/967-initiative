import test from 'node:test';
import assert from 'node:assert/strict';
import {officialQuestionSnapshot,officialCorrect} from '../lib/dailyVerifiedScore.js';
import {friendPublicTask} from '../lib/friendChallenge.js';
import {DAILY_GAME_ORDER} from '../lib/dailyGame.js';

const DATE='2026-11-07';
const KEY='official-test-secret-seed';
// Fields that reveal a solution, anywhere in the JSON sent before answering.
const LEAKS=['"correct"','"answer"','"regionId"','"explanation"','"source"','"year"','"value"','"right"','"key"','"reveal"'];

test('daily tasks sent before answering carry no solution fields in any game',async()=>{
 for(const game of DAILY_GAME_ORDER){
  const bank=await officialQuestionSnapshot(null,game,DATE,{dailyKey:KEY});
  assert.equal(bank.length,10,game);
  for(const entry of bank){
   const json=JSON.stringify(friendPublicTask(game,entry.reveal));
   for(const leak of LEAKS)assert.ok(!json.includes(leak),game+' leaks '+leak+': '+json.slice(0,160));
   assert.equal(JSON.parse(json).id,entry.id,game);
  }
 }
});

test('the revealed task matches the server key, so feedback and grading agree',async()=>{
 for(const game of DAILY_GAME_ORDER){
  const bank=await officialQuestionSnapshot(null,game,DATE,{dailyKey:KEY});
  for(const {key,reveal} of bank){
   const choice=game==='map'?reveal.regionId:game==='yemenword'?reveal.answer:reveal.correct;
   assert.ok(officialCorrect(game,key,choice),game+' '+reveal.id);
  }
 }
});

test('a secret daily key changes the round, so the public seed cannot predict it',async()=>{
 for(const game of DAILY_GAME_ORDER){
  const ids=async options=>(await officialQuestionSnapshot(null,game,DATE,options)).map(entry=>entry.id+':'+JSON.stringify(entry.key)).join('|');
  const publicRound=await ids({});
  assert.notEqual(await ids({dailyKey:KEY}),publicRound,game);
  assert.equal(await ids({dailyKey:KEY}),await ids({dailyKey:KEY}),game+' must stay deterministic for one key');
 }
});
