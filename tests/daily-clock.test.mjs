import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyWindow,dailyGameForDate,dailyGameUrl,DAILY_GAME_ORDER,DAILY_GAME_TITLES,nextUtcMidnight} from '../lib/dailyGame.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('official daily expiry and next opening are at exactly 00:00 UTC, not Malta local midnight',()=>{
 const before=dailyWindow(Date.parse('2026-10-28T23:59:59.500Z'));
 assert.equal(before.date,'2026-10-28');
 assert.equal(before.nextAt,'2026-10-29T00:00:00.000Z');
 assert.equal(before.nextDate,'2026-10-29');
 assert.equal(before.remainingSeconds,1);
 assert.deepEqual([before.hours,before.minutes,before.seconds],[0,0,1]);
 const opened=dailyWindow(Date.parse('2026-10-29T00:00:00.000Z'));
 assert.equal(opened.date,'2026-10-29');
 assert.equal(opened.nextAt,'2026-10-30T00:00:00.000Z');
 assert.equal(opened.remainingSeconds,86400);
 assert.deepEqual([opened.hours,opened.minutes,opened.seconds],[24,0,0]);
 assert.equal(before.nextGame,opened.game);
 assert.notEqual(dailyGameUrl(before.date),dailyGameUrl(opened.date));
});
test('daily countdown works across UTC dates, nine game rotation, and daylight saving changes',()=>{
 for(const date of ['2026-03-29','2026-10-25','2026-10-29','2026-10-30','2026-12-31']){
  const start=Date.parse(date+'T00:00:00.000Z');
  const schedule=dailyWindow(start+((14*3600+5*60+6)*1000));
  assert.equal(schedule.date,date);
  assert.equal(schedule.nextAt,nextUtcMidnight(date));
  assert.equal(schedule.remainingSeconds,9*3600+54*60+54);
  assert.equal(schedule.game,dailyGameForDate(date));
  assert.equal(schedule.nextGame,dailyGameForDate(schedule.nextDate));
  assert.equal(DAILY_GAME_TITLES[schedule.game].length>0,true);
  assert.equal(DAILY_GAME_TITLES[schedule.nextGame].length>0,true);
 }
 assert.equal(Object.keys(DAILY_GAME_TITLES).length,DAILY_GAME_ORDER.length);
 assert.throws(()=>dailyWindow(NaN));
});
test('live UTC countdown has public no-store server clock and every daily setup shows compact timer',()=>{
 const api=read('app/api/games/clock/route.js');
 const component=read('components/games/DailyCountdown.jsx');
 const styles=read('components/games/DailyCountdown.module.css');
 const hub=read('app/games/page.jsx');
 const notice=read('components/games/useDailyAttempt.js');
 assert.ok(api.includes('serverNow:new Date(now).toISOString()'));
 assert.ok(api.includes("'Cache-Control':'private, no-store, max-age=0'"));
 assert.ok(component.includes("fetch('/api/games/clock',{cache:'no-store'})"));
 assert.ok(component.includes('setInterval(tick,1000)'));
 assert.ok(component.includes('visibilitychange'));
 assert.ok(component.includes("window.addEventListener('focus'"));
 assert.ok(component.includes('dailyWindow(now)'));
 assert.ok(component.includes('dailyGameUrl(currentDate)'));
 assert.ok(component.includes('dateTime={nextAt}'));
 assert.ok(component.includes('role="timer"'));
 assert.ok(hub.includes('<DailyCountdown initialDate={date}/>'));
 assert.ok(styles.includes('@media(max-width:520px)'));
 assert.ok(notice.includes('const countdown=<DailyCountdown initialDate={date} variant="compact"/>'));
 for(const path of ['components/games/QuizGame.jsx','components/games/ArcadeChallenge.jsx','components/games/ExtraArcadeChallenge.jsx']){
  assert.ok(read(path).includes('<DailyAttemptNotice daily={daily} mode={mode} date={date}/>'),path);
 }
});
