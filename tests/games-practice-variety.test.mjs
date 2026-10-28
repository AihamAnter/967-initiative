import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quizStarter} from '../lib/gameQuestions.js';
import {buildQuizRound} from '../lib/gameEngine.js';
import {selectFreshTasks} from '../lib/practiceRotation.js';
import {extraGameBuilders,famousPeople} from '../lib/extraGames.js';
import {placeChallenges,timelineEvents,buildPlaceChallenges,buildTimelineChallenges,buildMapChallenges} from '../lib/arcadeChallenges.js';
import {yemenGovernorates} from '../lib/yemeniFigures.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const allGames={
 place:buildPlaceChallenges,timeline:buildTimelineChallenges,map:buildMapChallenges,
 ...extraGameBuilders
};

test('enriched banks grow with no duplicate editorial identifiers or invalid quiz choices',()=>{
 assert.ok(quizStarter.length>=75);
 assert.equal(new Set(quizStarter.map(q=>q.id)).size,quizStarter.length);
 assert.ok(quizStarter.every(q=>q.options.length===4&&q.correct>=0&&q.correct<4&&q.options[q.correct]&&q.explanation.length>=25&&q.source.url.startsWith('https://')));
 assert.ok(famousPeople.length>=22,'avoid unknown filler characters; known figures only');
 assert.equal(new Set(famousPeople.map(p=>p.name)).size,famousPeople.length);
 assert.ok(placeChallenges.length>=21);
 assert.equal(new Set(placeChallenges.map(p=>p.photo.url)).size,placeChallenges.length);
 assert.ok(timelineEvents.length>=120);
 assert.ok(yemenGovernorates.length>=22);
});
test('practice selector exhausts unseen IDs before replaying old ones, then uses oldest first',()=>{
 const pool=Array.from({length:25},(_,i)=>({id:'test-'+i}));
 const a=selectFreshTasks(pool,{seed:'round-one',count:10});
 const b=selectFreshTasks(pool,{seed:'round-two',seen:a.map(t=>t.id),count:10});
 assert.equal(new Set([...a,...b].map(t=>t.id)).size,20);
 const c=selectFreshTasks(pool,{seed:'round-three',seen:[...a,...b].map(t=>t.id),count:10});
 assert.equal(c.filter(x=>!a.some(y=>y.id===x.id)&&!b.some(y=>y.id===x.id)).length,5);
 assert.equal(new Set(c.map(x=>x.id)).size,10);
 assert.equal(selectFreshTasks([],{}).length,0);
});
test('all eight non-quiz games avoid question duplicates for two consecutive practice rounds',()=>{
 for(const [id,build] of Object.entries(allGames)){
  const first=build({mode:'practice',seed:'user-round-1',seen:[]});
  const second=build({mode:'practice',seed:'user-round-2',seen:first.map(q=>q.id)});
  assert.equal(first.length,10,id);
  assert.equal(second.length,10,id);
  assert.equal(new Set([...first,...second].map(q=>q.id)).size,20,id);
 }
});
test('knowledge quiz avoids repetition even across category-filtered sessions',()=>{
 const first=buildQuizRound(quizStarter,{seed:'knowledge-1'});
 const second=buildQuizRound(quizStarter,{seed:'knowledge-2',seen:first.map(q=>q.id)});
 assert.equal(new Set([...first,...second].map(q=>q.id)).size,20);
 const filtered=quizStarter.filter(q=>q.category==='heritage');
 const round=buildQuizRound(quizStarter,{category:'heritage',seed:'heritage-repeat',seen:filtered.map(q=>q.id)});
 assert.ok(round.every(q=>q.category==='heritage'));
 assert.equal(new Set(round.map(q=>q.id)).size,round.length);
});
test('guess-the-place shows ten different locations in its opening practice round',()=>{
 const round=buildPlaceChallenges({seed:'different-locations',seen:[]});
 assert.equal(new Set(round.map(q=>q.answer)).size,10);
 assert.ok(round.every(q=>q.options[q.correct]===q.answer));
});
test('daily challenge stays deterministic and ignores per-browser practice history',()=>{
 for(const [id,build] of Object.entries(allGames)){
  const args={mode:'daily',date:'2026-11-09'};
  const initial=build(args);
  const altered=build({...args,seen:initial.map(q=>q.id)});
  assert.deepEqual(altered,initial,id);
  assert.equal(initial.length,10,id);
  assert.equal(new Set(initial.map(q=>q.id)).size,10,id);
 }
 assert.deepEqual(
  buildPlaceChallenges({mode:'daily',date:'2026-10-27'}),
  buildPlaceChallenges({mode:'daily',date:'2026-10-27',seen:['place-1','place-2']})
 );
 assert.deepEqual(
  buildTimelineChallenges({mode:'daily',date:'2026-10-28'}),
  buildTimelineChallenges({mode:'daily',date:'2026-10-28',seen:['timeline-1','timeline-2']})
 );
});
test('practice history is persisted per game without changing official daily attempts',()=>{
 const storage=read('lib/practiceRotation.js');
 assert.ok(storage.includes("const KEY='967-practice-seen-v2-'"));
 assert.ok(storage.includes('localStorage.getItem'));
 assert.ok(storage.includes('localStorage.setItem'));
 assert.ok(storage.includes('MAX_HISTORY=1600'));
 const clients=['components/games/QuizGame.jsx','components/games/ArcadeChallenge.jsx','components/games/ExtraArcadeChallenge.jsx'];
 for(const path of clients){
  const code=read(path);
  assert.ok(code.includes('readPracticeSeen'),path);
  assert.ok(code.includes('rememberPracticeTasks'),path);
  assert.ok(code.includes("mode==='practice'"),path);
  assert.ok(code.includes("mode==='daily'?[]:readPracticeSeen"),path);
 }
 const claim=read('app/api/games/daily/route.js');
 assert.ok(claim.includes('dailyGameForDate(date)'));
 assert.ok(claim.includes('question_bank:questionBank'));
 assert.ok(!claim.includes('practiceRotation'));
});
