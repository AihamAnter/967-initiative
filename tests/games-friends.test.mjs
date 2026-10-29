import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildQuizRound} from '../lib/gameEngine.js';
import {quizStarter} from '../lib/gameQuestions.js';
import {buildPlaceChallenges,buildMapChallenges,buildTimelineChallenges} from '../lib/arcadeChallenges.js';
import {extraGameBuilders} from '../lib/extraGames.js';
import {FRIEND_GAMES,FRIEND_SECONDS,friendGameTitle,friendTaskKey,friendPublicTask,validFriendChoice,friendAnswerCorrect,friendScore,validFriendId} from '../lib/friendChallenge.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const tasksByGame={
 quiz:()=>buildQuizRound(quizStarter,{mode:'practice',seed:'match-friends-967'}),
 place:()=>buildPlaceChallenges({mode:'practice',seed:'match-friends-967'}),
 timeline:()=>buildTimelineChallenges({mode:'practice',seed:'match-friends-967'}),
 map:()=>buildMapChallenges({mode:'practice',seed:'match-friends-967'}),
 ...Object.fromEntries(Object.entries(extraGameBuilders).map(([id,fn])=>[id,()=>fn({mode:'practice',seed:'match-friends-967'})]))
};

test('all nine friends game modes generate ten questions with the same immutable seed',()=>{
 assert.equal(FRIEND_GAMES.length,9);
 assert.deepEqual(FRIEND_SECONDS,[10,15,20,30]);
 for(const id of FRIEND_GAMES){
  const a=tasksByGame[id](),b=tasksByGame[id]();
  assert.equal(a.length,10,id);
  assert.equal(new Set(a.map(t=>t.id)).size,10,id);
  assert.deepEqual(a,b,id);
  assert.ok(friendGameTitle(id).length>2,id);
 }
});

test('all nine friend question payloads hide solutions until the answer is committed',()=>{
 for(const id of FRIEND_GAMES){
  for(const task of tasksByGame[id]()){
   const secret={...task,key:friendTaskKey(id,task)};
   const safe=friendPublicTask(id,secret);
   const reveal=friendPublicTask(id,secret,{reveal:true});
   assert.ok(safe?.id,id);
   assert.ok(!Object.hasOwn(safe,'key'),id);
   assert.ok(!Object.hasOwn(safe,'correct'),id);
   assert.ok(!Object.hasOwn(safe,'answer'),id);
   assert.ok(!Object.hasOwn(safe,'regionId'),id);
   assert.ok(reveal&&Object.hasOwn(reveal,'correct'),id);
   if(id==='bigger')assert.ok(safe.options.every(x=>!Object.hasOwn(x,'value')),'Bigger must hide numerical answers');
   if(id==='timeline')assert.ok(safe.events.every(x=>!Object.hasOwn(x,'year')),'Timeline must hide chronological years');
   if(id==='connect')assert.ok(safe.pairs.every(x=>!Object.hasOwn(x,'right')),'Connect must hide paired answers');
   if(id==='who')assert.ok(!Object.hasOwn(safe,'name'),'Who must hide the person name');
  }
 }
});

test('friend validation supports timed-out answers and the four-event timeline board',()=>{
 assert.equal(validFriendChoice('timeline',null),true);
 assert.equal(validFriendChoice('timeline',['first','second','third','fourth']),true);
 assert.equal(validFriendChoice('timeline',['first','second','third']),false);
 assert.equal(validFriendChoice('timeline',['first','first','third','fourth']),false);
 assert.equal(validFriendChoice('connect',['x','y','z']),true);
 assert.equal(validFriendChoice('map','YE26'),true);
 assert.equal(validFriendChoice('map','YEabc; DROP TABLE'),false);
 assert.equal(validFriendId('b83fe594-86d7-4945-84bf-1816405892f1'),true);
 assert.equal(validFriendId('../../dashboard'),false);
});

test('friend score is calculated exclusively from the preserved server snapshot',()=>{
 const round=tasksByGame.quiz().map(task=>({...task,key:task.correct}));
 const answers=round.map(task=>({correct:friendAnswerCorrect('quiz',task,task.correct)}));
 const totals=friendScore(round,answers);
 assert.equal(totals.score,1000);
 assert.equal(totals.correctCount,10);
 assert.equal(friendScore(round,round.map(()=>({correct:false}))).score,0);
});

test('private duel tables enforce one account per link, two slots and no browser writes',()=>{
 const sql=read('supabase/migrations/20261029000239_game_friends.sql');
 assert.ok(sql.includes('references auth.users(id) on delete cascade'));
 assert.ok(sql.includes('unique(challenge_id,user_id)'));
 assert.ok(sql.includes('unique(challenge_id,slot)'));
 assert.ok(sql.includes('check (slot between 1 and 2)'));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('revoke all on public.game_friend_challenges from anon,authenticated'));
 assert.ok(sql.includes('revoke all on public.game_friend_players from anon,authenticated'));
 assert.ok(!sql.includes('grant insert'));
 assert.ok(!sql.includes('grant select'));
});

