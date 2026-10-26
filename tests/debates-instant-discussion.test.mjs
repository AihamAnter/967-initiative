import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';

test('instant discussion publishes at the database boundary while retaining moderation and account restrictions',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());
 const f=await seedDebateFixtures(db),[admin,,management,member,unconfirmed]=inlineTestUsers;
 await f.update(f.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});
 const ok=result=>{assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
 const rpc=(user,name,args={})=>db.client(user).rpc(name,args);
 const row=async(table,id)=>(await db.pg.query('select * from public.'+table+' where id=$1',[id])).rows[0];
 const discussion=async kind=>ok(await rpc(null,'debate_discussion',{p_debate:f.recorded,p_kind:kind}));
 const api=async(user,action,data={},id=null)=>{
  const response=await handleDebateRequest(new Request('http://localhost/api/debates',{method:'POST',headers:{...(user?{Authorization:'Bearer '+user}:{}),'Content-Type':'application/json'},body:JSON.stringify({action,id,data})}),db.createDb);
  return {status:response.status,data:await response.json()};
 };
 const submit=async(kind,body,extra={})=>{const result=await api(member.id,kind,{debate_id:f.recorded,body,...extra});assert.equal(result.status,200,JSON.stringify(result));return result.data.id;};
 const moderate=async(kind,id,status,version=null)=>{
  const current=await row('debate_'+kind,id);
  return rpc(admin.id,'inline_editor_mutate',{p_action:'moderate',p_kind:kind,p_id:id,p_data:{status,reason:'إجراء إشرافي بعد النشر المباشر',updated_at:version||current.updated_at}});
 };
 const legacy={comments:{},questions:{}};
 for(const status of ['pending','hidden','rejected','deleted'])legacy.comments[status]=(await db.pg.query('insert into public.debate_comments(debate_id,user_id,body,status) values($1,$2,$3,$4) returning id',[f.recorded,member.id,'تعليق قديم لاختبار نقل السياسة '+status,status])).rows[0].id;
 for(const status of ['new','hidden','rejected'])legacy.questions[status]=(await db.pg.query('insert into public.debate_questions(debate_id,user_id,body,status) values($1,$2,$3,$4) returning id',[f.recorded,member.id,'سؤال قديم لاختبار نقل سياسة النشر '+status,status])).rows[0].id;
 await db.pg.exec(await readFile(new URL('../supabase/archive/legacy-migrations/202610220001_debates_instant_discussion.sql',import.meta.url),'utf8'));
 t.beforeEach(()=>db.pg.exec('delete from public.debate_rate_limits'));
 let commentId,questionId;

 await t.test('migration releases waiting comments/questions and preserves explicit moderation decisions',async()=>{
  assert.equal((await row('debate_comments',legacy.comments.pending)).status,'approved');
  assert.equal((await row('debate_questions',legacy.questions.new)).status,'approved');
  for(const status of ['hidden','rejected','deleted'])assert.equal((await row('debate_comments',legacy.comments[status])).status,status);
  for(const status of ['hidden','rejected'])assert.equal((await row('debate_questions',legacy.questions[status])).status,status);
  assert.ok((await discussion('comments')).items.some(item=>item.id===legacy.comments.pending));
  const counts=ok(await rpc(admin.id,'inline_editor_read',{p_view:'counts',p_debate:f.recorded}));assert.equal(counts.comments,0);assert.equal(counts.questions,0);
 });
 await t.test('new comments, replies and directed anonymous questions are immediately readable by guests',async()=>{
  commentId=await submit('comment','تعليق ينشر مباشرة دون انتظار موافقة');
  const reply=await submit('comment','رد يظهر مباشرة على التعليق المنشور',{parent_id:commentId});
  const participant=(await f.full(f.recorded)).participants[0];
  questionId=await submit('question','هل يظهر السؤال المجهول الموجه مباشرة للجميع؟',{anonymous:true,participant_id:participant.id,axis:'دور المؤسسات'});
  assert.equal((await row('debate_comments',commentId)).status,'approved');assert.equal((await row('debate_questions',questionId)).status,'approved');
  const comments=await discussion('comments');assert.ok(comments.items.some(item=>item.id===commentId));assert.equal(comments.items.find(item=>item.id===reply).parent_id,commentId);
  const question=(await discussion('questions')).items.find(item=>item.id===questionId);assert.equal(question.display_name,'مشارك');assert.equal(question.participant_id,participant.id);assert.equal(question.axis,'دور المؤسسات');assert.equal('user_id' in question,false);
  assert.equal((await rpc(member.id,'inline_editor_read',{p_view:'queue'})).error.code,'42501');
 });
 await t.test('published edits stay public and stale moderation cannot overwrite the edited text',async()=>{
  const original=await row('debate_comments',commentId);
  assert.equal((await api(member.id,'comment_edit',{body:'تعديل فوري للنص المنشور دون إعادة انتظار'},commentId)).status,200);
  const publicItem=(await discussion('comments')).items.find(item=>item.id===commentId);assert.equal(publicItem.body,'تعديل فوري للنص المنشور دون إعادة انتظار');assert.equal((await row('debate_comments',commentId)).status,'approved');
  assert.equal((await moderate('comments',commentId,'hidden',original.updated_at)).error.code,'40001');
 });
 await t.test('editors can hide and restore posts; authors cannot reverse hiding or rejection by editing',async()=>{
  ok(await moderate('comments',commentId,'hidden'));ok(await moderate('questions',questionId,'hidden'));
  assert.ok(!(await discussion('comments')).items.some(item=>item.id===commentId));assert.ok(!(await discussion('questions')).items.some(item=>item.id===questionId));
  assert.equal((await api(member.id,'comment_edit',{body:'نص معدل يبقى مخفياً بقرار الإدارة',status:'approved'},commentId)).status,200);assert.equal((await row('debate_comments',commentId)).status,'hidden');
  assert.equal((await api(member.id,'comment_edit',{body:'تعديل تعليق مرفوض لا يعيد نشره',status:'approved'},legacy.comments.rejected)).status,200);assert.equal((await row('debate_comments',legacy.comments.rejected)).status,'rejected');
  ok(await moderate('comments',commentId,'approved'));ok(await moderate('questions',questionId,'approved'));
  assert.ok((await discussion('comments')).items.some(item=>item.id===commentId));assert.ok((await discussion('questions')).items.some(item=>item.id===questionId));
  ok(await moderate('questions',questionId,'selected'));ok(await moderate('questions',questionId,'answered'));assert.equal((await row('debate_questions',questionId)).status,'answered');
 });
 await t.test('confirmed sessions, selective restrictions, closed discussion and rate limits remain enforced',async()=>{
  assert.equal((await api(null,'comment',{debate_id:f.recorded,body:'طلب دون حساب'})).status,401);
  assert.equal((await api(unconfirmed.id,'question',{debate_id:f.recorded,body:'سؤال من حساب لم يؤكد بريده'})).status,403);
  await db.pg.query('update public.public_profiles set comments_restricted=true where user_id=$1',[member.id]);
  assert.equal((await api(member.id,'comment',{debate_id:f.recorded,body:'تعليق حساب مقيد'})).status,403);
  await submit('question','تقييد التعليقات لا يمنع طرح هذا السؤال');
  await db.pg.query('update public.public_profiles set comments_restricted=false,questions_restricted=true where user_id=$1',[member.id]);
  assert.equal((await api(member.id,'question',{debate_id:f.recorded,body:'سؤال حساب مقيد عن إرسال الأسئلة'})).status,403);
  await db.pg.query('update public.public_profiles set questions_restricted=false where user_id=$1',[member.id]);
  await f.update(f.recorded,{comments_open:false,questions_open:false});
  assert.equal((await api(member.id,'comment',{debate_id:f.recorded,body:'تعليق في نقاش مغلق'})).status,400);
  assert.equal((await api(member.id,'question',{debate_id:f.recorded,body:'سؤال في نقاش مغلق لا يجب نشره'})).status,400);
  await f.update(f.recorded,{comments_open:true,questions_open:true});await db.pg.exec('delete from public.debate_rate_limits');
  let limited=false;for(let index=0;index<12;index++){const result=await api(member.id,'comment',{debate_id:f.recorded,body:'رسالة متكررة لاختبار حد الإرسال '+index});if(result.status===429){limited=true;break;}assert.equal(result.status,200);}
  assert.equal(limited,true);
  await assert.rejects(db.run(member.id,"insert into public.debate_comments(debate_id,user_id,body,status) values($1,$2,'محاولة تجاوز RPC','approved')",[f.recorded,member.id]),error=>error.code==='42501');
  assert.equal((await rpc(management.id,'inline_editor_read',{p_view:'session'})).error,null);
 });
});
