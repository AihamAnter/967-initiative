import test from 'node:test';
import assert from 'node:assert/strict';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';
import {describeDebateAudit,auditActionLabel} from '../lib/debateAudit.js';

test('administrative audit resolves names and item context without publishing anonymous identity or deleted text',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());
 const f=await seedDebateFixtures(db),[admin,,manager,member]=inlineTestUsers;
 const ok=result=>{assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
 const rpc=(user,name,args={})=>db.client(user).rpc(name,args);
 await f.update(f.recorded,{publication_status:'published'});
 await db.pg.query("update auth.users set raw_user_meta_data=raw_user_meta_data||$2::jsonb where id=$1",[admin.id,JSON.stringify({full_name:'أحمد المشرف'})]);
 await db.pg.query("update public.public_profiles set display_name='اسم العرض العام للمشرف' where user_id=$1",[admin.id]);
 const comment=ok(await rpc(member.id,'debate_audience_mutate',{p_action:'comment',p_data:{debate_id:f.recorded,body:'تعليق واضح لشرح العنصر داخل سجل الإدارة'}})).id;
 const question=ok(await rpc(member.id,'debate_audience_mutate',{p_action:'question',p_data:{debate_id:f.recorded,body:'هل يبقى صاحب السؤال المجهول مجهولاً في وصف السجل؟',anonymous:true}})).id;
 const item=async(kind,id)=>ok(await rpc(admin.id,'inline_editor_read',{p_view:'item',p_kind:kind,p_id:id})).item;
 const moderate=async(kind,id,status)=>ok(await rpc(admin.id,'debate_admin_mutate',{p_action:'moderate',p_id:id,p_data:{kind,status,reason:'مقبول',updated_at:(await item(kind,id)).updated_at}}));
 await moderate('comments',comment,'approved');await moderate('questions',question,'approved');
 await db.pg.query("insert into public.debate_moderation_actions(actor_id,action,target_id,reason) values($1,'moderate',$2,'سجل قديم بلا تفاصيل انتقال')",[admin.id,question]);
 const read=async(user,customDb=db.createDb)=>{
  const response=await handleDebateRequest(new Request('http://localhost/api/admin/debates',{headers:{Authorization:'Bearer '+user}}),customDb,{admin:true});
  return {status:response.status,data:await response.json()};
 };
 await t.test('Management receives real editor names, Arabic actions, safe excerpts and working administrative target links',async()=>{
  const result=await read(manager.id);assert.equal(result.status,200);
  const action=result.data.debate_moderation_actions.find(row=>row.target_id===comment);
  assert.equal(action.actor_name,'أحمد المشرف');assert.equal(action.action_label,'نشر تعليق');assert.match(action.target_label,/تعليق واضح/);assert.match(action.target_context,/حوار مسجل/);
  const link=new URL(action.target_href,'http://localhost');assert.equal(link.pathname,'/admin/debates');assert.equal(link.searchParams.get('debate'),f.recorded);assert.equal(link.searchParams.get('kind'),'comments');assert.equal(link.searchParams.get('item'),comment);
  const questions=result.data.debate_moderation_actions.filter(row=>row.target_id===question);assert.ok(questions.every(row=>row.target_label.includes('باسم «مشارك»')));assert.ok(questions.every(row=>!row.target_label.includes(member.name)));assert.ok(questions.some(row=>row.action_label==='مراجعة سؤال'));
 });
 await t.test('audit visibility remains Management-only and no new Auth email data leaves the API',async()=>{
  const regular=await read(member.id);assert.equal(regular.status,403);
  const editor=await read(admin.id);assert.equal(editor.status,200);assert.equal('debate_moderation_actions' in editor.data,false);
  const logs=(await read(manager.id)).data.debate_moderation_actions;assert.ok(!JSON.stringify(logs).includes('@example.test'));assert.ok(!JSON.stringify(logs).includes('raw_user_meta_data'));
 });
 await t.test('deleted content is labeled without recovering its old body, and deleted debates retain their safe title',async()=>{
  ok(await rpc(manager.id,'inline_editor_mutate',{p_action:'delete',p_kind:'comments',p_id:comment,p_data:{confirmed:true,reason:'حذف المحتوى مع حفظ سجل الإشراف',updated_at:(await item('comments',comment)).updated_at}}));
  let result=await read(manager.id);const actions=result.data.debate_moderation_actions.filter(row=>row.target_id===comment);
  assert.ok(actions.every(row=>row.target_label==='تعليق محذوف'));assert.ok(actions.every(row=>!row.target_label.includes('تعليق واضح')));
  const debate=await f.get(f.live);
  ok(await rpc(manager.id,'debate_admin_mutate',{p_action:'delete',p_id:f.live,p_revision:debate.revision,p_data:{reason:'حذف مسودة اختبار مع حفظ اسمها في السجل'}}));
  result=await read(manager.id);const deleted=result.data.debate_moderation_actions.find(row=>row.action==='delete'&&row.target_id===f.live);
  assert.equal(deleted.action_label,'حذف مناظرة');assert.ok(deleted.target_label.includes(debate.title));assert.equal(deleted.target_href,null);
 });
 await t.test('former editors resolve through their profile and older installations tolerate the missing optional team RPC',async()=>{
  await db.pg.query('delete from public.editors where user_id=$1',[admin.id]);
  let result=await read(manager.id);assert.equal(result.data.debate_moderation_actions.find(row=>row.actor_id===admin.id).actor_name,'اسم العرض العام للمشرف');
  const legacy=request=>{const client=db.createDb(request);return {...client,rpc:(name,args)=>name==='task_team'?Promise.resolve({error:{code:'42883'},data:null}):client.rpc(name,args)};};
  result=await read(manager.id,legacy);assert.equal(result.status,200);assert.equal(result.data.debate_moderation_actions.find(row=>row.actor_id===admin.id).actor_name,'اسم العرض العام للمشرف');
 });
});

test('incomplete historical audit records never invent an action outcome or display opaque identifiers',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const [entry]=describeDebateAudit([{id,action:'moderate',actor_id:null,target_id:id,before_value:{body:'نص محذوف يجب ألا يعاد عرضه'}}],{}, {user:{id:'manager'}});
 assert.equal(entry.actor_name,'مسؤول سابق');assert.equal(entry.target_label,'عنصر غير متاح');assert.equal(entry.action_label,'مراجعة المشاركة');assert.equal(entry.target_href,null);
 assert.equal(auditActionLabel({action:'results_visibility'}),'تغيير ظهور نتائج الاستطلاع');
 assert.equal(auditActionLabel({action:'save',before_value:{publication_status:'hidden'},after_value:{publication_status:'published'}}),'إعادة نشر المناظرة');
});
