import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quizStarter,quizCategories,difficultyLabels} from '../lib/gameQuestions.js';
import {validateGameQuestion,mergeGameQuestions,parseGameRow,GAME_QUESTIONS_KEY} from '../lib/gameRepository.js';
import {buildQuizRound,dailySeed,scoreRound,seededShuffle,questionPoints,gameLevels} from '../lib/gameEngine.js';
import {pageIsVisible,sectionIsVisible,publicSections} from '../lib/pageVisibility.js';
import {searchPages} from '../lib/searchPages.js';
import {buildSitemap,DEFAULT_SITE_ORIGIN} from '../lib/seo.js';
import {ADMIN_TAB_IDS} from '../lib/adminLists.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Games quiz bank has 40 unique, documented, fully validated multiple-choice questions',()=>{
 assert.ok(quizStarter.length>=40);
 const ids=new Set();
 for(const q of quizStarter){
  assert.doesNotThrow(()=>validateGameQuestion(q),q.id);
  assert.ok(!ids.has(q.id),q.id);ids.add(q.id);
  assert.equal(q.options.length,4);assert.ok(q.options[q.correct]);
  assert.ok(q.source.url.startsWith('https://'));
  assert.ok(q.explanation.length>=25);
 }
 assert.equal(ids.size,quizStarter.length);
 assert.ok(['history','geography','heritage','culture'].every(key=>quizStarter.some(q=>q.category===key)));
});
test('Daily challenge stays identical for same date, reshuffles across dates and returns 10 distinct questions',()=>{
 const a=buildQuizRound(quizStarter,{mode:'daily',seed:dailySeed('2026-10-28')});
 const b=buildQuizRound(quizStarter,{mode:'daily',seed:dailySeed('2026-10-28')});
 const c=buildQuizRound(quizStarter,{mode:'daily',seed:dailySeed('2026-10-29')});
 assert.deepEqual(a,b);
 assert.equal(a.length,10);
 assert.equal(new Set(a.map(q=>q.id)).size,10);
 assert.notDeepEqual(a.map(q=>q.id),c.map(q=>q.id));
 for(const q of a){const original=quizStarter.find(item=>item.id===q.id);
  assert.equal(q.options[q.correct],original.options[original.correct]);}
 assert.throws(()=>dailySeed('28/10/2026'));
});
test('Practice filters difficulty and topic, and quiz score rewards accurate answers only',()=>{
 const round=buildQuizRound(quizStarter,{category:'history',difficulty:2,seed:'test'});
 assert.ok(round.length>=1&&round.length<=10);
 assert.ok(round.every(q=>q.category==='history'&&q.difficulty===2));
 const allRight=scoreRound(round,round.map(q=>q.correct));
 const allWrong=scoreRound(round,round.map(q=>(q.correct+1)%4));
 assert.equal(allRight.correct,round.length);assert.ok(allRight.total>0);
 assert.equal(allWrong.total,0);
 assert.equal(scoreRound(round,[]).answered,0);
 assert.ok(questionPoints(round[0],true,2)>0);
 assert.equal(gameLevels(0),'مبتدئ');
});
test('Admin overrides cannot publish unsafe questions and can hide starter questions',()=>{
 const original=quizStarter[0];
 for(const patch of [
  {id:'../admin'},{correct:5},{category:'deleted'},{difficulty:0},{isPublished:'false'},
  {options:['same','same','a','b']},{explanation:'wrong'},
  {source:{title:'X',url:'javascript:alert(1)'}},
  {source:{title:'X',url:'http://test.com'}},
 ])assert.throws(()=>validateGameQuestion({...original,...patch}));
 const edited=validateGameQuestion({...original,isPublished:false});
 const merged=mergeGameQuestions([edited]);
 assert.equal(merged.length,quizStarter.length);
 assert.equal(merged.find(q=>q.id===original.id).isPublished,false);
 assert.equal(buildQuizRound(merged,{seed:'hidden'}).some(q=>q.id===original.id),false);
 assert.equal(GAME_QUESTIONS_KEY,'967_game_questions_v1');
 assert.throws(()=>parseGameRow({value:{version:2,questions:[]}}));
});
test('Games routes are visible, indexed, searchable and governed independently',()=>{
 assert.equal(sectionIsVisible('games',{}),true);
 assert.equal(pageIsVisible('/games', {games:false}),false);
 assert.equal(pageIsVisible('/games/quiz',{games:false}),false);
 assert.equal(pageIsVisible('/yemen-history',{games:false}),true);
 assert.ok(publicSections.some(s=>s.id==='games'));
 assert.ok(searchPages.some(s=>s.href==='/games'));
 assert.ok(searchPages.some(s=>s.href==='/games/quiz'));
 assert.ok(ADMIN_TAB_IDS.includes('games'));
 const urls=buildSitemap({},{VERCEL_ENV:'production'}).map(x=>x.url);
 assert.ok(urls.includes(DEFAULT_SITE_ORIGIN+'/games'));
 assert.ok(urls.includes(DEFAULT_SITE_ORIGIN+'/games/quiz'));
 const hidden=buildSitemap({pageVisibility:{games:false}},{VERCEL_ENV:'production'}).map(x=>x.url);
 assert.ok(!hidden.includes(DEFAULT_SITE_ORIGIN+'/games/quiz'));
});
test('Games navigation and actual playable UI plus authenticated editorial control are wired',()=>{
 assert.ok(read('components/Header.jsx').includes("['/games', 'ألعاب 967']"));
 assert.ok(read('components/Footer.jsx').includes('href="/games"'));
 assert.ok(read('app/page.jsx').includes("visible('games')"));
 assert.ok(read('app/games/page.jsx').includes('href="/games/quiz?mode=daily"'));
 assert.ok(read('app/games/quiz/page.jsx').includes('<QuizGame'));
 const game=read('components/games/QuizGame.jsx');
 assert.ok(game.includes('onClick={()=>choose(index)}'));
 assert.ok(game.includes('aria-pressed={selected}'));
 assert.ok(game.includes('localStorage.setItem'));
 assert.ok(game.includes('question.source')||game.includes('current.source'));
 assert.ok(game.includes('setResult(summary)'));
 const api=read('app/api/admin/games/route.js');
 assert.ok(api.includes('authorizeEditorRequest'));
 assert.ok(read('components/AdminDashboard.jsx').includes('<GamesAdminPanel'));
 assert.ok(read('components/GamesAdminPanel.jsx').includes("api('PUT'"));
});
