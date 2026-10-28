import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('verified scoreboard does not accept client scores and locks every question server-side',async()=>{
 const route=await read('app/api/games/daily/round/route.js');
 assert.match(route,/db\.auth\.getUser\(token\)/);
 assert.match(route,/OFFICIAL_ANSWER_WINDOW_MS/);
 assert.match(route,/body.action==='ready'/);
 assert.match(route,/question_started_at/);
 assert.match(route,/officialCorrect\(/);
 assert.match(route,/officialPoints\(/);
 assert.match(route,/\.eq\('phase','question'\)/);
 assert.match(route,/\.eq\('step_index',step\)/);
 assert.doesNotMatch(route,/body\.(?:score|points|correctCount)/);
});
test('official daily claim snapshots server-authoritative question keys and one account claim',async()=>{
 const claim=await read('app/api/games/daily/route.js');
 const scoring=await read('lib/dailyVerifiedScore.js');
 assert.match(claim,/officialQuestionSnapshot\(db,game,date\)/);
 assert.match(claim,/game_daily_attempts/);
 assert.match(scoring,/buildQuizRound/);
 assert.match(scoring,/buildPlaceChallenges/);
 assert.match(scoring,/buildTimelineChallenges/);
 assert.match(scoring,/buildMapChallenges/);
});
test('leaderboard is unified, period-filtered and reads finished scores only',async()=>{
 const route=await read('app/api/games/leaderboard/route.js');
 assert.match(route,/weekly/);assert.match(route,/monthly/);assert.match(route,/all/);
 assert.match(route,/\.eq\('phase','finished'\)/);
 assert.match(route,/\.eq\('challenge_date',today\)/);
 assert.match(route,/public_profiles/);
});
test('migration protects answer keys from browser SELECT and normalizes score',async()=>{
 const migration=await read('supabase/migrations/20261028211450_games_verified_leaderboard.sql');
 assert.match(migration,/revoke all on table public\.game_daily_attempts from anon,authenticated/);
 assert.match(migration,/grant select \(id,user_id,challenge_date,game_type,started_at\)/);
 assert.match(migration,/score between 0 and 1000/);
});
test('daily games and account provide access to the leaderboard',async()=>{
 const [home,account,quiz,arcade]=await Promise.all([
  read('app/games/page.jsx'),read('components/account/AccountWorkspace.jsx'),
  read('components/games/QuizGame.jsx'),read('components/games/ArcadeChallenge.jsx')
 ]);
 for(const file of [home,account,quiz,arcade])assert.match(file,/\/games\/leaderboard/);
 assert.match(quiz,/daily\.progress\('answer'/);
 assert.match(arcade,/daily\.progress\('answer'/);
});
