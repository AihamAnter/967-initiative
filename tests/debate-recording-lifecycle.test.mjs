import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';
import {currentPollPhase,pollOpen,questionsAvailable,QUESTIONS_AFTER_RECORDING_MESSAGE} from '../lib/debates.js';
const migration=file=>readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
const instant='202610220001_debates_instant_discussion.sql',lifecycle='202610220002_debate_recording_lifecycle.sql';

test('recording lifecycle: real PostgreSQL guards, API errors, preserved participation and live privacy',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await migration(instant));await db.pg.exec(await migration(lifecycle));
 const f=await seedDebateFixtures(db),[A,,M,U,N,V]=inlineTestUsers;
 const ok=result=>{assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
 const rpc=(user,name,args={})=>db.client(user).rpc(name,args);
 const api=async(user,body,query='',account=false)=>{const r=await handleDebateRequest(new Request('http://localhost/api/'+(account?'account':'debates')+query,{method:body?'POST':'GET',headers:{...(user?{Authorization:'Bearer '+user}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),db.createDb,{account});return {status:r.status,data:await r.json()};};
 const totals=async id=>ok(await rpc(null,'debate_live_results',{p_debate:id}));
 const state=async id=>ok(await rpc(null,'debate_participation_state',{p_debate:id}));
 const vote=(user,d,p,option=0,watched=true)=>api(user,{action:'vote',id:p.id,data:{debate_id:d.id,option_id:d.options[option].id,watched_confirmed:watched}});
 const question=(id,extra={})=>api(U.id,{action:'question',data:{debate_id:id,body:'سؤال موجه قبل نشر التسجيل للحفاظ على تاريخ المشاركة',...extra}});
 const saveM=async(id,data)=>ok(await rpc(M.id,'debate_admin_mutate',{p_action:'save',p_id:id,p_revision:(await f.get(id)).revision,p_data:data}));
 const count=async table=>(await db.pg.query('select count(*)::int n from public.'+table+' where debate_id=$1',[f.recorded])).rows[0].n;
 const version=async()=>(await db.pg.query('select version from public.debate_result_updates where debate_id=$1',[f.recorded])).rows[0].version;
 t.beforeEach(()=>db.pg.exec('delete from public.debate_rate_limits'));
 let oldQuestion,legacyQuestion,firstPublication;
 await f.update(f.live,{publication_status:'published',live_url:'https://www.youtube.com/watch?v=abcdefghijk'});
 await f.update(f.recorded,{publication_status:'published'});

 await t.test('announced, live and ended external broadcasts keep questions and before-voting open until a recording is public',async()=>{
  for(const stage of ['announced','live','ended']){
   await f.update(f.live,{stage});assert.equal((await f.get(f.live)).recording_first_published_at,null);
   const result=await question(f.live);assert.equal(result.status,200,JSON.stringify(result));
   assert.equal(currentPollPhase(await state(f.live)),'before');assert.equal((await totals(f.live)).results.after,undefined);
  }
  const d=await f.full(f.recorded),participant=d.participants[1];assert.ok(d.recording_url);assert.equal(d.recording_published,false);
  const response=await question(d.id,{participant_id:participant.id,axis:d.axes[0],anonymous:true});assert.equal(response.status,200);oldQuestion=response.data.id;
  const saved=(await db.pg.query('select * from public.debate_questions where id=$1',[oldQuestion])).rows[0];assert.equal(saved.participant_id,participant.id);assert.equal(saved.axis,d.axes[0]);assert.equal(saved.anonymous,true);assert.equal(saved.status,'approved');
  legacyQuestion=(await db.pg.query("insert into public.debate_questions(debate_id,user_id,body,status) values($1,$2,'سؤال قديم لا يزال معلقاً للمراجعة','new') returning id",[d.id,U.id])).rows[0].id;
 });
 await t.test('before voting respects enablement, clocks and closure; after voting is rejected before publication',async()=>{
  let d=await f.full(f.recorded),before=d.polls.find(p=>p.phase==='before'),after=d.polls.find(p=>p.phase==='after');
  assert.equal((await vote(U.id,d,after)).status,409);
  for(const patch of [{enabled:false},{is_closed:true},{opens_at:new Date(Date.now()+60000).toISOString()},{closes_at:new Date(Date.now()-60000).toISOString()}]){
   await f.update(d.id,{polls:[{...before,...patch}]});assert.equal((await vote(U.id,d,before)).status,400);
   await f.update(d.id,{polls:[before]});
  }
  assert.equal((await vote(U.id,d,before,0)).status,200);assert.equal((await vote(V.id,d,before,1)).status,200);
  assert.equal((await vote(U.id,d,before,0)).status,200);assert.equal(await count('debate_votes'),2);
  const direct=await rpc(U.id,'debate_audience_mutate',{p_action:'vote',p_id:after.id,p_data:{debate_id:d.id,option_id:d.options[0].id,watched_confirmed:true}});assert.equal(direct.error.code,'P0VPH');
  const results=await totals(d.id);assert.equal(results.results.before.participants,2);assert.equal(results.results.after,undefined);assert.equal(results.results.paired,undefined);
 });
 await t.test('publication closes only new questions, locks before voting and switches current state atomically',async()=>{
  const oldVersion=await version(),questionsBefore=await count('debate_questions');
  await f.update(f.recorded,{recording_published:true,stage:'recording_available'});firstPublication=(await f.get(f.recorded)).recording_first_published_at;assert.ok(firstPublication);assert.ok(await version()>oldVersion);
  const denied=await question(f.recorded);assert.equal(denied.status,409);assert.equal(denied.data.code,'questions_closed_after_recording');assert.equal(denied.data.error,QUESTIONS_AFTER_RECORDING_MESSAGE);assert.equal(await count('debate_questions'),questionsBefore);
  assert.equal((await rpc(U.id,'debate_audience_mutate',{p_action:'question',p_data:{debate_id:f.recorded,body:'طلب مباشر يجب رفضه بعد نشر الفيديو'}})).error.code,'P0QCL');
  const d=await f.full(f.recorded),before=d.polls.find(p=>p.phase==='before'),after=d.polls.find(p=>p.phase==='after');
  const staleVote=await vote(U.id,d,before,1);assert.equal(staleVote.status,409);assert.equal(staleVote.data.code,'poll_phase_changed');assert.equal(await count('debate_votes'),2);
  assert.equal((await vote(U.id,d,after,1,false)).status,400);assert.equal((await vote(U.id,d,after,1,true)).status,200);assert.equal((await vote(V.id,d,after,1,true)).status,200);
  assert.equal(currentPollPhase(await state(d.id)),'after');assert.equal(questionsAvailable(await state(d.id)),false);
  const publicQuestions=ok(await rpc(null,'debate_discussion',{p_debate:d.id,p_kind:'questions'}));assert.ok(publicQuestions.items.some(item=>item.id===oldQuestion));assert.equal(publicQuestions.items.find(item=>item.id===oldQuestion).display_name,'مشارك');
  const item=ok(await rpc(A.id,'inline_editor_read',{p_view:'item',p_kind:'questions',p_id:legacyQuestion})).item;
  ok(await rpc(A.id,'debate_admin_mutate',{p_action:'moderate',p_id:legacyQuestion,p_data:{kind:'questions',status:'approved',updated_at:item.updated_at,reason:'مراجعة سؤال قديم بعد نشر التسجيل'}}));
  assert.equal((await api(U.id,{action:'comment',data:{debate_id:d.id,body:'يمكن مناقشة محتوى التسجيل في تعليق بعد نشره'}})).status,200);
 });
 await t.test('live totals, individual paired changes, own vote history and private ballots stay correct',async()=>{
  const data=await totals(f.recorded);assert.deepEqual(data.results.before.options.map(option=>option.percent),[50,50]);assert.deepEqual(data.results.after.options.map(option=>option.percent),[0,100]);assert.equal(data.results.paired.participants,2);assert.equal(data.results.paired.changed_percent,50);
  assert.ok(!JSON.stringify(data).includes(U.id));assert.ok(!JSON.stringify(data).includes(V.id));assert.ok(!JSON.stringify(data).includes('user_id'));
  const own=await api(U.id,null,'?debate='+f.recorded,true);assert.equal(own.status,200);assert.equal(own.data.debate_votes.items.length,2);
  assert.deepEqual(ok(await db.client(A.id).from('debate_votes').select('*')),[]);
  for(const name of ['debate_audience_mutate_pre_lifecycle','debate_live_results_pre_lifecycle','debate_detail_pre_lifecycle'])assert.ok((await rpc(U.id,name,name==='debate_audience_mutate_pre_lifecycle'?{p_action:'question',p_data:{}}:name==='debate_detail_pre_lifecycle'?{p_slug:'local-prerecorded'}:{p_debate:f.recorded})).error);
 });
 await t.test('management hiding withholds all totals while keeping public phase updates and preserving snapshots',async()=>{
  let d=await f.full(f.recorded);await f.update(d.id,{polls:d.polls.map(p=>({...p,is_closed:true}))});
  ok(await rpc(A.id,'debate_admin_mutate',{p_action:'results_publish',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{phase:'before'}}));
  const savedSnapshot=(await f.get(d.id)).results;
  ok(await rpc(M.id,'debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible:false,reason:'حجب النتائج بقرار الإدارة'}}));
  const hidden=await totals(d.id);assert.deepEqual(hidden.results,{});assert.equal(hidden.results_visible,false);assert.equal(hidden.participation.recording_published,true);assert.deepEqual(ok(await rpc(null,'debate_detail',{p_slug:d.slug})).results,{});
  const oldVersion=await version();await f.update(d.id,{questions_open:false});assert.ok(await version()>oldVersion);assert.equal((await totals(d.id)).participation.questions_open,false);
  ok(await rpc(M.id,'debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible:true,reason:'إعادة عرض النتائج'}}));
  assert.deepEqual((await f.get(d.id)).results,savedSnapshot);assert.equal((await totals(d.id)).results.before.participants,2);
 });
 await t.test('withdrawing the recording cannot reopen questions or either voting phase; republishing keeps lifecycle history',async()=>{
  const votesBefore=await count('debate_votes');await saveM(f.recorded,{recording_published:false,stage:'announced',questions_open:true,reason:'سحب التسجيل مع الحفاظ على دورة المشاركة'});
  let d=await f.full(f.recorded);assert.deepEqual(d.recording_first_published_at,firstPublication);assert.equal((await question(d.id)).status,409);
  for(const p of d.polls)assert.equal((await vote(U.id,d,p,0)).status,409);
  await db.pg.query('update public.debates set recording_first_published_at=null where id=$1',[d.id]);assert.deepEqual((await f.get(d.id)).recording_first_published_at,firstPublication);
  await f.update(d.id,{recording_published:true,stage:'recording_available'});d=await f.full(d.id);assert.deepEqual(d.recording_first_published_at,firstPublication);assert.equal(await count('debate_votes'),votesBefore);
  await f.update(d.id,{publication_status:'archived'});assert.notEqual((await vote(U.id,d,d.polls.find(p=>p.phase==='after'))).status,200);assert.equal((await question(d.id)).status,409);
  await f.update(d.id,{publication_status:'hidden'});assert.equal(await totals(d.id),null);assert.equal((await question(d.id)).status,403);
 });
});

test('migration recovers prior public recording withdrawals from audit without treating an ended broadcast as video publication',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await migration(instant));const f=await seedDebateFixtures(db),[,,M]=inlineTestUsers;
 await f.update(f.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});
 const current=await f.get(f.recorded);assert.equal((await db.client(M.id).rpc('debate_admin_mutate',{p_action:'save',p_id:current.id,p_revision:current.revision,p_data:{recording_published:false,stage:'announced',reason:'سحب سابق للترقية'}})).error,null);
 await f.update(f.live,{publication_status:'published',live_url:'https://www.youtube.com/watch?v=abcdefghijk',stage:'live'});await f.update(f.live,{stage:'ended',recording_url:'https://www.youtube.com/watch?v=abcdefghijk'});
 const legacy=await f.rpc('save',null,{...f.draftData('external_live'),slug:'legacy-media-proof',publication_status:'published',stage:'ended',recording_url:'https://www.youtube.com/watch?v=abcdefghijk',recording_published:true});
 await f.rpc('media',legacy.id,{},(await f.get(legacy.id)).revision);
 assert.equal((await db.client(M.id).rpc('debate_admin_mutate',{p_action:'save',p_id:legacy.id,p_revision:(await f.get(legacy.id)).revision,p_data:{recording_published:false,stage:'ended',reason:'سحب قديم مع سجل لا يحتوي نسخ الحقول'}})).error,null);
 // Pre-inline-editor audit rows had only an action and target, no snapshots.
 await db.pg.query('update public.debate_moderation_actions set before_value=null,after_value=null where target_id=$1',[legacy.id]);
 await db.pg.exec(await migration(lifecycle));assert.ok((await f.get(f.recorded)).recording_first_published_at);assert.ok((await f.get(legacy.id)).recording_first_published_at);assert.equal((await f.get(f.live)).recording_first_published_at,null);
});

test('UI availability follows recording publication, historical closure, dates and the current phase only',()=>{
 const d={publication_status:'published',stage:'ended',recording_published:false,recording_url:'https://example.test/video',questions_open:true};
 const before={phase:'before',enabled:true,is_closed:false,opens_at:null,closes_at:null},after={...before,phase:'after'};
 assert.equal(questionsAvailable(d),true);assert.equal(pollOpen(before,d),true);assert.equal(pollOpen(after,d),false);
 const released={...d,recording_published:true};assert.equal(questionsAvailable(released),false);assert.equal(pollOpen(before,released),false);assert.equal(pollOpen(after,released),true);
 const withdrawn={...d,recording_first_published_at:'2026-10-22T12:00:00Z'};assert.equal(questionsAvailable(withdrawn),false);assert.equal(currentPollPhase(withdrawn),'after');assert.equal(pollOpen(after,withdrawn),false);
 for(const patch of [{publication_status:'archived'},{stage:'cancelled'},{questions_open:false}])assert.equal(questionsAvailable({...d,...patch}),false);
 assert.equal(pollOpen({...before,opens_at:'2030-01-01'},d,Date.parse('2026-01-01')),false);assert.equal(pollOpen({...before,closes_at:'2025-01-01'},d,Date.parse('2026-01-01')),false);
});
