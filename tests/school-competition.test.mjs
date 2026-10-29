import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {schoolAchievementSummary,longestLearningStreak} from '../lib/schoolAchievements.js';
import {leaderboardWindow,normalizeLeaderboardNickname,SCHOOL_LEADERBOARD_PERIODS} from '../lib/schoolLeaderboard.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const credit=(course_slug,stage_index,xp_amount=100)=>({course_slug,stage_index,xp_amount});
const visit=day=>({course_slug:'musnad',stage_index:0,status:'failed',submitted_at:day+'T13:00:00Z'});

test('badges are derived from verified XP and never from repeat attempts or staff previews',()=>{
 const zero=schoolAchievementSummary([],[]);
 assert.equal(zero.earned,0);
 assert.equal(zero.total,11);
 const credits=[
  credit('musnad',0),credit('musnad',0),credit('arud',0),
  credit('other',0),credit('musnad',2,999)
 ];
 const a=schoolAchievementSummary(credits,[]);
 assert.equal(a.earned,2);
 assert.equal(a.badges.find(x=>x.id==='first-step').earned,true);
 assert.equal(a.badges.find(x=>x.id==='both-courses').earned,true);
 assert.equal(a.badges.find(x=>x.id==='three-stations').earned,false);
 const all=[...Array.from({length:12},(_,i)=>credit('musnad',i)),...Array.from({length:12},(_,i)=>credit('arud',i))];
 const max=schoolAchievementSummary(all,[]);
 assert.equal(max.badges.find(x=>x.id==='musnad-master').earned,true);
 assert.equal(max.badges.find(x=>x.id==='arud-master').earned,true);
 assert.equal(max.badges.filter(x=>x.earned).length,9);
});
test('learning streak badges are permanent from graded historical days, never mere page visits',()=>{
 const days=['2026-10-01','2026-10-02','2026-10-03','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12'].map(visit);
 assert.equal(longestLearningStreak(days),7);
 const achievement=schoolAchievementSummary([],days);
 assert.equal(achievement.badges.find(b=>b.id==='seven-days').earned,true);
 assert.equal(achievement.badges.find(b=>b.id==='three-days').earned,true);
 assert.equal(longestLearningStreak([...days,{...visit('2026-10-13'),status:'active'}]),7);
 assert.equal(longestLearningStreak([visit('2026-10-01'),visit('2026-10-01')]),1);
 assert.equal(schoolAchievementSummary([],[]).badges.find(b=>b.id==='three-days').earned,false);
});
test('weekly leaderboard resets on UTC Monday and monthly on first UTC calendar day',()=>{
 assert.deepEqual(SCHOOL_LEADERBOARD_PERIODS,['week','month']);
 const w=leaderboardWindow('week','2026-10-29T23:00:00Z');
 assert.equal(w.start,'2026-10-26T00:00:00.000Z');
 assert.equal(w.end,'2026-11-02T00:00:00.000Z');
 const m=leaderboardWindow('month','2026-10-29T23:00:00Z');
 assert.equal(m.start,'2026-10-01T00:00:00.000Z');
 assert.equal(m.end,'2026-11-01T00:00:00.000Z');
 assert.equal(leaderboardWindow('week','2027-01-01T00:00:00Z').start,'2026-12-28T00:00:00.000Z');
 assert.equal(leaderboardWindow('month','2028-02-10T12:00:00Z').end,'2028-03-01T00:00:00.000Z');
 assert.throws(()=>leaderboardWindow('all'));
});
test('chosen leaderboard nicknames support Arabic but reject unsafe or identifying notation',()=>{
 assert.equal(normalizeLeaderboardNickname('  متعلم 967   '),'متعلم 967');
 assert.equal(normalizeLeaderboardNickname('  Reader_25  '),'Reader_25');
 for(const bad of ['', 'a', 'x'.repeat(25), 'a@example.com', '<script>', '👑Winner', 'test\u202Etxt', '\n'])assert.throws(()=>normalizeLeaderboardNickname(bad),bad);
});
test('database leaderboard is strict opt-in, service-only and only first-pass verified XP',()=>{
 const migration=read('supabase/migrations/20261029190255_school_967_optional_leaderboard.sql');
 assert.ok(migration.includes('opted_in boolean not null default false'));
 assert.ok(migration.includes('school_leaderboard_nickname_unique'));
 assert.ok(migration.includes('where opted_in'));
 assert.ok(migration.includes('alter table public.school_leaderboard_preferences enable row level security'));
 assert.ok(migration.includes('revoke all on table public.school_leaderboard_preferences from public,anon,authenticated,service_role'));
 assert.ok(migration.includes('grant select,insert,update on table public.school_leaderboard_preferences to service_role'));
 assert.ok(migration.includes('language sql stable security invoker'));
 assert.ok(migration.includes('p.opted_in=true and x.earned_at>=b.beginning'));
 assert.ok(migration.includes('join public.school_xp_events x on x.user_id=p.user_id'));
 assert.ok(migration.includes('dense_rank() over(order by points desc)'));
 assert.ok(migration.includes('limit 50'));
 assert.ok(migration.includes('revoke all on function public.school_leaderboard_top(text) from public,anon,authenticated,service_role'));
 assert.ok(migration.includes('grant execute on function public.school_leaderboard_top(text) to service_role'));
 assert.ok(!migration.includes('security definer'));
});
test('server authenticates, verifies owner, validates nickname and hides account identifiers',()=>{
 const server=read('lib/schoolLeaderboardServer.js'),api=read('app/api/school/leaderboard/route.js');
 const client=read('components/school/SchoolCompetition.jsx'),dashboard=read('lib/schoolDashboardServer.js');
 assert.ok(server.includes(".eq('user_id',user.id)"));
 assert.ok(server.includes("db.rpc('school_leaderboard_top',{p_period:period})"));
 assert.ok(server.includes('normalizeLeaderboardNickname(body.nickname)'));
 assert.ok(server.includes("error?.code==='23505'"));
 assert.ok(server.includes('user_id:user.id,opted_in:body.optedIn'));
 assert.ok(server.includes("entries:(ranking||[]).map(row=>({rank:Number(row.place),nickname:row.nickname,xp:Number(row.points),stages:Number(row.stages)}))"));
 assert.ok(api.includes('schoolUser(request,db)'));
 assert.ok(api.includes('isSameOrigin(request)'));
 assert.ok(api.includes('private, no-store'));
 assert.ok(api.includes('readJsonObject(request,800)'));
 assert.ok(client.includes("optedIn?nickname:undefined"));
 assert.ok(client.includes('لا نعرض البريد الإلكتروني أو رقم الحساب'));
 assert.ok(dashboard.includes('schoolAchievementSummary(credits,records)'));
 assert.ok(!client.includes('entry.user_id')&&!client.includes('entry.email'));
});