test('creation and match actions require real user authentication and same origin',()=>{
 const creation=read('app/api/games/friends/route.js');
 const match=read('app/api/games/friends/[id]/route.js');
 const service=read('lib/friendChallengeServer.js');
 for(const src of [creation,match])assert.ok(src.includes('friendPlayerAuth(request,db)'));
 for(const src of [creation,match])assert.ok(src.includes('isSameOrigin(request)'));
 assert.ok(service.includes('db.auth.getUser(token)'));
 assert.ok(service.includes('!user.email_confirmed_at'));
 assert.ok(service.includes('if(count>=6)'));
 assert.ok(service.includes("if(players.length!==1||players.some(p=>p.slot===2)"));
 assert.ok(service.includes("if(!me&&players.length>=2)"));
 assert.ok(service.includes('if(friendMatchExpired(match))'));
 assert.ok(service.includes('.eq(\'phase\',\'question\').eq(\'step_index\',me.step_index)'));
 assert.ok(service.includes(".eq('question_started_at',me.question_started_at)"));
 assert.ok(service.includes('friendAnswerCorrect(match.game,task,body.choice)'));
 assert.ok(service.includes('friendScore(match.question_bank,answers)'));
 assert.ok(!service.includes("game_daily_attempts"));
 assert.ok(!service.includes("game_player_achievements"));
});

test('friend invitation appears beside Start inside all nine games, never separately on the lobby',()=>{
 const home=read('app/games/page.jsx');
 const quiz=read('components/games/QuizGame.jsx');
 const arcade=read('components/games/ArcadeChallenge.jsx');
 const extra=read('components/games/ExtraArcadeChallenge.jsx');
 const creator=read('components/games/FriendInviteAction.jsx');
 const styles=read('components/games/FriendInviteAction.module.css');
 const legacy=read('app/games/friends/page.jsx');
 const search=read('lib/searchPages.js');
 const seo=read('lib/seo.js');
 assert.ok(!home.includes('href="/games/friends"'),'no separate entry on games homepage');
 assert.ok(!home.includes('friendStrip'),'no independent duel section');
 for(const view of [quiz,arcade,extra]){
  assert.ok(view.includes('<FriendInviteAction'),'each of the nine games receives the button');
  assert.ok(view.includes('className={friendStyles.actionRow}'));
  assert.ok(view.includes('onClick={start}'),'normal Start remains available beside the challenge button');
 }
 assert.ok(quiz.includes('game="quiz"'));
 assert.ok(arcade.includes('game={game}'));
 assert.ok(extra.includes('game={game}'));
 assert.ok(creator.includes("fetch('/api/games/friends'"));
 assert.ok(creator.includes('seconds}),'));
 assert.ok(creator.includes('navigator.clipboard.writeText'));
 assert.ok(creator.includes('افتح التحدي وانتظر صديقك'));
 assert.ok(styles.includes('.actionRow{display:flex'));
 assert.ok(styles.includes('@media(max-width:600px)'));
 assert.ok(legacy.includes("redirect('/games')"));
 assert.ok(!search.includes("href:'/games/friends'"));
 assert.ok(!seo.includes("'/games/friends'"));
});

test('both participants automatically see each other, without stale network polls resetting answers',()=>{
 const match=read('components/games/FriendDuel.jsx');
 const route=read('app/games/friends/[id]/page.jsx');
 const server=read('lib/friendChallengeServer.js');
 const css=read('components/games/FriendDuel.module.css');
 assert.ok(match.includes('<PlaceBoard'));
 assert.ok(match.includes('<TimelineBoard'));
 assert.ok(match.includes('<MapBoard'));
 assert.ok(match.includes('<ExtraBoard'));
 assert.ok(match.includes('useQuestionTimer'));
 assert.ok(match.includes("post('answer'"));
 assert.ok(match.includes('finishedBoth'));
 assert.ok(match.includes('myPosition.score>other.score'));
 assert.ok(match.includes('},2500)'),'polling should update other player within seconds');
 assert.ok(match.includes("document.addEventListener('visibilitychange'"));
 assert.ok(match.includes("window.addEventListener('focus'"));
 assert.ok(match.includes('mutating.current=true'));
 assert.ok(match.includes('mutationVersion.current+=1'));
 assert.ok(match.includes('version!==mutationVersion.current'));
 assert.ok(match.includes('if(!alive||inFlight||mutating.current)return'));
 assert.ok(match.includes('lastPlayerCount.current===1&&result.players?.length===2'));
 assert.ok(match.includes('setJoinedNotice'));
 assert.ok(match.includes('setPhase(previous=>previous===\\'ready\\'?\\'ready\\':\\'error\\')'));
 assert.ok(css.includes('.joinedNotice'));
 assert.ok(css.includes('.liveStatus'));
 assert.ok(route.includes('noindex:true'));
 assert.ok(server.includes("if(!me&&players.length>=2)"));
});


test('unstarted questions are never exposed through the invitation status API',()=>{
 const service=read('lib/friendChallengeServer.js');
 const client=read('components/games/FriendDuel.jsx');
 assert.ok(service.includes("task:me.phase==='question'&&!me.question_started_at?null:friendPublicTask("));
 assert.ok(service.includes("body.action!=='ready'&&task.id!==body.questionId"));
 assert.ok(client.includes("post('ready')"));
 assert.ok(client.includes('!started&&'));
 assert.ok(client.includes('started||mine?.phase==='));
});

test('no official daily challenge or leaderboard rules were changed',()=>{
 const daily=read('app/api/games/daily/route.js');
 const leaderboard=read('app/api/games/leaderboard/route.js');
 const achievements=read('lib/gameAchievementRepository.js');
 assert.ok(daily.includes('game_daily_attempts'));
 assert.ok(leaderboard.includes(".eq('phase','finished')"));
 assert.ok(achievements.includes("from('game_daily_attempts')"));
 assert.ok(!daily.includes('game_friend_players'));
 assert.ok(!leaderboard.includes('game_friend_players'));
 assert.ok(!achievements.includes('game_friend_players'));
});
