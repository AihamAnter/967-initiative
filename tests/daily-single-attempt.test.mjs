import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {utcDay,dailyGameForDate,dailyGameUrl,nextUtcMidnight,DAILY_GAME_ORDER} from '../lib/dailyGame.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('one globally shared official game per UTC date, rotating through four challenges',()=>{
 assert.deepEqual(DAILY_GAME_ORDER,['quiz','place','timeline','map']);
 const days=['2026-10-28','2026-10-29','2026-10-30','2026-10-31'];
 assert.deepEqual(new Set(days.map(dailyGameForDate)),new Set(DAILY_GAME_ORDER));
 for(const date of days){
  assert.equal(dailyGameForDate(date),dailyGameForDate(date));
  assert.equal(dailyGameUrl(date),'/games/'+dailyGameForDate(date)+'?mode=daily');
 }
 assert.equal(utcDay('2026-10-28T23:59:59.999Z'),'2026-10-28');
 assert.equal(utcDay('2026-10-29T00:00:00.000Z'),'2026-10-29');
 assert.equal(nextUtcMidnight('2026-10-28'),'2026-10-29T00:00:00.000Z');
 assert.throws(()=>dailyGameForDate('2026-02-30'));
});

test('RLS restricts reads and direct writes and a unique SQL constraint blocks concurrent/other-game attempts',()=>{
 const migration=read('supabase/migrations/20261028205636_games_daily_attempts_single_per_utc_day.sql');
 assert.ok(migration.includes('references auth.users(id) on delete cascade'));
 assert.match(migration,/unique\s*\(user_id,\s*challenge_date\)/i);
 assert.match(migration,/enable row level security/i);
 assert.match(migration,/revoke all on public\.game_daily_attempts from anon, authenticated/i);
 assert.match(migration,/grant select on public\.game_daily_attempts to authenticated/i);
 assert.match(migration,/using\s*\(\(select auth\.uid\(\)\)=user_id\)/i);
 assert.ok(!migration.includes('grant insert'));
 assert.ok(!migration.includes('grant update'));
 assert.ok(!migration.includes('grant delete'));
});

test('daily attempt API requires verified authenticated player and never uses untrusted date or points',()=>{
 const code=read('app/api/games/daily/route.js');
 assert.ok(code.includes('isSameOrigin(request)'));
 assert.ok(code.includes('db.auth.getUser(token)'));
 assert.ok(code.includes('email_confirmed_at'));
 assert.ok(code.includes('const date=utcDay()'));
 assert.ok(code.includes('const game=dailyGameForDate(date)'));
 assert.ok(code.includes('body.date!==date||body.game!==game'));
 assert.ok(code.includes(".insert({user_id:user.id,challenge_date:date,game_type:game,question_bank:questionBank"));
 assert.ok(code.includes("error?.code==='23505'"));
 assert.ok(code.includes("return respond({error:'استخدمت محاولتك اليوم"));
 assert.ok(!code.includes('body.points'));
 assert.ok(!code.includes('body.user_id'));
 assert.ok(code.includes("'Cache-Control':'no-store, private'"));
});

test('all game clients claim the attempt only once before starting daily rounds',()=>{
 const lock=read('components/games/useDailyAttempt.js');
 assert.ok(lock.includes("if(pending.current||state.kind!=='ready')return false"));
 assert.ok(lock.includes("method:'POST'"));
 assert.ok(lock.includes("kind:'used'"));
 assert.ok(lock.includes("href=\"/login\""));
 assert.ok(lock.includes("تُستهلك المحاولة حتى لو أغلقت الصفحة"));
 for(const path of ['components/games/QuizGame.jsx','components/games/ArcadeChallenge.jsx']){
  const code=read(path);
  assert.ok(code.includes('useDailyAttempt('),path);
  assert.ok(code.includes('<DailyAttemptNotice'),path);
  assert.ok(code.includes('await daily.reserve()'),path);
  assert.ok(code.includes('if(!granted)return'),path);
 }
 for(const [route,game] of [['app/games/quiz/page.jsx','quiz'],['app/games/place/page.jsx','place'],['app/games/timeline/page.jsx','timeline'],['app/games/map/page.jsx','map']]){
  const code=read(route);
  assert.ok(code.includes("redirect(dailyGameUrl(date))"));
  assert.ok(code.includes("dailyGameForDate(date)!=='"+game+"'"));
 }
});
