import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';
import {participationNotice} from '../lib/debatePublication.js';
const sql=name=>readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const repair='202610220003_debate_discussion_publication_repair.sql';
for(const ordered of [false,true])test('publication repair: '+(ordered?'ordered migrations':'lifecycle present but instant policy absent, matching deployed defaults'),async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());if(ordered)await db.pg.exec(await sql('202610220001_debates_instant_discussion.sql'));await db.pg.exec(await sql('202610220002_debate_recording_lifecycle.sql'));
 const f=await seedDebateFixtures(db),[A,,,U]=inlineTestUsers;await f.update(f.live,{publication_status:'published'});
 const ok=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
 const row=async(table,id)=>(await db.pg.query('select * from public.'+table+' where id=$1',[id])).rows[0];
 const rpc=(user,name,args)=>db.client(user).rpc(name,args);
 const api=async(action,data={},id=null,createDb=db.createDb)=>{const r=await handleDebateRequest(new Request('http://localhost/api/debates',{method:'POST',headers:{Authorization:'Bearer '+U.id,'Content-Type':'application/json'},body:JSON.stringify({action,id,data})}),createDb);return {status:r.status,data:await r.json()};};
 const legacy={comments:{},questions:{}};
 for(const [kind,statuses]of Object.entries({comments:['pending','approved','hidden','rejected','deleted'],questions:['new','approved','hidden','rejected','deleted']}))for(const status of statuses){const r=await db.pg.query('insert into public.debate_'+kind+'(debate_id,user_id,body,status) values($1,$2,$3,$4) returning id',[f.live,U.id,'مشاركة قديمة محفوظة دون تغيير '+status,status]);legacy[kind][status]=await row('debate_'+kind,r.rows[0].id);}
 let commentId,questionId;
 t.beforeEach(()=>db.pg.exec('delete from public.debate_rate_limits'));
 await t.test('older API response reports the saved state honestly without publishing a waiting row',async()=>{
  const r=await api('comment',{debate_id:f.live,body:'مشاركة قبل إصلاح إعداد القاعدة'});assert.equal(r.status,200);assert.equal(r.data.status,ordered?'approved':'pending');assert.equal((await row('debate_comments',r.data.id)).status,r.data.status);
  assert.equal(participationNotice('comment',r.data,'').message.includes('نُشر'),ordered);
 });
 await t.test('repair preserves every existing status, body, owner and moderation audit',async()=>{
  const auditBefore=(await db.pg.query('select count(*)::int n from public.debate_moderation_actions')).rows[0].n;
  await db.pg.exec(await sql(repair));
  for(const [kind,items]of Object.entries(legacy))for(const previous of Object.values(items))assert.deepEqual(await row('debate_'+kind,previous.id),previous);
  assert.equal((await db.pg.query('select count(*)::int n from public.debate_moderation_actions')).rows[0].n,auditBefore);
  const defaults=(await db.pg.query("select pg_get_expr(d.adbin,d.adrelid) value from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid in ('public.debate_comments'::regclass,'public.debate_questions'::regclass) and a.attname='status'")).rows;assert.equal(defaults.length,2);for(const d of defaults)assert.equal(d.value,"'approved'::text");
 });
 await t.test('comments, replies and directed anonymous questions publish to guests and bypass only prior approval',async()=>{
  const comment=await api('comment',{debate_id:f.live,body:'تعليق ينشر مباشرة من دالة الإصلاح'});assert.equal(comment.status,200);assert.equal(comment.data.status,'approved');commentId=comment.data.id;
  const reply=await api('comment',{debate_id:f.live,body:'رد منشور مباشرة دون موافقة',parent_id:commentId});assert.equal(reply.data.status,'approved');
  const d=await f.full(f.live),q=await api('question',{debate_id:f.live,body:'سؤال موجه ومجهول قبل إتاحة التسجيل',participant_id:d.participants[1].id,axis:d.axes[0],anonymous:true});assert.equal(q.status,200);assert.equal(q.data.status,'approved');questionId=q.data.id;
  const comments=ok(await rpc(null,'debate_discussion',{p_debate:f.live,p_kind:'comments'}));assert.equal(comments.items.filter(i=>i.id===commentId).length,1);assert.equal(comments.items.find(i=>i.id===reply.data.id).parent_id,commentId);
  const question=ok(await rpc(null,'debate_discussion',{p_debate:f.live,p_kind:'questions'})).items.find(i=>i.id===questionId);assert.equal(question.display_name,'مشارك');assert.equal('user_id'in question,false);assert.equal(question.participant_id,d.participants[1].id);assert.equal(question.axis,d.axes[0]);
  const counts=ok(await rpc(A.id,'inline_editor_read',{p_view:'counts',p_debate:f.live}));const pendingComments=(await db.pg.query("select count(*)::int n from public.debate_comments where debate_id=$1 and status='pending'",[f.live])).rows[0].n;assert.equal(counts.comments,pendingComments);assert.equal(counts.questions,1);
 });
 await t.test('explicit creation state survives accidental default drift; editing cannot undo moderation',async()=>{
  await db.pg.exec("alter table public.debate_comments alter column status set default 'pending';alter table public.debate_questions alter column status set default 'new'");
  assert.equal((await api('comment',{debate_id:f.live,body:'يبقى التعليق منشوراً حتى مع تغيير القيمة الافتراضية'})).data.status,'approved');assert.equal((await api('question',{debate_id:f.live,body:'يبقى السؤال منشوراً حتى مع تغيير القيمة الافتراضية'})).data.status,'approved');
  for(const status of ['hidden','rejected']){const id=status==='hidden'?commentId:legacy.comments.rejected.id,current=await row('debate_comments',id);if(status==='hidden')ok(await rpc(A.id,'inline_editor_mutate',{p_action:'moderate',p_kind:'comments',p_id:id,p_data:{status,reason:'قرار إشراف محفوظ بعد النشر',updated_at:current.updated_at}}));const edit=await api('comment_edit',{body:'تعديل لا يتجاوز قرار المشرف '+status,status:'approved'},id);assert.equal(edit.data.status,status);assert.equal((await row('debate_comments',id)).status,status);assert.ok(!ok(await rpc(null,'debate_discussion',{p_debate:f.live,p_kind:'comments'})).items.some(i=>i.id===id));}
  const current=await row('debate_comments',commentId);ok(await rpc(A.id,'inline_editor_mutate',{p_action:'moderate',p_kind:'comments',p_id:commentId,p_data:{status:'approved',reason:'استعادة من المشرف بعد المراجعة',updated_at:current.updated_at}}));assert.equal((await api('comment_edit',{body:'يبقى تعديل التعليق المنشور متاحاً للجميع'},commentId)).data.status,'approved');
  await assert.rejects(db.run(U.id,"insert into public.debate_comments(debate_id,user_id,body) values($1,$2,'تجاوز RPC')",[f.live,U.id]),e=>e.code==='42501');assert.equal((await rpc(U.id,'debate_audience_mutate_pre_lifecycle',{p_action:'question',p_data:{}})).error.code,'42501');
 });
 await t.test('recording lifecycle and vote guards still apply after the publication repair',async()=>{
  await f.update(f.live,{stage:'ended',recording_url:'https://www.youtube.com/watch?v=abcdefghijk',recording_published:true});const q=await api('question',{debate_id:f.live,body:'لا يجوز إنشاء سؤال بعد نشر التسجيل'});assert.equal(q.status,409);assert.equal(q.data.code,'questions_closed_after_recording');const d=await f.full(f.live),v=await api('vote',{debate_id:d.id,option_id:d.options[0].id},d.polls.find(p=>p.phase==='before').id);assert.equal(v.status,409);assert.equal(v.data.code,'poll_phase_changed');assert.equal((await row('debate_questions',questionId)).status,'approved');
 });
});

