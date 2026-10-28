import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {officialGameWeek,getWeeklyGameMissions,calculateWeeklyGameMissions,publicWeeklyGameMissions} from '../lib/gameWeeklyMissions.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const row=(date,{type='quiz',correct=8,score=800,phase='finished'}={})=>({
 challenge_date:date,game_type:type,correct_count:correct,score,phase
});

test('weekly missions follow Monday 00:00 UTC, including DST weekends and exact rollover',()=>{
 const sunday=officialGameWeek(new Date('2026-10-25T23:59:59.999Z'));
 assert.equal(sunday.start,'2026-10-19');
 assert.equal(sunday.end,'2026-10-26');
 const monday=officialGameWeek(new Date('2026-10-26T00:00:00.000Z'));
 assert.equal(monday.start,'2026-10-26');
 assert.equal(monday.end,'2026-11-02');
 assert.equal(monday.resetsAt,'2026-11-02T00:00:00.000Z');
 assert.equal(officialGameWeek('2026-10-29T23:00:00.000Z').start,'2026-10-26');
 assert.equal(officialGameWeek('2026-03-29T23:00:00.000Z').end,'2026-03-30');
 assert.equal(officialGameWeek('2026-03-30T00:00:00.000Z').start,'2026-03-30');
});

test('three rotating mission plans change every Monday and repeat consistently every three weeks',()=>{
 const a=officialGameWeek('2026-10-27T11:00:00Z');
 const b=officialGameWeek('2026-11-03T11:00:00Z');
 const c=officialGameWeek('2026-11-10T11:00:00Z');
 const d=officialGameWeek('2026-11-17T11:00:00Z');
 assert.notDeepEqual(getWeeklyGameMissions(a).map(x=>x.id),getWeeklyGameMissions(b).map(x=>x.id));
 assert.notDeepEqual(getWeeklyGameMissions(b).map(x=>x.id),getWeeklyGameMissions(c).map(x=>x.id));
 assert.deepEqual(getWeeklyGameMissions(a),getWeeklyGameMissions(d));
 for(const week of [a,b,c,d]){
  const missions=getWeeklyGameMissions(week);
  assert.equal(missions.length,3);
  assert.equal(new Set(missions.map(m=>m.id)).size,3);
  assert.ok(missions.every(m=>m.goal>0&&m.title.length>4&&m.description.length>12));
 }
});

test('only completed verified scores from the selected UTC week contribute',()=>{
 const week=officialGameWeek('2026-10-29T00:00:00Z');
 const attempts=[
  row('2026-10-26',{type:'quiz',correct:9}),
  row('2026-10-27',{type:'map',correct:7}),
  row('2026-10-25',{type:'place',correct:10}), // previous week
  row('2026-11-02',{type:'who',correct:10}),   // next week
  row('2026-10-28',{type:'bigger',phase:'review',correct:10}),
  row('2026-10-29',{type:'object',score:99999}),
  row('2026-10-30',{type:'invalid'})
 ];
 const result=calculateWeeklyGameMissions(attempts,week);
 assert.deepEqual(result.missions.map(m=>m.progress),[2,12,2]);
 assert.equal(result.completed,3);
 assert.equal(result.total,3);
 assert.equal(result.verifiedRounds,2);
 assert.equal(result.weekStart,'2026-10-26');
 assert.equal(result.resetsAt,'2026-11-02T00:00:00.000Z');
});

test('duplicate attempts on a date are ignored, and private progress is capped to each goal',()=>{
 const week=officialGameWeek('2026-10-29T00:00:00Z');
 const dup=[row('2026-10-26',{type:'quiz'}),row('2026-10-26',{type:'quiz'}),row('2026-10-27',{type:'map',correct:10})];
 const result=calculateWeeklyGameMissions(dup,week);
 assert.equal(result.verifiedRounds,2);
 assert.equal(result.missions[0].progress,2);
 assert.equal(result.missions[1].progress,12);
 assert.equal(result.missions[2].progress,2);
 assert.equal(result.completed,3);
});

