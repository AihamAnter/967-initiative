import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {dailySeed,buildQuizRound} from '../lib/gameEngine.js';
import {quizStarter} from '../lib/gameQuestions.js';
import {buildPlaceChallenges,buildTimelineChallenges,buildMapChallenges} from '../lib/arcadeChallenges.js';
import {extraGameBuilders} from '../lib/extraGames.js';
import {officialQuestionSnapshot} from '../lib/dailyVerifiedScore.js';
import {DAILY_GAME_ORDER,dailyGameForDate,utcDay} from '../lib/dailyGame.js';
import {matchingDailyQuestionIds,dailyAttemptDateOpen,dailyPublicQuestionFingerprint} from '../lib/dailyAttemptIntegrity.js';
import {handleDebateRequest} from '../lib/debateApi.js';
import {requireEligibleGameProfile} from '../lib/gamePlayerEligibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const builders={place:buildPlaceChallenges,timeline:buildTimelineChallenges,map:buildMapChallenges,...extraGameBuilders};
test('all nine daily games present the exact ordered task IDs verified at claim time',async()=>{
 const dates=['2026-10-28','2026-10-29',...Array.from({length:9},(_,i)=>utcDay(Date.parse('2026-10-30T00:00:00Z')+i*86400000))];
 assert.equal(new Set(dates.slice(2).map(dailyGameForDate)).size,DAILY_GAME_ORDER.length);
 for(const date of dates){
  const game=dailyGameForDate(date);
  const client=game==='quiz'?buildQuizRound(quizStarter,{mode:'daily',seed:dailySeed(date)}):
    builders[game]({mode:'daily',date,seed:dailySeed(date),seen:[]});
  const server=await officialQuestionSnapshot(null,game,date);
  assert.equal(client.length,10,game);
  const signatures=client.map(x=>dailyPublicQuestionFingerprint(game,x));
  assert.equal(matchingDailyQuestionIds(client.map(x=>x.id),server,signatures),true,game+'/'+date);
  assert.equal(matchingDailyQuestionIds(client.slice(1).map(x=>x.id),server,signatures),false);
 }
});
test('mismatched cached, reordered or forged daily tasks cannot be claimed',()=>{
 const rows=Array.from({length:10},(_,i)=>({id:'game-'+i,publicFingerprint:'a'+i}));
 const ids=rows.map(q=>q.id),sigs=rows.map(q=>q.publicFingerprint);
 assert.equal(matchingDailyQuestionIds(ids,rows,sigs),true);
 assert.equal(matchingDailyQuestionIds([...ids.slice(1),ids[0]],rows,sigs),false);
 assert.equal(matchingDailyQuestionIds([...ids.slice(0,9),'changed-editorial-id'],rows,sigs),false);
 assert.equal(matchingDailyQuestionIds([...ids.slice(0,9),ids[0]],rows,sigs),false);
 assert.equal(matchingDailyQuestionIds(ids.slice(0,9),rows,sigs),false);
 assert.equal(matchingDailyQuestionIds(null,rows,sigs),false);
 assert.equal(matchingDailyQuestionIds(ids,rows,[...sigs.slice(0,9),'different']),false);
 const sample=quizStarter[0];
 assert.equal(dailyPublicQuestionFingerprint('quiz',sample),dailyPublicQuestionFingerprint('quiz',{...sample,correct:(sample.correct+1)%4}));
 assert.notEqual(dailyPublicQuestionFingerprint('quiz',sample),dailyPublicQuestionFingerprint('quiz',{...sample,options:[...sample.options].reverse()}));
});
test('the same UTC day is required for official answers and midnight closes earlier challenges',()=>{
 assert.equal(dailyAttemptDateOpen('2026-10-31',new Date('2026-10-31T23:59:59.999Z')),true);
 assert.equal(dailyAttemptDateOpen('2026-10-31',new Date('2026-11-01T00:00:00.000Z')),false);
 assert.equal(dailyAttemptDateOpen('2026-11-01',new Date('2026-11-01T00:00:00.000Z')),true);
 const route=read('app/api/games/daily/route.js');
 const round=read('app/api/games/daily/round/route.js');
 assert.ok(route.indexOf('matchingDailyQuestionIds(body.questionIds,questionBank,body.signatures)')<route.indexOf(".insert({user_id:user.id,challenge_date:date"));
 assert.match(round,/dailyAttemptDateOpen\(body\.date\)/);
 assert.match(round,/user\.banned_until/);
 for(const path of ['components/games/QuizGame.jsx','components/games/ArcadeChallenge.jsx','components/games/ExtraArcadeChallenge.jsx'])
  assert.match(read(path),/daily\.reserve\((list|tasksNow)\)/);
});
test('game result creation respects profile suspension, deletion requests and lookup failures',async()=>{
 const makeDb=(profile,error=null)=>({from:table=>{
  assert.equal(table,'public_profiles');
  return {select:()=>({eq:(column,value)=>({maybeSingle:async()=>{
   assert.equal(column,'user_id');assert.equal(value,'player-1');
   return {data:profile,error};
  }})})};
 }});
 const user={id:'player-1'};
 assert.equal(await requireEligibleGameProfile(makeDb(null),user),true);
 assert.equal(await requireEligibleGameProfile(makeDb({suspended:false,deletion_requested_at:null}),user),true);
 await assert.rejects(requireEligibleGameProfile(makeDb({suspended:true}),user),e=>e.status===403);
 await assert.rejects(requireEligibleGameProfile(makeDb({suspended:false,deletion_requested_at:'2026-10-31'}),user),e=>e.status===403);
 await assert.rejects(requireEligibleGameProfile(makeDb(null,{message:'database unavailable'}),user),e=>e.status===503);
 for(const path of ['app/api/games/daily/route.js','app/api/games/daily/round/route.js','lib/friendChallengeServer.js'])
  assert.match(read(path),/await requireEligibleGameProfile\(db,user\)/);
});
test('the debate API bounds discussion parameters and blocks banned audience submissions',async()=>{
 const calls=[];
 const db={rpc:async(name,args)=>{calls.push({name,args});return {data:{items:[],total:0},error:null};},auth:{
  getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-000000000001',email_confirmed_at:'2026-01-01',banned_until:'2099-01-01'}},error:null})
 }};
 async function get(url){
  const response=await handleDebateRequest(new Request('https://localhost/api/debates'+url),()=>db);
  return {status:response.status,data:await response.json()};
 }
 const base='?discussion=comments&debate=00000000-0000-4000-8000-000000000002';
 assert.equal((await get(base+'&page=999999999')).status,400);
 assert.equal((await get(base+'&page=0')).status,400);
 assert.equal((await get(base+'&order=undefined')).status,400);
 assert.equal(calls.length,0);
 assert.equal((await get(base+'&page=10000&order=oldest')).status,200);
 assert.equal(calls[0].args.p_page,10000);
 assert.equal(calls[0].args.p_order,'oldest');
 const response=await handleDebateRequest(new Request('https://localhost/api/debates',{method:'POST',headers:{Origin:'https://localhost',Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({action:'comment',data:{body:'لن يُنشر هذا النص.'}})}),()=>db);
 assert.equal(response.status,403);
 assert.match((await response.json()).error,/موقوف/);
 assert.equal(calls.length,1);
});
test('public discussion hides personal names and avatars after suspension or deletion request',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec([
  'create role anon nologin',
  'create function public.debate_visible(p_id uuid) returns boolean language sql stable as $$select true$$',
  'create table public.public_profiles(user_id uuid primary key,display_name text,show_avatar boolean,avatar_url text,suspended boolean,deletion_requested_at timestamptz)',
  'create table public.debate_comments(id uuid primary key,debate_id uuid,user_id uuid,body text,status text,parent_id uuid,created_at timestamptz,updated_at timestamptz,pinned_at timestamptz)',
  'create table public.debate_questions(id uuid primary key,debate_id uuid,user_id uuid,body text,axis text,participant_id uuid,anonymous boolean,status text,created_at timestamptz)'
 ].join(';\n')+';');
 const debate='00000000-0000-4000-8000-000000000050';
 const users=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
 for(const [i,user] of users.entries()){
  await pg.query('insert into public.public_profiles(user_id,display_name,show_avatar,avatar_url,suspended,deletion_requested_at) values($1,$2,true,$3,$4,$5)',[user,'اسم خاص '+i,'https://example.org/avatar'+i,i===1,i===2?'2026-10-31':null]);
  await pg.query("insert into public.debate_comments(id,debate_id,user_id,body,status,created_at,updated_at) values($1,$2,$3,'تعليق للاختبار','approved',now(),now())",['00000000-0000-4000-8000-0000000000'+(10+i),debate,user]);
  await pg.query("insert into public.debate_questions(id,debate_id,user_id,body,status,created_at,anonymous) values($1,$2,$3,'سؤال للاختبار','approved',now(),false)",['00000000-0000-4000-8000-0000000000'+(20+i),debate,user]);
 }
 await pg.exec(read('supabase/migrations/20261031070000_debate_discussion_privacy.sql'));
 await pg.exec('grant execute on function public.debate_discussion(uuid,text,integer,text) to anon');
 async function query(kind){
  return pg.transaction(async tx=>{
   await tx.exec('set local role anon');
   const r=await tx.query('select public.debate_discussion($1,$2,1,$3) result',[debate,kind,'newest']);
   return r.rows[0].result.items;
  });
 }
 for(const kind of ['comments','questions']){
  const items=await query(kind);
  assert.equal(items.length,3,kind);
  for(const item of items){
   const id=String(item.id).slice(-2);
   if(id==='10'||id==='20'){assert.equal(item.display_name,'اسم خاص 0');if(kind==='comments')assert.equal(item.avatar_url,'https://example.org/avatar0');}
   else{assert.equal(item.display_name,'مشارك');if(kind==='comments')assert.equal(item.avatar_url,null);}
  }
 }
});
test('direct debate participation RPC rejects actively banned or unconfirmed accounts',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec([
  'create role authenticated nologin',
  'create schema auth',
  'create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz)',
  "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$",
  'create table public.public_profiles(user_id uuid primary key,terms_accepted_at timestamptz,suspended boolean default false,deletion_requested_at timestamptz)',
  'create table public.debate_rate_limits(user_id uuid,action text,window_start timestamptz,hits integer,primary key(user_id,action))',
  'grant usage on schema public,auth to authenticated',
  'grant execute on function auth.uid() to authenticated'
 ].join(';\n')+';');
 const users=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
 for(const [i,user]of users.entries()){
  await pg.query('insert into auth.users(id,email_confirmed_at,banned_until) values($1,$2,$3)',[user,i===2?null:'2026-10-01',i===1?'2099-01-01':null]);
  await pg.query('insert into public.public_profiles(user_id,terms_accepted_at) values($1,now())',[user]);
 }
 await pg.exec(read('supabase/migrations/20261031070001_debate_auth_ban_guard.sql'));
 await pg.exec('grant execute on function public.debate_require_user_base(text) to authenticated');
 async function run(user,action){
  return pg.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);
   await tx.exec('set local role authenticated');
   return (await tx.query('select public.debate_require_user_base($1) result',[action])).rows[0].result;
  });
 }
 assert.equal(await run(users[0],'comment'),users[0]);
 for(const action of ['vote','comment','question','report','suggestion'])
  await assert.rejects(run(users[1],action),/Confirm your email before participating/);
 await assert.rejects(run(users[2],'vote'),/Confirm your email before participating/);
});
