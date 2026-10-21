import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDebateTestDatabase,debateTestUsers} from './helpers/debateTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';

test('live debate results: exact aggregates, change notifications and owner-only ballots',async t=>{
 const db=await createDebateTestDatabase();t.after(()=>db.close());const f=await seedDebateFixtures(db),[A,,M,U,,V]=debateTestUsers;
 const ok=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
 const live=()=>db.client(null).rpc('debate_live_results',{p_debate:f.recorded});
 const version=async()=>(await db.pg.query('select version from public.debate_result_updates where debate_id=$1',[f.recorded])).rows[0].version;
 const vote=(user,poll,option)=>db.client(user.id).rpc('debate_audience_mutate',{p_action:'vote',p_id:poll.id,p_data:{debate_id:f.recorded,option_id:option.id,watched_confirmed:true}});
 let d;
 await t.test('public zero totals appear before closing or publishing a snapshot; drafts stay private',async()=>{
  assert.equal(ok(await live()),null);
  await f.update(f.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});d=await f.full(f.recorded);
  const result=ok(await live());assert.equal(result.results.before.participants,0);assert.equal(result.results.after.participants,0);assert.ok(result.results.before.options.every(o=>o.count===0&&o.percent===0));assert.deepEqual(d.results,{});
 });
 await t.test('the first vote and later edits immediately change exact counts without adding extra votes',async()=>{
  const before=d.polls.find(p=>p.phase==='before'),after=d.polls.find(p=>p.phase==='after'),oldVersion=await version();
  ok(await vote(U,before,d.options[0]));let result=ok(await live());assert.equal(result.results.before.participants,1);assert.equal(result.results.before.options[0].count,1);assert.equal(result.results.before.options[0].percent,100);assert.ok(await version()>oldVersion);
  ok(await vote(V,before,d.options[1]));result=ok(await live());assert.deepEqual(result.results.before.options.map(o=>o.percent),[50,50]);
  ok(await vote(U,before,d.options[1]));result=ok(await live());assert.equal(result.results.before.participants,2);assert.deepEqual(result.results.before.options.map(o=>o.count),[0,2]);
  ok(await vote(U,after,d.options[0]));result=ok(await live());assert.equal(result.results.paired.participants,1);assert.equal(result.results.paired.changed_percent,100);assert.deepEqual((await f.get(d.id)).results,{});
 });
 await t.test('public notifications contain no ballots and cannot be forged by viewers',async()=>{
  const updates=ok(await db.client(null).from('debate_result_updates').select('*'));assert.equal(updates.length,1);assert.deepEqual(Object.keys(updates[0]).sort(),['debate_id','updated_at','version']);
  for(const user of [A,M,V]){const result=ok(await db.client(user.id).rpc('debate_live_results',{p_debate:d.id}));assert.equal(result.results.before.participants,2);assert.ok(!JSON.stringify(result).includes(U.id));}
  assert.deepEqual(ok(await db.client(A.id).from('debate_votes').select('*')),[]);
  await assert.rejects(db.run(U.id,'update public.debate_result_updates set version=999 where debate_id=$1',[d.id]));
  assert.ok((await db.client(U.id).rpc('debate_touch_results',{p_id:d.id})).error);
 });
 await t.test('management can hide and restore live totals even before a final snapshot exists',async()=>{
  assert.ok((await db.client(A.id).rpc('debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible:false,reason:'اختبار إخفاء النتائج'}})).error);
  const visibility=async visible=>db.client(M.id).rpc('debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible,reason:'اختبار ظهور النتائج'}});
  ok(await visibility(false));assert.equal(ok(await live()),null);assert.equal((await f.get(d.id)).live_results_enabled,false);assert.equal(ok(await db.client(null).from('debate_result_updates').select('*')).length,1);
  const hiddenVersion=await version();ok(await vote(U,d.polls.find(p=>p.phase==='before'),d.options[0]));assert.equal(await version(),hiddenVersion);
  ok(await visibility(true));assert.equal(ok(await live()).results.before.participants,2);
 });
 await t.test('vote deletion and disabling a phase update totals without exposing disabled data',async()=>{
  const previous=await version();await db.pg.query('delete from public.debate_votes where user_id=$1 and debate_id=$2',[U.id,d.id]);const result=ok(await live());assert.equal(result.results.before.participants,1);assert.equal(result.results.after.participants,0);assert.ok(!result.results.paired);assert.ok(await version()>previous);
  await f.update(d.id,{polls:d.polls.map(p=>({...p,enabled:p.phase==='before'}))});assert.ok(!ok(await live()).results.after);
 });
 await t.test('the public results API is uncached, validates IDs and withholds unpublished debates',async()=>{
  const get=async id=>handleDebateRequest(new Request('http://localhost/api/debates?results=1&debate='+id),db.createDb);
  let response=await get(d.id);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).results.before.participants,1);
  assert.equal((await get('invalid')).status,400);await f.update(d.id,{publication_status:'hidden'});response=await get(d.id);assert.equal(await response.json(),null);
 });
 await t.test('saving a final snapshot cannot undo management hiding the live results',async()=>{
  const archived=await f.rpc('save',null,{...f.draftData('prerecorded'),slug:'hidden-archive-test',publication_status:'published',polls:['before','after'].map(phase=>({phase,enabled:true,is_closed:true}))});
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'results_visibility',p_id:archived.id,p_revision:(await f.get(archived.id)).revision,p_data:{visible:false,reason:'اختبار إبقاء النتائج مخفية'}}));
  await f.rpc('results_publish',archived.id,{phase:'before'},(await f.get(archived.id)).revision);
  const saved=await f.get(archived.id);assert.equal(saved.results_published,false);assert.equal(saved.live_results_enabled,false);assert.ok(saved.results.before);
  assert.equal(ok(await db.client(null).rpc('debate_live_results',{p_debate:archived.id})),null);
 });
 await t.test('the migration can be reapplied and preserves previously hidden final results',async()=>{
  await db.pg.query('update public.debates set results=$2::jsonb,results_published=false where id=$1',[d.id,JSON.stringify({before:{suppressed:true}})]);
  await db.pg.exec(await readFile(new URL('../supabase/migrations/202610200003_debates_live_results.sql',import.meta.url),'utf8'));
  assert.equal((await f.get(d.id)).live_results_enabled,false);
  const tables=(await db.pg.query("select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'")).rows.map(r=>r.tablename);
  assert.ok(tables.includes('debate_result_updates'));assert.ok(!tables.includes('debate_votes'));
 });
});
