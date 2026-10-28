import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateGameAchievements,GAME_ACHIEVEMENTS} from '../lib/gameAchievements.js';
import {DAILY_GAME_ORDER} from '../lib/dailyGame.js';
import {searchPages} from '../lib/searchPages.js';
import {buildSitemap,DEFAULT_SITE_ORIGIN} from '../lib/seo.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const row=(day,game='quiz',correct=6,score=620)=>({
 challenge_date:day,game_type:game,correct_count:correct,score,
 finished_at:day+'T12:00:00.000Z',phase:'finished'
});
const badge=(result,code)=>result.items.find(item=>item.code===code);

test('the 14 badge definitions have stable IDs, clear goals and distinct descriptions',()=>{
 assert.equal(GAME_ACHIEVEMENTS.length,14);
 assert.equal(new Set(GAME_ACHIEVEMENTS.map(x=>x.code)).size,14);
 assert.ok(GAME_ACHIEVEMENTS.every(x=>/^[a-z][a-z0-9_]{1,47}$/.test(x.code)
  &&x.goal>0&&['bronze','silver','gold'].includes(x.tier)
  &&x.title.length>2&&x.description.length>12));
 const empty=calculateGameAchievements([]);
 assert.equal(empty.earned,0);
 assert.equal(empty.total,14);
 assert.ok(empty.items.every(x=>!x.unlocked&&x.progress===0));
});
test('unfinished rounds and client-like invalid scores cannot award achievements',()=>{
 const result=calculateGameAchievements([
  row('2026-11-01','quiz',10,1000),
  {...row('2026-11-02'),phase:'review'},
  {...row('2026-11-03'),score:10000},
  {...row('2026-11-04'),game_type:'not-a-game'}
 ]);
 assert.equal(result.earned,3);
 for(const id of ['first_step','perfect_round','high_score'])assert.equal(badge(result,id).unlocked,true,id);
 assert.equal(badge(result,'explorer').progress,1);
 assert.equal(badge(result,'streak_3').unlocked,false);
 assert.equal(badge(result,'first_step').qualifiedAt,'2026-11-01T12:00:00.000Z');
});
test('three- and seven-day streaks depend on consecutive UTC dates and historical max',()=>{
 const three=Array.from({length:3},(_,i)=>row('2026-11-0'+(i+1)));
 assert.equal(badge(calculateGameAchievements(three),'streak_3').unlocked,true);
 assert.equal(badge(calculateGameAchievements([...three,row('2026-11-06')]),'streak_7').progress,3);
 const seven=Array.from({length:7},(_,i)=>row('2026-11-0'+(i+1)));
 const gold=badge(calculateGameAchievements(seven),'streak_7');
 assert.equal(gold.unlocked,true);
 assert.equal(gold.qualifiedAt,'2026-11-07T12:00:00.000Z');
});
test('mastery and diversity badges require completed games of the precise requested type',()=>{
 const nine=DAILY_GAME_ORDER.map((game,i)=>row('2026-12-'+String(i+1).padStart(2,'0'),game,9,850));
 const all=calculateGameAchievements(nine);
 assert.equal(badge(all,'variety_9').unlocked,true);
 assert.equal(badge(all,'variety_5').unlocked,true);
 assert.equal(badge(all,'accuracy_5').unlocked,true);
 assert.equal(badge(all,'high_score').unlocked,false);
 assert.equal(badge(all,'cartographer').progress,1);
 const maps=[row('2027-01-01','map'),row('2027-01-10','map'),row('2027-01-19','map')];
 assert.equal(badge(calculateGameAchievements(maps),'cartographer').unlocked,true);
 assert.equal(badge(calculateGameAchievements(maps),'historian').unlocked,false);
});
test('achievements sort historical attempts before determining original award timestamps',()=>{
 const original=[row('2026-11-01'),row('2026-11-02'),row('2026-11-03')];
 assert.deepEqual(calculateGameAchievements(original),calculateGameAchievements([...original].reverse()));
 assert.equal(badge(calculateGameAchievements(original),'first_step').qualifiedAt,'2026-11-01T12:00:00.000Z');
});
test('achievement reconciliation uses verified server rows, never client-posted scores',()=>{
 const api=read('app/api/games/achievements/route.js');
 const repo=read('lib/gameAchievementRepository.js');
 const round=read('app/api/games/daily/round/route.js');
 assert.ok(api.includes('db.auth.getUser(token)'));
 assert.ok(api.includes('syncPlayerAchievements(db,data.user.id)'));
 assert.ok(!api.includes('request.json()'));
 assert.ok(repo.includes("import 'server-only'"));
 assert.ok(repo.includes(".eq('user_id',userId).eq('phase','finished')"));
 assert.ok(repo.includes("onConflict:'user_id,code',ignoreDuplicates:true"));
 assert.ok(repo.includes("from('game_player_achievements')"));
 assert.ok(round.includes('await syncPlayerAchievements(db,user.id)'));
 assert.ok(!repo.includes('localStorage'));
});
test('achievement database grants self-only SELECT with no public INSERT or UPDATE',()=>{
 const sql=read('supabase/migrations/20261028225742_games_player_achievements.sql');
 assert.ok(sql.includes('references auth.users(id) on delete cascade'));
 assert.ok(sql.includes('primary key (user_id,code)'));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('revoke all on table public.game_player_achievements from anon,authenticated'));
 assert.ok(sql.includes('grant select on table public.game_player_achievements to authenticated'));
 assert.ok(sql.includes('to authenticated using ((select auth.uid())=user_id)'));
 assert.ok(!sql.includes('grant insert'));
 assert.ok(!sql.includes('grant update'));
});
test('achievement gallery is linked from games and uses accessible progress and mobile styling',()=>{
 const page=read('app/games/achievements/page.jsx');
 const hub=read('app/games/page.jsx');
 const overview=read('components/games/GamesHomeStatus.jsx');
 const gallery=read('components/games/GameAchievementGallery.jsx');
 const css=read('components/games/GameAchievementGallery.module.css');
 assert.ok(page.includes('<GameAchievementGallery/>'));
 assert.ok(hub.includes('<GameAchievementGallery preview/>'));
 assert.ok(overview.includes('href="/games/achievements"'));
 assert.ok(gallery.includes("fetch('/api/games/achievements'"));
 assert.ok(gallery.includes('aria-pressed={filter===id}'));
 assert.ok(gallery.includes('aria-valuenow={progress}'));
 assert.ok(css.includes('@media(max-width:630px)'));
 assert.ok(searchPages.some(x=>x.href==='/games/achievements'));
 assert.ok(buildSitemap({},{VERCEL_ENV:'production'}).some(x=>x.url===DEFAULT_SITE_ORIGIN+'/games/achievements'));
});
