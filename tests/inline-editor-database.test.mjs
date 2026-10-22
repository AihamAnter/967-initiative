import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {readDebateAdmin} from '../lib/debateRepository.js';
import {debateSaveData} from '../lib/debateEditor.js';
import {handleDebateRequest} from '../lib/debateApi.js';

test('inline editing: real isolated PostgreSQL permissions, transitions, audit and concurrency',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());const [A,B,M,U,N,V]=inlineTestUsers,f=await seedDebateFixtures(db);
 await f.update(f.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});
 const ok=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
 const rpc=(user,name,args={})=>db.client(user).rpc(name,args);
 const read=async(view,kind,id,extra={})=>ok(await rpc(A.id,'inline_editor_read',{p_view:view,p_kind:kind||null,p_id:id||null,...extra}));
 const item=async(kind,id)=>(await read('item',kind,id)).item;
 const cmd=async(action,kind,id,data={},who=A.id)=>rpc(who,'inline_editor_mutate',{p_action:action,p_kind:kind,p_id:id,p_data:data});
 const mod=async(kind,id,status,extra={},who=A.id)=>cmd('moderate',kind,id,{updated_at:(await item(kind,id)).updated_at,status,reason:'قرار مراجعة تجريبي موثق',...extra},who);
 const comment=async(body='مشاركة لاختبار المراجعة المتزامنة',user=U.id)=>ok(await rpc(user,'debate_audience_mutate',{p_action:'comment',p_data:{debate_id:f.recorded,body}})).id;
 const question=async(anonymous=false)=>ok(await rpc(U.id,'debate_audience_mutate',{p_action:'question',p_data:{debate_id:f.recorded,body:'كيف يمكن تطوير المشاركة في هذه المناظرة؟',anonymous,participant_id:(await f.full(f.recorded)).participants[0].id,axis:'دور المؤسسات'}})).id;
 const publicRows=async(kind)=>ok(await rpc(null,'debate_discussion',{p_debate:f.recorded,p_kind:kind}));
 t.beforeEach(()=>db.pg.exec('delete from public.debate_rate_limits'));
 let c,q,hiddenAudit;
 await t.test('anonymous and ordinary accounts cannot invoke any administrative read/write helper or audit table',async()=>{
  for(const u of [null,U.id,N.id,V.id]){
   assert.ok((await rpc(u,'inline_editor_read',{p_view:'session'})).error);
   assert.ok((await rpc(u,'inline_editor_read',{p_view:'queue',p_kind:'all'})).error);
   assert.ok((await rpc(u,'inline_editor_mutate',{p_action:'task',p_data:{}})).error);
   assert.ok((await rpc(u,'inline_content_read',{p_kind:'company',p_id:randomUUID()})).error);
   assert.ok((await rpc(u,'inline_content_save',{p_kind:'company',p_id:randomUUID(),p_revision:1,p_data:{name:'تجاوز'}})).error);
  }
  assert.deepEqual((await db.client(U.id).from('inline_content_audit').select('*')).data,[]);
  await assert.rejects(db.run(A.id,"select public.debate_admin_mutate_base('save',null,null,'{}')"));
  await assert.rejects(db.run(A.id,"select public.inline_item('comments',gen_random_uuid())"));
 });
 await t.test('pending counts scope by debate and a redacted queue never reveals anonymous identity',async()=>{
  c=await comment();q=await question(true);
  const counts=await read('counts',null,null,{p_debate:f.recorded});assert.deepEqual(counts,{comments:1,questions:1,reports:0,total:2});
  assert.equal((await read('counts',null,null,{p_debate:f.live})).total,0);
  const queue=await read('queue','all',null,{p_debate:f.recorded});assert.equal(queue.total,2);assert.equal(queue.items.length,2);
  const projected=queue.items.find(x=>x.id===q);assert.equal(projected.display_name,'مشارك');assert.equal(projected.capabilities.account,false);assert.equal(projected.capabilities.restrict,false);assert.ok(projected.participant_id);assert.equal(projected.axis,'دور المؤسسات');
  assert.ok(!JSON.stringify(projected).includes(U.id));assert.ok(!JSON.stringify(projected).includes('email'));assert.equal((await publicRows('comments')).total,0);assert.equal((await publicRows('questions')).total,0);
  assert.ok((await rpc(M.id,'inline_editor_read',{p_view:'account',p_kind:'questions',p_id:q})).error);
 });
 await t.test('the full dashboard receives the same database capabilities, scoped and protected from revoked roles',async()=>{
  const caps=await read('capabilities',null,null,{p_debate:f.recorded});assert.deepEqual(caps.capabilities.comments[c].statuses,['approved','rejected','hidden']);assert.equal(caps.capabilities.questions[q].account,false);
  assert.deepEqual((await read('capabilities',null,null,{p_debate:f.live})).capabilities,{comments:{},questions:{},reports:{}});
  const workspace=await readDebateAdmin(db.client(A.id),{user:{id:A.id},role:'admin'});assert.deepEqual(workspace.debate_comments.find(x=>x.id===c).capabilities,caps.capabilities.comments[c]);assert.deepEqual(workspace.debate_questions.find(x=>x.id===q).capabilities,caps.capabilities.questions[q]);
  for(const code of ['42704','42883']){
   const fallback={...db.client(A.id),rpc:async()=>({data:null,error:{code}})};const legacy=await readDebateAdmin(fallback,{user:{id:A.id},role:'admin'});assert.equal(legacy.debate_comments.find(x=>x.id===c).capabilities,undefined);
  }
  for(const [code,status] of [['42501',403],['40001',409],['XX000',503]])await assert.rejects(readDebateAdmin({...db.client(A.id),rpc:async()=>({data:null,error:{code}})},{user:{id:A.id},role:'admin'}),e=>e.status===status);
  await assert.rejects(readDebateAdmin(db.client(U.id),{user:{id:A.id},role:'admin'}),e=>e.status===403);
 });
 await t.test('approval uses the same dashboard command and makes the redacted public row visible',async()=>{
  const current=await item('comments',c);const result=ok(await rpc(A.id,'debate_admin_mutate',{p_action:'moderate',p_id:c,p_data:{kind:'comments',updated_at:current.updated_at,status:'approved',reason:'اعتماد من اللوحة الحالية'}}));
  assert.equal(result.item.status,'approved');assert.equal((await publicRows('comments')).total,1);assert.ok(!('user_id' in (await publicRows('comments')).items[0]));
  assert.equal((await read('history','comments',c)).items.length,1);
 });
 await t.test('a participant edit after a moderator reads a comment prevents stale approval',async()=>{
  const stale=await item('comments',c);ok(await rpc(U.id,'debate_audience_mutate',{p_action:'comment_edit',p_id:c,p_data:{body:'نص جديد يجب مراجعته من جديد قبل الاعتماد'}}));
  assert.equal((await cmd('moderate','comments',c,{updated_at:stale.updated_at,status:'approved',reason:'قرار على نسخة قديمة'})).error.code,'40001');
  assert.equal((await item('comments',c)).status,'pending');ok(await mod('comments',c,'approved'));
 });
 await t.test('question selection, unselection, answered, hidden and restore preserve target and anonymity',async()=>{
  assert.equal((await mod('questions',q,'selected')).error.code,'22023');
  ok(await mod('questions',q,'approved'));ok(await mod('questions',q,'selected'));ok(await mod('questions',q,'approved'));ok(await mod('questions',q,'selected'));ok(await mod('questions',q,'answered'));
  const answered=await item('questions',q),hidden=ok(await mod('questions',q,'hidden'));assert.equal((await publicRows('questions')).total,0);
  assert.deepEqual(hidden.item.capabilities.statuses,['answered']);ok(await cmd('undo',null,hidden.undo_id));
  const restored=await item('questions',q);assert.equal(restored.status,'answered');assert.equal(restored.participant_id,answered.participant_id);assert.equal((await publicRows('questions')).items[0].display_name,'مشارك');
  const old=restored.updated_at;ok(await mod('questions',q,'selected'));assert.equal((await cmd('moderate','questions',q,{updated_at:old,status:'hidden',reason:'محاولة مراجعة قديمة'})).error.code,'40001');
 });
 await t.test('pin limit is serialized, public marker preserves original timestamps, hiding clears pin',async()=>{
  const ids=[c];for(let i=0;i<3;i++){const id=await comment('تعليق لاختبار حد تثبيت التعليقات '+i);ids.push(id);ok(await mod('comments',id,'approved'));}
  const original=(await item('comments',c)).created_at;
  for(const id of ids.slice(0,3))ok(await cmd('pin','comments',id,{updated_at:(await item('comments',id)).updated_at,pinned:true,reason:'إبراز مشاركة مفيدة'}));
  const limit=await cmd('pin','comments',ids[3],{updated_at:(await item('comments',ids[3])).updated_at,pinned:true,reason:'تجاوز عدد المثبتات'});assert.equal(limit.error.code,'22023');
  const published=(await publicRows('comments')).items;assert.equal(published.filter(x=>x.pinned).length,3);assert.equal(published.find(x=>x.id===c).created_at,original);
  const hidden=ok(await mod('comments',c,'hidden'));hiddenAudit=hidden.undo_id;assert.equal(hidden.item.pinned,false);assert.ok(!(await publicRows('comments')).items.find(x=>x.id===c));
 });
 await t.test('public deep links resolve older published records with identical redaction and never expose pending content',async()=>{
  const pending=await comment('لا يجوز كشف هذا التعليق غير المعتمد عبر رابط مباشر');
  assert.equal(ok(await rpc(null,'debate_discussion_target',{p_debate:f.recorded,p_kind:'comments',p_id:pending})),null);
  const ids=[];for(let i=0;i<24;i++)ids.push((await db.pg.query("insert into public.debate_comments(debate_id,user_id,body,status,created_at) values($1,$2,$3,'approved',now()-interval '2 days'+$4*interval '1 minute') returning id",[f.recorded,U.id,'تعليق منشور قديم رقم '+i,i])).rows[0].id);
  const target=ok(await rpc(null,'debate_discussion_target',{p_debate:f.recorded,p_kind:'comments',p_id:ids[0],p_order:'newest'}));assert.ok(target.page>1);assert.equal(target.item.id,ids[0]);assert.ok(!('user_id' in target.item));
  const page=ok(await rpc(null,'debate_discussion',{p_debate:f.recorded,p_kind:'comments',p_page:target.page,p_order:'newest'}));assert.deepEqual(page.items.find(x=>x.id===ids[0]),target.item);
  const oldest=ok(await rpc(null,'debate_discussion_target',{p_debate:f.recorded,p_kind:'comments',p_id:ids[0],p_order:'oldest'}));assert.equal(oldest.page,1);
  const anon=ok(await rpc(null,'debate_discussion_target',{p_debate:f.recorded,p_kind:'questions',p_id:q}));assert.equal(anon.item.display_name,'مشارك');assert.ok(!JSON.stringify(anon).includes(U.id));
  assert.equal(ok(await rpc(null,'debate_discussion_target',{p_debate:f.live,p_kind:'comments',p_id:ids[0]})),null);
  assert.equal(ok(await rpc(null,'debate_discussion_target',{p_debate:f.recorded,p_kind:'comments',p_id:c})),null);
 });
 await t.test('undo is audited, single use, and cannot resurrect a later edited or deleted item',async()=>{
  ok(await cmd('undo',null,hiddenAudit));assert.ok((await cmd('undo',null,hiddenAudit)).error);assert.equal((await item('comments',c)).status,'approved');
  const hidden=ok(await mod('comments',c,'hidden'));ok(await rpc(U.id,'debate_audience_mutate',{p_action:'comment_edit',p_id:c,p_data:{body:'مسودة أحدث بعد إجراء الإخفاء الإداري'}}));
  assert.equal((await cmd('undo',null,hidden.undo_id)).error.code,'40001');assert.equal((await item('comments',c)).status,'pending');
  const history=(await read('history','comments',c)).items;assert.ok(history.some(h=>h.action==='undo'));assert.ok(history.every(h=>!JSON.stringify(h).includes('user_id')));
 });
 await t.test('reports are scoped, require CAS and resolution does not change published comment state',async()=>{
  ok(await mod('comments',c,'approved'));const report=ok(await rpc(V.id,'debate_audience_mutate',{p_action:'report',p_id:c,p_data:{reason:'بلاغ اختبار يطلب مراجعة النص المنشور'}})).id;
  const before=await item('reports',report);ok(await mod('reports',report,'resolved'));assert.equal((await item('comments',c)).status,'approved');
  assert.equal((await cmd('moderate','reports',report,{updated_at:before.updated_at,status:'dismissed',reason:'نسخة قديمة من البلاغ'})).error.code,'40001');
  assert.equal((await read('queue','reports',null,{p_debate:f.live})).total,0);
 });
 await t.test('management-only tombstone deletion keeps approved replies and cannot be undone',async()=>{
  const reply=ok(await rpc(V.id,'debate_audience_mutate',{p_action:'comment',p_data:{debate_id:f.recorded,parent_id:c,body:'رد محفوظ بعد حذف أصل السلسلة'}})).id;ok(await mod('comments',reply,'approved'));
  const data={updated_at:(await item('comments',c)).updated_at,reason:'حذف مع الحفاظ على سلسلة الردود',confirmed:true};assert.equal((await cmd('delete','comments',c,data)).error.code,'42501');
  const deleted=ok(await cmd('delete','comments',c,data,M.id));assert.equal(deleted.item.status,'deleted');assert.ok(!deleted.undo_id);assert.equal((await item('comments',reply)).parent_id,c);assert.ok((await publicRows('comments')).items.some(x=>x.id===reply));
  assert.ok((await mod('comments',c,'approved')).error);
 });
 await t.test('selective restrictions reuse profile and require management, live role, reason, CAS; votes stay private',async()=>{
  const source=await comment('مصدر واضح لاختبار التقييد الجزئي');const state=(await read('account','comments',source)).account;
  const data={updated_at:state.updated_at,comments_restricted:true,questions_restricted:false,reason:'تقييد التعليقات بعد مراجعة البلاغات'};
  assert.equal((await cmd('restrict','comments',source,data)).error.code,'42501');ok(await cmd('restrict','comments',source,data,M.id));
  assert.equal((await rpc(U.id,'debate_audience_mutate',{p_action:'comment',p_data:{debate_id:f.recorded,body:'تعليق يجب رفضه بسبب التقييد'}})).error.code,'42501');
  ok(await rpc(U.id,'debate_audience_mutate',{p_action:'question',p_data:{debate_id:f.recorded,body:'هل يبقى إرسال الأسئلة مسموحاً رغم تقييد التعليقات؟'}}));
  const latest=(await read('account','comments',source)).account;ok(await cmd('restrict','comments',source,{updated_at:latest.updated_at,comments_restricted:false,reason:'رفع التقييد بعد مراجعة القرار'},M.id));
  assert.deepEqual((await db.client(M.id).from('debate_votes').select('*')).data,[]);
  await db.pg.query('delete from public.editors where user_id=$1',[B.id]);assert.ok((await rpc(B.id,'inline_editor_read',{p_view:'counts'})).error);await db.pg.query("insert into public.editors(user_id,role) values($1,'admin')",[B.id]);
 });
 let companyId,workId,professionalId;
 await t.test('content patches preserve unrendered fields and unknown product metadata; CAS protects concurrent editors',async()=>{
  companyId=randomUUID();workId=randomUUID();professionalId=randomUUID();
  await db.pg.query("insert into public.yemeni_companies(id,slug,name,category,location,legal_name,products,is_published) values($1,'test-company','شركة تجريبية','صناعة','صنعاء','الاسم القانوني المحفوظ',$2,true)",[companyId,JSON.stringify([{name:'منتج',unknown_source:'preserve-this',currency:'YER'}])]);
  await db.pg.query("insert into public.works(id,slug,title,external_url,is_published) values($1,'inline-work','عمل قبل التحرير','https://youtube.com/watch?v=abcdefghijk',true)",[workId]);
  await db.pg.query("insert into public.professionals(id,slug,full_name,profession_title,category,location,services,is_published) values($1,'test-pro','اسم مهني','نجار','حرف','صنعاء',array['خدمة مهنية'],true)",[professionalId]);
  const saved=ok(await rpc(A.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:1,p_data:{name:'شركة بعد التحرير'}}));assert.equal(saved.revision,2);assert.equal(saved.item.legal_name,'الاسم القانوني المحفوظ');assert.equal(saved.item.products[0].unknown_source,'preserve-this');
  assert.equal((await rpc(B.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:1,p_data:{name:'كتابة قديمة'}})).error.code,'40001');
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:2,p_data:{revision:99}})).error.code,'42501');
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:2,p_data:{website:'javascript:alert(1)'}})).error.code,'22023');
  const history=ok(await rpc(A.id,'inline_content_read',{p_kind:'company',p_id:companyId,p_history:true}));assert.equal(history.items.length,1);assert.equal(history.items[0].before_value.name,'شركة تجريبية');
 });
 await t.test('old editor direct updates receive the same revision/audit; content hide undo rejects newer changes',async()=>{
  await db.run(A.id,'update public.yemeni_companies set summary=$1 where id=$2',['تعديل المحرر الحالي',companyId]);
  const fresh=ok(await rpc(A.id,'inline_content_read',{p_kind:'company',p_id:companyId}));assert.equal(fresh.revision,3);
  const hidden=ok(await rpc(A.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:3,p_data:{is_published:false}}));assert.ok(hidden.undo_id);
  ok(await rpc(B.id,'inline_content_undo',{p_id:hidden.undo_id}));assert.ok((await rpc(B.id,'inline_content_undo',{p_id:hidden.undo_id})).error);
  const h2=ok(await rpc(A.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:5,p_data:{is_published:false}}));
  ok(await rpc(B.id,'inline_content_save',{p_kind:'company',p_id:companyId,p_revision:6,p_data:{summary:'نسخة أحدث لا يجوز إلغاء قرارها'}}));assert.equal((await rpc(A.id,'inline_content_undo',{p_id:h2.undo_id})).error.code,'40001');
 });
 await t.test('linked media remains debate-controlled; professional validation and map text-only allowlist hold in DB',async()=>{
  await db.pg.query('update public.works set debate_id=$1 where id=$2',[f.recorded,workId]);
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'work',p_id:workId,p_revision:2,p_data:{title:'تجاوز مصدر المناظرة'}})).error.code,'42501');
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'professional',p_id:professionalId,p_revision:1,p_data:{services:[]}})).error.code,'22023');
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'professional',p_id:professionalId,p_revision:1,p_data:{is_verified:true,email:'person@example.com'}})).error.code,'22023');
  await db.pg.exec("insert into public.governorates(id,name_ar,description) values('YE-SA','صنعاء','وصف سابق')");
  const edited=ok(await rpc(A.id,'inline_content_save',{p_kind:'governorate',p_id:'YE-SA',p_revision:1,p_data:{description:'وصف حديث'}}));assert.equal(edited.item.name_ar,'صنعاء');
  assert.equal((await rpc(A.id,'inline_content_save',{p_kind:'governorate',p_id:'YE-SA',p_revision:2,p_data:{population:999}})).error.code,'42501');
 });
 await t.test('linked tasks reuse existing role rules, audit and workspace tables with validated source',async()=>{
  const created=ok(await cmd('task',null,null,{title:'مراجعة هذه المناظرة',description:'متابعة بيانات الاتصال أو النص المنشور',source_type:'debate',source_id:f.recorded,source_url:'/debates/local-prerecorded'}));
  const task=(await db.pg.query('select * from public.tasks where id=$1',[created.id])).rows[0];assert.equal(task.assigned_to,A.id);assert.equal(task.source_id,f.recorded);assert.equal(task.source_url,'/debates/local-prerecorded');assert.equal((await db.pg.query('select count(*)::int n from public.debate_task_links where task_id=$1',[created.id])).rows[0].n,1);
  assert.ok((await cmd('task',null,null,{title:'تجاوز الإسناد',description:'طلب مرفوض',source_type:'debate',source_id:f.recorded,source_url:'/debates/local-prerecorded',assigned_to:B.id})).error);
  assert.ok((await cmd('task',null,null,{title:'مصدر ضار',description:'مرفوض',source_type:'debate',source_url:'//evil.invalid'})).error);
 });
 await t.test('debate edits preserve revision checks, poll protections, live result privacy and one enriched audit action',async()=>{
  const latest=(await read('debate',null,f.recorded)).debate;assert.ok(latest.polls.length);assert.ok(!('votes' in latest));
  const old=latest.revision;ok(await rpc(A.id,'debate_admin_mutate',{p_action:'save',p_id:f.recorded,p_revision:old,p_data:{title:'عنوان تم تحريره مباشرة من المناظرة'}}));
  assert.equal((await rpc(B.id,'debate_admin_mutate',{p_action:'save',p_id:f.recorded,p_revision:old,p_data:{title:'تعديل قديم'}})).error.code,'40001');
  const logs=(await db.pg.query("select * from public.debate_moderation_actions where action='save' and target_id=$1 order by created_at desc limit 1",[f.recorded])).rows;assert.equal(logs[0].target_kind,'debates');assert.equal(logs[0].before_value.title,latest.title);assert.ok(!('results' in logs[0].after_value));
 });
 await t.test('poll reopening capabilities mirror saved results, all-debate votes, live role and enabled phase without exposing ballots',async()=>{
  const detail=async user=>ok(await rpc(user,'inline_editor_read',{p_view:'debate',p_id:f.live})).debate;
  const initial=await detail(A.id),before=initial.polls.find(p=>p.phase==='before'),after=initial.polls.find(p=>p.phase==='after');
  await db.pg.query('update public.debate_polls set is_closed=true where debate_id=$1',[f.live]);
  assert.equal((await detail(A.id)).poll_capabilities[before.id].can_reopen,true);assert.equal((await detail(A.id)).poll_capabilities[after.id].can_reopen,true);
  const option=(await db.pg.query('select id from public.debate_poll_options where debate_id=$1 limit 1',[f.live])).rows[0].id;
  await db.pg.query('insert into public.debate_votes(user_id,debate_id,poll_id,option_id) values($1,$2,$3,$4)',[U.id,f.live,before.id,option]);
  const admin=await detail(A.id),management=await detail(M.id);assert.equal(admin.poll_capabilities[before.id].can_reopen,false);assert.equal(admin.poll_capabilities[after.id].can_reopen,false);assert.equal(management.poll_capabilities[before.id].can_reopen,true);assert.equal(management.poll_capabilities[after.id].can_reopen,true);assert.ok(!('votes' in admin));assert.ok(!JSON.stringify(admin.poll_capabilities).includes(U.id));
  await db.pg.query('update public.debates set results=$2::jsonb where id=$1',[f.live,JSON.stringify({before:{total:1}})]);
  assert.equal((await detail(M.id)).poll_capabilities[before.id].can_reopen,false);assert.equal((await detail(M.id)).poll_capabilities[after.id].can_reopen,true);
  await db.pg.query('delete from public.debate_votes where debate_id=$1',[f.live]);assert.equal((await detail(A.id)).poll_capabilities[after.id].can_reopen,false);
  await db.pg.query("update public.debate_polls set enabled=false where debate_id=$1 and phase='after'",[f.live]);assert.equal((await detail(M.id)).poll_capabilities[after.id].can_reopen,false);
  await db.pg.query("update public.debates set results='{}'::jsonb where id=$1",[f.live]);
 });
 await t.test('a full editor snapshot after a cross-phase vote rejects stale Admin reopening with 403 and retains the draft target state',async()=>{
  const detail=async user=>ok(await rpc(user,'inline_editor_read',{p_view:'debate',p_id:f.recorded})).debate;
  const save=async(user,form,reason='')=>{const response=await handleDebateRequest(new Request('http://localhost/api/admin/debates',{method:'POST',headers:{authorization:'Bearer '+user,'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:form.id,revision:form.revision,data:debateSaveData(form,reason)})}),db.createDb,{admin:true});return {status:response.status,data:await response.json()};};
  const initial=await detail(A.id);assert.equal((await save(A.id,{...initial,polls:initial.polls.map(p=>p.phase==='before'?{...p,is_closed:true}:p)})).status,200);
  const loaded=await detail(A.id),before=loaded.polls.find(p=>p.phase==='before'),after=loaded.polls.find(p=>p.phase==='after');assert.equal(loaded.poll_capabilities[before.id].can_reopen,true);
  const draft={...loaded,title:'مسودة عنوان محفوظة محلياً عند رفض إعادة الفتح',polls:loaded.polls.map(p=>p.phase==='before'?{...p,is_closed:false}:p)};
  ok(await rpc(U.id,'debate_audience_mutate',{p_action:'vote',p_id:after.id,p_data:{debate_id:loaded.id,option_id:loaded.options[0].id,watched_confirmed:true}}));
  const denied=await save(A.id,draft);assert.equal(denied.status,403,JSON.stringify(denied));
  const unchanged=await detail(A.id);assert.equal(unchanged.title,loaded.title);assert.equal(unchanged.revision,loaded.revision);assert.equal(unchanged.polls.find(p=>p.id===before.id).is_closed,true);assert.equal(unchanged.poll_capabilities[before.id].can_reopen,false);
  const permitted=await save(M.id,draft,'إعادة الفتح بقرار إدارة موثق');assert.equal(permitted.status,200,JSON.stringify(permitted));assert.equal((await detail(M.id)).polls.find(p=>p.id===before.id).is_closed,false);
 });
 await t.test('figure and CMS service CAS atomically audit only safe metadata, never accessible to ordinary RPC callers',async()=>{
  const source=await readFile(new URL('../supabase/yemeni-figures.sql',import.meta.url),'utf8');await db.pg.exec(source.slice(0,source.indexOf('-- Figure portraits')));
  await db.pg.exec('create table public.site_settings(key text primary key,value jsonb not null,updated_at timestamptz not null default now());alter table public.site_settings enable row level security;');
  const service=(kind,id,revision,data,actor=A.id,action='update')=>db.pg.transaction(async tx=>{await tx.exec('set local role service_role');return (await tx.query('select public.inline_service_save($1,$2,$3,$4::jsonb,$5,$6) result',[kind,id,revision,JSON.stringify(data),actor,action])).rows[0].result;});
  const figureId=randomUUID(),figure={id:figureId,slug:'service-figure',full_name:'شخصية اختبار محلية',known_for:'نشاط ثقافي',field:'ثقافة',governorate_id:'YE13',governorate_name:'صنعاء',era:'معاصرة',short_bio:'مسودة سيرة لا يجب نسخها إلى سجل التدقيق العام.',is_published:false,updated_at:'2026-10-21T10:00:00.000Z'};
  await assert.rejects(db.run(A.id,'select public.inline_service_save($1,$2,$3,$4::jsonb,$5,$6)',['figure',figureId,null,JSON.stringify(figure),A.id,'create']),e=>e.code==='42501');
  await assert.rejects(service('figure',figureId,null,figure,U.id,'create'),e=>e.code==='42501');
  const first=await service('figure',figureId,null,figure,A.id,'create');assert.equal(first.record.id,figureId);
  const edited=await service('figure',figureId,first.revision,{...figure,full_name:'اسم بعد المراجعة',updated_at:'2026-10-21T10:00:01.000Z'});assert.equal(edited.record.full_name,'اسم بعد المراجعة');
  await assert.rejects(service('figure',figureId,first.revision,{...figure,updated_at:'2026-10-21T10:00:02.000Z'}),e=>e.code==='40001');
  await assert.rejects(service('figure',figureId,edited.revision,{},A.id,'delete'),e=>e.code==='42501');
  const audit=(await db.pg.query("select * from public.inline_content_audit where kind='figure' and target_id=$1 order by created_at",[figureId])).rows;assert.equal(audit.length,2);assert.equal(audit[1].actor_id,A.id);assert.ok(!('short_bio' in audit[1].after_value));
  const deleted=await service('figure',figureId,edited.revision,{},M.id,'delete');assert.equal(deleted.record.id,figureId);
  const page={id:'about',slug:'about',title:'من نحن',description:'وصف الصفحة',summary:'مسودة خاصة لا تسجل كاملة',sections:[{id:'secret',text:'نص طويل لا يتكرر في السجل'}]};
  const catalog={key:'public_content_pages_v1',value:{version:1,pages:[page]},updated_at:'2026-10-21T11:00:00.000Z'};
  const initial=await service('page','public_content_pages_v1',null,catalog,A.id,'update');
  const next={...catalog,value:{version:1,pages:[{...page,title:'عنوان محدث'}]},updated_at:'2026-10-21T11:00:01.000Z'};
  await service('page','public_content_pages_v1',initial.revision,next,A.id,'update');
  await assert.rejects(service('page','public_content_pages_v1',initial.revision,next,A.id,'update'),e=>e.code==='40001');
  const pageLogs=(await db.pg.query("select * from public.inline_content_audit where kind='page' and target_id='about' order by created_at")).rows;assert.equal(pageLogs.length,2);assert.equal(pageLogs[1].after_value.title,'عنوان محدث');assert.ok(!('sections' in pageLogs[1].after_value));assert.ok(!('summary' in pageLogs[1].after_value));
  await assert.rejects(service('page','public_content_pages_v1','2026-10-21T11:00:01.000Z',{...next,value:{version:1,pages:[]},updated_at:'2026-10-21T11:00:02.000Z'},A.id,'update'),e=>e.code==='42501');
  await assert.rejects(service('page','public_content_pages_v1','2026-10-21T11:00:01.000Z',{...next,value:{version:1,pages:[{...page,slug:'changed-route'}]},updated_at:'2026-10-21T11:00:02.000Z'},M.id,'update'),e=>e.code==='22023');
  await db.pg.query('delete from public.editors where user_id=$1',[B.id]);await assert.rejects(service('page','public_content_pages_v1','2026-10-21T11:00:01.000Z',{...next,updated_at:'2026-10-21T11:00:02.000Z'},B.id),e=>e.code==='42501');
 });
});
