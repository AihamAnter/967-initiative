import test from 'node:test';
import assert from 'node:assert/strict';
import {createDebateTestDatabase,debateTestUsers} from './helpers/debateTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';
import {debateSaveData} from '../lib/debateEditor.js';

test('published debate axes and hidden debate restoration use existing permissions and revision checks',async t=>{
 // Deliberately use the original debate migrations, without the inline SQL:
 // changing axes must not resend unchanged vote options or require new SQL.
 const db=await createDebateTestDatabase();t.after(()=>db.close());
 const f=await seedDebateFixtures(db),[admin,,management,member]=debateTestUsers;
 const ok=result=>{assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
 const save=async(user,form,previous=null)=>{
  const baseline=previous||await f.full(form.id);
  const response=await handleDebateRequest(new Request('http://localhost/api/admin/debates',{method:'POST',headers:{authorization:'Bearer '+user,'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:form.id,revision:baseline.revision,data:debateSaveData(form,'تحديث تحريري موثق',baseline)})}),db.createDb,{admin:true});
  return {status:response.status,data:await response.json()};
 };
 const publicDetail=async()=>ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'}));
 await f.update(f.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});
 const original=await f.full(f.recorded),before=original.polls.find(poll=>poll.phase==='before');
 const question=ok(await db.client(member.id).rpc('debate_audience_mutate',{p_action:'question',p_data:{debate_id:f.recorded,body:'هل يبقى سؤالي مرتبطاً بمحوره السابق بعد تغيير المحاور؟',axis:original.axes[0],participant_id:original.participants[0].id}}));
 ok(await db.client(member.id).rpc('debate_audience_mutate',{p_action:'vote',p_id:before.id,p_data:{debate_id:f.recorded,option_id:original.options[0].id}}));
 const votes=async()=>(await db.pg.query('select * from public.debate_votes where debate_id=$1',[f.recorded])).rows;
 const previousVotes=await votes();

 await t.test('Admin can replace, add and remove published axes after voting, preserving questions, polls, options and votes',async()=>{
  const current=await f.full(f.recorded),axes=['محور جديد بعد النشر','محور مضاف للمناقشة'];
  assert.equal((await save(admin.id,{...current,axes})).status,200);
  assert.deepEqual((await publicDetail()).axes,axes);
  const updated=await f.full(f.recorded);
  assert.deepEqual(updated.polls,current.polls);assert.deepEqual(updated.options,current.options);assert.deepEqual(updated.participants,current.participants);assert.deepEqual(await votes(),previousVotes);
  const savedQuestion=(await db.pg.query('select * from public.debate_questions where id=$1',[question.id])).rows[0];
  assert.equal(savedQuestion.axis,original.axes[0]);assert.equal(savedQuestion.participant_id,original.participants[0].id);
  assert.equal((await save(admin.id,{...current,axes:['محور من نسخة قديمة']},current)).status,409);
  const latest=await f.full(f.recorded);
  assert.equal((await save(management.id,{...latest,axes:[]})).status,200);
  assert.deepEqual((await publicDetail()).axes,[]);
  assert.equal((await save(member.id,{...await f.full(f.recorded),axes:['محاولة مستخدم عادي']})).status,403);
 });

 await t.test('hidden debates can be republished with the latest revision without changing votes; invalid publication remains blocked',async()=>{
  let current=await f.full(f.recorded);
  assert.equal((await save(admin.id,{...current,publication_status:'hidden'})).status,200);
  assert.equal(await publicDetail(),null);
  const hidden=await f.full(f.recorded);
  assert.equal((await save(member.id,{...hidden,publication_status:'published'})).status,403);
  assert.equal((await save(admin.id,{...hidden,publication_status:'published'},current)).status,409);
  assert.equal((await save(admin.id,{...hidden,publication_status:'published'})).status,200);
  assert.equal((await publicDetail()).id,f.recorded);assert.deepEqual(await votes(),previousVotes);
  current=await f.full(f.recorded);
  assert.equal((await save(admin.id,{...current,publication_status:'hidden'})).status,200);
  await db.pg.query('update public.debate_speakers set is_published=false where id=any($1::uuid[])',[f.speakers.slice(0,2)]);
  current=await f.full(f.recorded);
  assert.equal((await save(admin.id,{...current,publication_status:'published'})).status,400);
  assert.equal(await publicDetail(),null);
 });
});
