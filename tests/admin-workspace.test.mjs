import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTaskTestDatabase,taskTestUsers} from './helpers/taskTestDatabase.mjs';
import {adminList,ADMIN_TAB_IDS} from '../lib/adminLists.js';
import {validateEditorDraft,serializeEditorValue} from '../lib/editorDrafts.js';
import {taskMetrics} from '../lib/tasks.js';
import {uploadAdminMedia} from '../lib/adminUpload.js';

const [A,B,C,D]=taskTestUsers.map(user=>user.id);
test('editor lists search Arabic, retain every matching row through pagination and keep publication filters distinct',()=>{
 assert.ok(ADMIN_TAB_IDS.includes('messages'));assert.ok(ADMIN_TAB_IDS.includes('settings'));assert.ok(ADMIN_TAB_IDS.includes('admins'));assert.equal(ADMIN_TAB_IDS.includes('unknown'),false);
 const rows=Array.from({length:31},(_,index)=>({id:String(index),name:'شركة اليمن '+index,category:index%2?'غذاء':'صناعة',is_published:index%2===0,updated_at:new Date(1700000000000+index*1000).toISOString()}));
 const first=adminList(rows,{q:'اليمن',size:12}),last=adminList(rows,{page:3,size:12});assert.equal(first.total,31);assert.equal(first.pages,3);assert.equal(last.items.length,7);
 assert.equal(new Set([...first.items,...adminList(rows,{page:2}).items,...last.items].map(row=>row.id)).size,31);
 assert.equal(adminList(rows,{publication:'published'}).total,16);assert.equal(adminList(rows,{category:'غذاء'}).total,15);assert.equal(adminList(rows,{q:'غير موجود'}).total,0);assert.equal(adminList(rows,{page:100}).page,3);
 assert.equal(adminList([{id:'unit',name:'السكان',unit:'نسمة'}],{q:'نسمة'}).total,1);assert.equal(adminList(rows,{page:1.5}).page,1);
});
test('private editor drafts reject unsupported types, invalid keys and oversized values',()=>{
 assert.deepEqual(validateEditorDraft({kind:'company',key:'company:new',value:{data:{name:'شركة'}}}),{kind:'company',key:'company:new',value:{data:{name:'شركة'}}});
 for(const input of [{kind:'admin',key:'x',value:{}},{kind:'company',key:'../x',value:{}},{kind:'company',key:'x',value:[]},{kind:'company',key:'x',value:{x:'x'.repeat(220001)}}])assert.throws(()=>validateEditorDraft(input));
});
test('draft comparisons ignore PostgreSQL JSON object key ordering while preserving array order and value types',()=>{
 assert.equal(serializeEditorValue({b:2,a:{z:1,x:[1,2]}}),serializeEditorValue({a:{x:[1,2],z:1},b:2}));
 assert.notEqual(serializeEditorValue({a:[1,2]}),serializeEditorValue({a:[2,1]}));assert.notEqual(serializeEditorValue({a:1}),serializeEditorValue({a:'1'}));
});
test('upload progress uses the validated media type and reaches 100 only after Storage confirms success',async()=>{
 const previousXHR=globalThis.XMLHttpRequest,previousWindow=globalThis.window,oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,events=[],requests=[];
 globalThis.window={dispatchEvent:event=>events.push(event.detail)};process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='local-test-key';
 globalThis.XMLHttpRequest=class{constructor(){this.upload={};this.headers={};requests.push(this);}open(method,url){this.method=method;this.url=url;}setRequestHeader(key,value){this.headers[key]=value;}send(){this.upload.onprogress({lengthComputable:true,loaded:5,total:10});queueMicrotask(()=>{this.status=201;this.onload();});}};
 try{const url='https://local.invalid/storage/v1/object/public/media/photo.png',db={auth:{getSession:async()=>({data:{session:{access_token:'local-fixture'}}})},storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:url}})})}};
  assert.equal(await uploadAdminMedia(db,{name:'photo.png',type:'text/html'},'photo.png','image/png'),url);
  assert.equal(requests[0].headers['Content-Type'],'image/png');assert.equal(requests[0].url,'https://local.invalid/storage/v1/object/media/photo.png');assert.deepEqual(events.map(event=>event.percent),[0,50,100]);
  await assert.rejects(()=>uploadAdminMedia(db,{name:'evil.html'},'evil.html','text/html'));assert.equal(requests.length,1);
 }finally{globalThis.XMLHttpRequest=previousXHR;globalThis.window=previousWindow;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;}
});
test('24-hour task archiving is bounded, idempotent, audited, private and reversible; private drafts and message workflow use real PostgreSQL',async t=>{
 const fixture=await createTaskTestDatabase(),{pg,run}=fixture;
 const migration=name=>readFile(new URL('../supabase/archive/legacy-migrations/'+name,import.meta.url),'utf8');
 await pg.exec(await migration('202610250001_editor_workspace.sql'));
 await pg.exec(`create table public.messages(id uuid primary key default gen_random_uuid(),name text not null,email text not null,type text not null,message text not null,status text not null default 'new',created_at timestamptz default clock_timestamp());alter table public.messages enable row level security;grant select on public.messages to authenticated;`);
 await pg.exec(await migration('202610250003_message_workspace.sql'));
 const rpc=(user,action,id=null,revision=null,data={})=>run(user,'select public.task_mutate($1,$2,$3,$4::jsonb) result',[action,id,revision,JSON.stringify(data)]).then(result=>result.rows[0].result);
 const row=id=>pg.query('select * from public.tasks where id=$1',[id]).then(result=>result.rows[0]);
 const archive=user=>run(user,'select public.task_archive_completed() n').then(result=>result.rows[0].n);
 let eligible,reopened;
 await t.test('recent completions stay active; older completions alone move to archive once',async()=>{
  eligible=(await rpc(A,'create',null,null,{title:'مكتملة قديمة'})).id;reopened=(await rpc(A,'create',null,null,{title:'أُعيد فتحها'})).id;
  const recent=(await rpc(B,'create',null,null,{title:'مكتملة حديثة'})).id;
  for(const [user,id]of [[A,eligible],[A,reopened],[B,recent]])await rpc(user,'status',id,1,{status:'completed'});
  await rpc(A,'status',reopened,2,{status:'in_progress'});
  // Set a precise clock boundary in the isolated database; no real tasks touched.
  await pg.exec('alter table public.tasks disable trigger task_guard;alter table public.tasks disable trigger task_schedule_auto_archive;alter table public.tasks disable trigger task_audit;');
  await pg.query("update public.tasks set completed_at=clock_timestamp()-interval '24 hours 1 second',auto_archive_at=clock_timestamp()-interval '1 second' where id=$1",[eligible]);
  await pg.exec('alter table public.tasks enable trigger task_guard;alter table public.tasks enable trigger task_schedule_auto_archive;alter table public.tasks enable trigger task_audit;');
  assert.equal(await archive(A),1);assert.equal(await archive(B),0);
  assert.ok((await row(eligible)).archived_at);assert.equal((await row(recent)).archived_at,null);assert.equal((await row(reopened)).archived_at,null);
  assert.equal((await row(eligible)).auto_archived,true);
  const audit=(await pg.query("select * from public.task_activity where task_id=$1 and action='auto_archived'",[eligible])).rows;assert.equal(audit.length,1);assert.equal(audit[0].actor_id,null);
  assert.equal((await run(A,'select auth.uid() id')).rows[0].id,A);
 });
 await t.test('restoring starts a new 24-hour grace period, reopening clears the schedule, outsiders cannot run maintenance',async()=>{
  const current=await row(eligible);await rpc(A,'restore',eligible,Number(current.revision));assert.equal((await row(eligible)).archived_at,null);assert.ok(Date.parse((await row(eligible)).auto_archive_at)>Date.now()+23*3600000);assert.equal(await archive(C),0);
  await rpc(A,'status',eligible,Number((await row(eligible)).revision),{status:'in_progress'});assert.equal((await row(eligible)).auto_archive_at,null);
  await assert.rejects(()=>archive(D),error=>error.code==='42501');await assert.rejects(()=>archive(null),error=>error.code==='42501');
 });
 await t.test('drafts are private to their owner and stale saves cannot overwrite another tab',async()=>{
  const save=(user,rev,data)=>run(user,'select public.editor_save_draft($1,$2,$3::jsonb,$4) draft',['company','company:new',JSON.stringify({data}),rev]);
  const first=(await save(A,null,{name:'مسودة خاصة'})).rows[0].draft;assert.equal(Number(first.revision),1);
  assert.equal((await run(B,'select * from public.editor_drafts')).rows.length,0);assert.equal((await run(D,'select * from public.editor_drafts')).rows.length,0);
  await save(A,1,{name:'نسخة أحدث'});await assert.rejects(()=>save(A,1,{name:'قديمة'}),error=>error.code==='40001');await assert.rejects(()=>save(D,null,{}),error=>error.code==='42501');
  assert.equal((await run(A,'select value from public.editor_drafts')).rows[0].value.data.name,'نسخة أحدث');
  await run(B,'select public.editor_delete_draft($1,$2)',['company:new',2]);assert.equal((await run(A,'select value from public.editor_drafts')).rows.length,1);
  await assert.rejects(()=>run(A,'select public.editor_delete_draft($1,$2)',['company:new',1]),error=>error.code==='40001');
  await run(A,'select public.editor_delete_draft($1,$2)',['company:new',2]);assert.equal((await run(A,'select value from public.editor_drafts')).rows.length,0);
 });
 await t.test('messages beyond 100 remain searchable and follow-ups create one linked task without rewriting sender text',async()=>{
  for(let index=0;index<105;index++)await pg.query("insert into public.messages(name,email,type,message) values($1,'sender@example.test','تصحيح معلومة',$2)",['مرسل '+index,'طلب '+index]);
  const all=(await run(A,"select public.editor_messages('{}') result")).rows[0].result;assert.equal(all.total,105);assert.equal(all.messages.length,20);
  const search=(await run(A,'select public.editor_messages($1::jsonb) result',[JSON.stringify({q:'طلب 104'})])).rows[0].result;assert.equal(search.messages.length,1);
  const id=search.messages[0].id,update=(revision,data)=>run(A,'select public.editor_message_update($1,$2,$3::jsonb) result',[id,revision,JSON.stringify(data)]);
  const saved=(await update(0,{assigned_to:A,notes:'متابعة داخلية',status:'in_progress',create_task:true})).rows[0].result;assert.ok(saved.task_id);
  await assert.rejects(()=>update(0,{notes:'نسخة قديمة',create_task:true}),error=>error.code==='40001');
  const again=(await update(1,{notes:'متابعة ثانية',create_task:true})).rows[0].result;assert.equal(again.task_id,saved.task_id);
  await assert.rejects(()=>update(2,{email:'rewrite@example.test'}),error=>error.code==='22023');
  assert.equal((await pg.query('select message,email from public.messages where id=$1',[id])).rows[0].message,'طلب 104');
  assert.equal((await run(D,'select * from public.message_followups')).rows.length,0);await assert.rejects(()=>run(D,"select public.editor_messages('{}')"),error=>error.code==='42501');
 });
 await t.test('message date filters follow the editor timezone through a 23-hour DST day',async()=>{
  for(const date of ['2026-03-28T23:30:00Z','2026-03-29T21:59:00Z','2026-03-29T22:00:00Z'])await pg.query("insert into public.messages(name,email,type,message,created_at) values('حد زمني','date@example.test','تصحيح معلومة','حد زمني',$1)",[date]);
  const result=(await run(A,'select public.editor_messages($1::jsonb) result',[JSON.stringify({from:'2026-03-29',to:'2026-03-29',tz:'Europe/Paris'})])).rows[0].result;
  assert.equal(result.total,2);assert.equal(result.messages.length,2);
 });
 await pg.close();
});
test('automatic archiving keeps the weekly completion record while removing the task from active counts',()=>{
 const now=Date.parse('2026-10-22T12:00:00Z'),task={id:'one',status:'completed',completed_at:'2026-10-20T12:00:00Z',created_at:'2026-10-19T12:00:00Z',archived_at:'2026-10-21T12:00:00Z',auto_archived:true,due_at:null,due_date:null};
 const metrics=taskMetrics([task],now,'UTC');assert.equal(metrics.total,0);assert.equal(metrics.weekly.completed,1);assert.equal(metrics.weekly.created,1);
});