test('alternative weekly programs recognize precise skill thresholds and never raise official XP',()=>{
 const weekB=officialGameWeek('2026-11-03T09:00:00Z');
 const strong=[
  row('2026-11-02',{type:'quiz',correct:7,score:700}),
  row('2026-11-03',{type:'place',correct:6,score:600}),
  row('2026-11-04',{type:'map',correct:8,score:650})
 ];
 const middle=calculateWeeklyGameMissions(strong,weekB);
 assert.deepEqual(middle.missions.map(m=>m.id),['complete-3','accurate-2','variety-3']);
 assert.deepEqual(middle.missions.map(m=>m.completed),[true,true,true]);
 const weekC=officialGameWeek('2026-11-10T09:00:00Z');
 const challengers=[
  row('2026-11-09',{type:'quiz',correct:10,score:760}),
  row('2026-11-10',{type:'place',correct:8,score:680}),
  row('2026-11-11',{type:'timeline',correct:8,score:650}),
  row('2026-11-12',{type:'map',correct:6,score:600})
 ];
 const third=calculateWeeklyGameMissions(challengers,weekC);
 assert.deepEqual(third.missions.map(m=>m.id),['complete-4','correct-24','strong-750']);
 assert.deepEqual(third.missions.map(m=>m.completed),[true,true,true]);
 assert.ok(!Object.hasOwn(third,'score'),'weekly quests must not create leaderboard points');
});

test('guest missions expose descriptions but never fake per-user completion',()=>{
 const publicData=publicWeeklyGameMissions(officialGameWeek('2026-11-03T00:00:00Z'));
 assert.equal(publicData.completed,null);
 assert.equal(publicData.verifiedRounds,null);
 assert.equal(publicData.total,3);
 assert.ok(publicData.missions.every(m=>m.progress===null&&m.completed===null));
});

test('private progress endpoint verifies the auth token and filters own finished results on the server',()=>{
 const route=read('app/api/games/weekly/route.js');
 assert.ok(route.includes('db.auth.getUser(token)'));
 assert.ok(route.includes(".eq('user_id',auth.user.id).eq('phase','finished')"));
 assert.ok(route.includes(".gte('challenge_date',week.start).lt('challenge_date',week.end)"));
 assert.ok(route.includes("'Cache-Control':'private, no-store, max-age=0'"));
 assert.ok(route.includes('publicWeeklyGameMissions'));
 assert.ok(route.includes('calculateWeeklyGameMissions(data,week)'));
 assert.ok(!route.includes('request.json('));
 const selected=route.match(/\.select\('([^']+)'\)/)?.[1]||'';
 assert.ok(selected.includes('correct_count'));
 assert.ok(!selected.includes('question_bank'));
 assert.ok(!selected.includes('answers'));
});

test('Games 967 shows three weekly leaders from the existing official weekly leaderboard',()=>{
 const home=read('app/games/page.jsx');
 const panel=read('components/games/WeeklyArcade.jsx');
 const css=read('components/games/WeeklyArcade.module.css');
 const rankings=read('app/api/games/leaderboard/route.js');
 assert.ok(home.includes('<WeeklyArcade/>'));
 assert.ok(home.indexOf('className={styles.selectGrid}')<home.indexOf('<WeeklyArcade/>'));
 assert.ok(home.indexOf('<WeeklyArcade/>')<home.indexOf('<GameAchievementGallery preview/>'));
 assert.ok(panel.includes("fetch('/api/games/leaderboard?period=weekly'"));
 assert.ok(panel.includes("fetch('/api/games/weekly'"));
 assert.ok(panel.includes('data?.top?.slice(0,3)'));
 assert.ok(panel.includes("auth.onAuthStateChange"));
 assert.ok(panel.includes('setInterval(checkWeek,30_000)'));
 assert.ok(panel.includes('aria-valuenow={hasProgress?progress:undefined}'));
 assert.ok(css.includes('@media(max-width:630px)'));
 assert.ok(rankings.includes("const periods=new Set(['daily','weekly','monthly','all'])"));
 assert.ok(rankings.includes(".eq('phase','finished')"));
});
