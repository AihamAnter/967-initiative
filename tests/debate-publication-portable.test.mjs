import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from './helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';import {handleDebateRequest} from '../lib/debateApi.js';
const sql=name=>readFile(new URL('../supabase/archive/legacy-migrations/'+name,import.meta.url),'utf8');
const lifecycle='202610220002_debate_recording_lifecycle.sql',oldRepair='202610220003_debate_discussion_publication_repair.sql',portable='202610220004_debate_discussion_publication_portable.sql';
const crlf=text=>text.replace(/\r?\n/g,'\r\n');
for(const mode of ['failed-crlf','reformatted-source','uppercase-keywords','already-repaired'])test('portable publication repair: '+mode,async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await sql(lifecycle));const f=await seedDebateFixtures(db),[A,,,U]=inlineTestUsers;await f.update(f.live,{publication_status:'published'});
 const before=(await db.pg.query("insert into public.debate_comments(debate_id,user_id,body,status) values($1,$2,'تعليق قديم ينتظر المراجعة','pending') returning *",[f.live,U.id])).rows[0];
 if(mode==='failed-crlf'){await assert.rejects(db.pg.exec(crlf(await sql(oldRepair))),/Review the current audience mutation/);await db.pg.exec('rollback');}
 if(mode==='already-repaired')await db.pg.exec(await sql(oldRepair));
 if(mode==='reformatted-source'){
  const d=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
  await db.pg.exec(crlf(d.replace('insert into public.debate_comments(','insert\n into public.debate_comments (').replace('insert into public.debate_questions(','insert\tinto public.debate_questions (').replace("end case;\n return jsonb_build_object('id',saved);","end case;\n\treturn jsonb_build_object ('id', saved);")));
 }
 if(mode==='uppercase-keywords'){
  const d=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
  await db.pg.exec(d.replace('insert into public.debate_comments','INSERT INTO PUBLIC.DEBATE_COMMENTS').replace('insert into public.debate_questions','INSERT INTO PUBLIC.DEBATE_QUESTIONS').replace(",status=case when body is distinct from p_data->>'body' then 'pending' else status end",",STATUS=CASE WHEN BODY IS DISTINCT FROM P_DATA->>'body' THEN 'pending' ELSE STATUS END"));
 }
 await db.pg.exec(crlf(await sql(portable)));await db.pg.exec(await sql(portable));
 assert.deepEqual((await db.pg.query('select * from public.debate_comments where id=$1',[before.id])).rows[0],before);
 const api=async(action,data,id=null)=>{const r=await handleDebateRequest(new Request('http://localhost/api/debates',{method:'POST',headers:{Authorization:'Bearer '+U.id,'Content-Type':'application/json'},body:JSON.stringify({action,id,data})}),db.createDb);return {status:r.status,data:await r.json()};};
 const comment=await api('comment',{debate_id:f.live,body:'تعليق مباشر بعد الإصلاح المحمول'});assert.equal(comment.status,200);assert.equal(comment.data.status,'approved');
 const reply=await api('comment',{debate_id:f.live,body:'رد مباشر مرتبط بالتعليق المنشور',parent_id:comment.data.id});assert.equal(reply.data.status,'approved');
 const full=await f.full(f.live),q=await api('question',{debate_id:f.live,body:'سؤال مجهول موجه قبل نشر التسجيل',participant_id:full.participants[0].id,axis:full.axes[0],anonymous:true});assert.equal(q.data.status,'approved');
 const publicQ=await db.client(null).rpc('debate_discussion',{p_debate:f.live,p_kind:'questions'});assert.equal(publicQ.error,null);const item=publicQ.data.items.find(i=>i.id===q.data.id);assert.equal(item.display_name,'مشارك');assert.equal('user_id'in item,false);assert.equal(item.participant_id,full.participants[0].id);
 const saved=(await db.pg.query('select * from public.debate_comments where id=$1',[comment.data.id])).rows[0];const hidden=await db.client(A.id).rpc('inline_editor_mutate',{p_action:'moderate',p_kind:'comments',p_id:saved.id,p_data:{status:'hidden',reason:'إخفاء تجريبي بعد النشر المباشر',updated_at:saved.updated_at}});assert.equal(hidden.error,null);
 const edited=await api('comment_edit',{body:'تعديل صاحب التعليق لا يعيد نشره'},saved.id);assert.equal(edited.data.status,'hidden');
 await f.update(f.live,{stage:'ended',recording_url:'https://www.youtube.com/watch?v=abcdefghijk',recording_published:true});const denied=await api('question',{debate_id:f.live,body:'سؤال بعد نشر التسجيل يجب أن يُرفض'});assert.equal(denied.status,409);assert.equal(denied.data.code,'questions_closed_after_recording');
 const vote=await api('vote',{debate_id:f.live,option_id:full.options[0].id},full.polls.find(p=>p.phase==='before').id);assert.equal(vote.status,409);assert.equal(vote.data.code,'poll_phase_changed');
 assert.equal((await db.client(U.id).rpc('debate_audience_mutate_pre_lifecycle',{p_action:'question',p_data:{}})).error.code,'42501');
});

test('portable repair preserves case-sensitive JSON keys by refusing a changed quoted body key',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await sql(lifecycle));const definition=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
 await db.pg.exec(definition.replace("values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body')","values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'BODY')"));
 await assert.rejects(db.pg.exec(await sql(portable)),/Review audience mutation fragment: comment_insert/);await db.pg.exec('rollback');
});

test('portable repair still rejects an unrecognized insert expression and rolls back all policy changes',async t=>{
 const db=await createInlineEditorTestDatabase();t.after(()=>db.close());await db.pg.exec(await sql(lifecycle));const definition=(await db.pg.query("select pg_get_functiondef('public.debate_audience_mutate_pre_lifecycle(text,uuid,jsonb)'::regprocedure) definition")).rows[0].definition;
 await db.pg.exec(definition.replace("values(d.id,u,(p_data->>'parent_id')::uuid,p_data->>'body')","values(d.id,u,(p_data->>'parent_id')::uuid,left(p_data->>'body',5000))"));
 await assert.rejects(db.pg.exec(await sql(portable)),/Review audience mutation fragment: comment_insert/);await db.pg.exec('rollback');
 const value=(await db.pg.query("select pg_get_expr(d.adbin,d.adrelid) value from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid='public.debate_comments'::regclass and a.attname='status'")).rows[0].value;assert.equal(value,"'pending'::text");
});