test('a successful legacy save is not reported as a failed POST if status verification is unavailable',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());const f=await seedDebateFixtures(db),U=inlineTestUsers[3];await f.update(f.live,{publication_status:'published'});
 const createDb=request=>{const c=db.createDb(request);return {...c,from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({error:{code:'NETWORK'},data:null})})};};
 const r=await handleDebateRequest(new Request('http://localhost/api/debates',{method:'POST',headers:{Authorization:'Bearer '+U.id,'Content-Type':'application/json'},body:JSON.stringify({action:'comment',data:{debate_id:f.live,body:'حفظ ناجح يتبعه تعذر التحقق من الحالة'}})}),createDb);assert.equal(r.status,200);assert.equal((await r.json()).status,null);assert.equal((await db.pg.query('select count(*)::int n from public.debate_comments')).rows[0].n,1);assert.ok(participationNotice('comment',{status:null},'').message.includes('قبل إعادة الإرسال'));
});

test('publication repair refuses an unfamiliar mutation without partially changing database policy',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await sql('202610220002_debate_recording_lifecycle.sql'));
 const definition=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
 await db.pg.exec(definition.replace('insert into public.debate_comments(','insert into public.debate_comments ('));
 await assert.rejects(db.pg.exec(await sql(repair)),/Review the current audience mutation/);await db.pg.exec('rollback');
 const value=(await db.pg.query("select pg_get_expr(d.adbin,d.adrelid) value from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid='public.debate_comments'::regclass and a.attname='status'")).rows[0].value;assert.equal(value,"'pending'::text");
 const current=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;assert.ok(current.includes('insert into public.debate_comments ('));
});
