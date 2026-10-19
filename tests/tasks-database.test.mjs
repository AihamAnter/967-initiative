import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-8ccc-cccccccccccc',outsider='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
test('task center: PostgreSQL RLS, triggers, atomic RPCs and immutable audit (isolated PGlite)',async t=>{
 const db=new PGlite();
 await db.exec(`create role anon nologin; create role authenticated nologin;
 create schema auth;
 create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 create table public.editors(user_id uuid primary key references auth.users(id),role text not null,added_at timestamptz default now());
 alter table public.editors enable row level security;
 create policy own_editor on public.editors for select to authenticated using(user_id=auth.uid());
 grant select on public.editors to authenticated;
 insert into auth.users(id,raw_user_meta_data) values ('${A}','{"full_name":"Admin A"}'),('${B}','{"full_name":"Admin B"}'),('${C}','{"full_name":"Management C"}'),('${outsider}','{}');
 insert into public.editors(user_id,role) values('${A}','admin'),('${B}','admin'),('${C}','management');`);
 await db.exec(await readFile(new URL('../supabase/task-center.sql',import.meta.url),'utf8'));
 const as=async(user,fn)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('set role '+(user===null?'anon':'authenticated'));try{return await fn();}finally{await db.exec('reset role');}};
 const sql=(text,params=[])=>db.query(text,params);
 const rpc=async(action,id=null,revision=null,data={})=>(await sql('select public.task_mutate($1,$2,$3,$4::jsonb) result',[action,id,revision,JSON.stringify(data)])).rows[0].result;
 const row=async id=>(await sql('select * from public.tasks where id=$1',[id])).rows[0];
 const denied=async(fn,code='42501')=>assert.rejects(fn,e=>e.code===code);
 let a,b,c,recurring,review;
 await t.test('create own tasks and management assignment; full team visibility and scoped team directory',async()=>{
  a=(await as(A,()=>rpc('create',null,null,{title:'مهمة A',due_at:'2020-01-01T10:00:00Z'}))).id;
  b=(await as(B,()=>rpc('create',null,null,{title:'مهمة B'}))).id;
  c=(await as(C,()=>rpc('create',null,null,{title:'مهمة C',assigned_to:C}))).id;
  for(const id of [A,B,C])await as(id,async()=>{assert.equal((await sql('select * from public.tasks')).rows.length,3);assert.equal((await sql('select * from public.task_team()')).rows.length,3);assert.ok((await sql('select * from public.task_activity')).rows.length>=3);});
  const assigned=await as(C,()=>rpc('create',null,null,{title:'أُسندت إلى A',assigned_to:A}));assert.equal((await row(assigned.id)).assigned_to,A);
  await as(A,()=>denied(()=>rpc('create',null,null,{title:'محاولة',assigned_to:B})));
  await as(A,()=>denied(()=>rpc('create',null,null,{title:'محاولة',assigned_to:outsider})));
  await as(C,()=>denied(()=>rpc('create',null,null,{title:'محاولة',assigned_to:outsider}),'23514'));
 });
 await t.test('anon and non-editor cannot read any task table or execute sensitive RPCs',async()=>{
  for(const table of ['tasks','task_projects','task_subtasks','task_comments','task_activity','task_notifications']){
   await as(null,()=>denied(()=>sql(`select * from public.${table}`)));
   await as(outsider,async()=>assert.equal((await sql(`select * from public.${table}`)).rows.length,0));
  }
  await as(null,()=>denied(()=>sql('select * from public.task_team()')));
  await as(outsider,()=>denied(()=>rpc('create',null,null,{title:'محاولة'})));
  await as(outsider,async()=>assert.equal((await sql('select * from public.task_team()')).rows.length,0));
 });
 await t.test('forged direct updates and RPCs cannot edit another member, reassign, escalate review or delete',async()=>{
  await as(A,async()=>{
   await denied(()=>rpc('update',b,1,{title:'ممنوع'}));
   assert.equal((await sql("update public.tasks set title='ممنوع' where id=$1 returning id",[b])).rows.length,0);
   await denied(()=>rpc('delete',a,1));
   await denied(()=>sql('delete from public.tasks where id=$1',[a]));
   await denied(()=>sql('update public.tasks set assigned_to=$1 where id=$2',[B,a]));
   await denied(()=>sql('update public.tasks set created_by=$1 where id=$2',[B,a]));
   await denied(()=>sql('update public.tasks set requires_review=true where id=$1',[a]));
   await denied(()=>sql("insert into public.tasks(title,created_by) values('محاولة',$1)",[B]));
   await denied(()=>rpc('update',a,1,{completed_by:B}),'22023');
  });
  assert.equal((await row(b)).title,'مهمة B');
 });
 await t.test('edit priority/deadline, record true completion identity/time, reopen without erasing history; CAS conflict',async()=>{
  await as(A,async()=>{
   await rpc('update',a,1,{priority:'urgent',due_at:null,due_date:'2030-01-01',due_timezone:'Asia/Aden'});
   let current=await row(a);assert.equal(current.priority,'urgent');assert.equal(current.revision,2);
   await rpc('status',a,2,{status:'completed'});current=await row(a);assert.equal(current.completed_by,A);assert.ok(current.completed_at);
   await denied(()=>sql("update public.tasks set completed_at='2000-01-01',completed_by=$1 where id=$2",[B,a]));assert.equal((await row(a)).completed_by,A);
   await rpc('status',a,(await row(a)).revision,{status:'in_progress'});assert.equal((await row(a)).completed_at,null);
   assert.equal((await sql("select * from public.task_activity where task_id=$1 and action='completed'",[a])).rows.length,1);
   assert.equal((await sql("select * from public.task_activity where task_id=$1 and action='reopened'",[a])).rows.length,1);
   await denied(()=>rpc('update',a,1,{title:'stale'}),'40001');
  });
 });
 await t.test('review-required completion cannot be bypassed by an admin; management can approve',async()=>{
  review=(await as(C,()=>rpc('create',null,null,{title:'مراجعة',assigned_to:A,requires_review:true}))).id;
  await as(A,async()=>{await denied(()=>rpc('status',review,1,{status:'completed'}));await rpc('status',review,1,{status:'in_review'});});
  await as(C,()=>rpc('status',review,2,{status:'completed'}));assert.equal((await row(review)).completed_by,C);
 });
 await t.test('subtasks create, edit, completion timestamp, order, permissions and parent revision',async()=>{
  await as(B,()=>rpc('subtask_save',b,1,{title:'خطوة',position:0}));
  const s=(await sql('select * from public.task_subtasks where task_id=$1',[b])).rows[0];
  await as(A,()=>denied(()=>rpc('subtask_save',b,2,{title:'ممنوع'})));
  await as(B,()=>rpc('subtask_save',b,2,{id:s.id,title:'خطوة معدلة',position:2,is_completed:true}));
  const completed=(await sql('select * from public.task_subtasks where id=$1',[s.id])).rows[0];assert.equal(completed.title,'خطوة معدلة');assert.ok(completed.completed_at);assert.equal(completed.position,2);
  await as(B,()=>rpc('subtask_delete',b,3,{id:s.id}));assert.equal((await sql('select * from public.task_subtasks where id=$1',[s.id])).rows.length,0);
 });
 await t.test('all editors comment on any task; only author/management moderate; audit cannot be edited',async()=>{
  for(const user of [A,B,C])await as(user,()=>rpc('comment_save',c,1,{body:'تعليق '+user}));
  const comment=(await sql('select * from public.task_comments where task_id=$1 and author_id=$2',[c,A])).rows[0];
  await as(B,()=>denied(()=>rpc('comment_save',c,1,{id:comment.id,body:'ممنوع'})));
  await as(A,()=>rpc('comment_save',c,1,{id:comment.id,body:'تعليق معدّل'}));assert.ok((await sql('select * from public.task_comments where id=$1',[comment.id])).rows[0].edited_at);
  await as(C,()=>rpc('comment_delete',c,1,{id:comment.id}));
  await as(A,async()=>{await denied(()=>sql("update public.task_activity set action='forged'"));await denied(()=>sql('delete from public.task_activity'));await denied(()=>sql("insert into public.task_activity(action) values('forged')"));});
  assert.ok((await sql("select * from public.task_activity where task_id=$1 and action='comment_update'",[c])).rows.length);
 });
 await t.test('event/reminder notifications persisted, de-duplicated, private and immutable except read state',async()=>{
  const timed=(await as(A,()=>rpc('create',null,null,{title:'متأخرة',due_at:'2020-01-01T00:00:00Z'}))).id;
  await as(A,async()=>{await sql('select public.task_refresh_reminders()');await sql('select public.task_refresh_reminders()');
   assert.equal((await sql("select * from public.task_notifications where task_id=$1 and kind='overdue'",[timed])).rows.length,1);
   assert.ok((await sql('select * from public.task_notifications')).rows.every(n=>n.user_id===A));
   await sql('update public.task_notifications set read_at=now()');
   await denied(()=>sql('update public.task_notifications set user_id=$1',[B]));
   await denied(()=>sql("insert into public.task_notifications(user_id,task_id,kind,dedupe_key) values($1,$2,'assignment','forged')",[B,timed]));
  });
 });
 await t.test('recurrence creates exactly one successor with reset steps, including competing requests and reopen/recomplete',async()=>{
  recurring=(await as(A,()=>rpc('create',null,null,{title:'دورية',recurrence:'monthly',due_date:'2030-01-31',due_timezone:'Europe/Paris'}))).id;
  await as(A,()=>rpc('subtask_save',recurring,1,{title:'خطوة متكررة'}));
  await as(A,async()=>{
   const results=await Promise.allSettled([rpc('status',recurring,2,{status:'completed'}),rpc('status',recurring,2,{status:'completed'})]);
   assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'40001');
   await rpc('status',recurring,3,{status:'in_progress'});await rpc('status',recurring,4,{status:'completed'});
  });
  const next=(await sql('select * from public.tasks where recurrence_of=$1',[recurring])).rows;assert.equal(next.length,1);assert.equal(new Date(next[0].due_date).toISOString().slice(0,10),'2030-02-28');assert.equal(next[0].status,'not_started');
  const steps=(await sql('select * from public.task_subtasks where task_id=$1',[next[0].id])).rows;assert.equal(steps.length,1);assert.equal(steps[0].completed_at,null);
 });
 await t.test('archive and restore retain task/activity, soft deletion is management-only and retains tombstone audit',async()=>{
  await as(A,async()=>{await rpc('archive',recurring,5);assert.ok((await row(recurring)).archived_at);await rpc('restore',recurring,6);assert.equal((await row(recurring)).archived_at,null);});
  await as(C,()=>rpc('delete',c,1));assert.ok((await row(c)).deleted_at);
  await as(A,async()=>{assert.equal(await row(c),undefined);assert.ok((await sql('select * from public.task_activity where task_id=$1',[c])).rows.length);});
 });
 await t.test('constraints reject invalid dates, timezones, external links, inactive projects, duplicate successors',async()=>{
  await as(A,async()=>{
   for(const payload of [{due_timezone:'Invalid/Zone'},{due_at:'2030-01-01',due_date:'2030-01-01'},{links:['javascript:alert(1)']},{links:['https://user:pass@example.com']},{start_at:'2031-01-01',due_at:'2030-01-01'}])await denied(()=>rpc('create',null,null,{title:'invalid',...payload}),'23514');
  });
  const p=(await as(C,()=>rpc('project_save',null,null,{name:'مشروع خاص'}))).id;
  const project=(await sql('select * from public.task_projects where id=$1',[p])).rows[0];
  await as(C,()=>rpc('project_save',p,null,{name:'مشروع موقوف',is_active:false,updated_at:project.updated_at}));
  await as(A,()=>denied(()=>rpc('create',null,null,{title:'invalid',project_id:p}),'23514'));
  await as(A,()=>denied(()=>sql('insert into public.tasks(title,recurrence_of) values($1,$2)',['forged',recurring])));
  const active=(await as(C,()=>rpc('project_save',null,null,{name:'دورية مشروع'}))).id;
  const linked=(await as(A,()=>rpc('create',null,null,{title:'دورية مرتبطة',project_id:active,recurrence:'weekly'}))).id;
  const activeRow=(await sql('select * from public.task_projects where id=$1',[active])).rows[0];await as(C,()=>rpc('project_save',active,null,{name:activeRow.name,is_active:false,updated_at:activeRow.updated_at}));
  await as(A,()=>rpc('status',linked,1,{status:'completed'}));assert.equal((await sql('select project_id from public.tasks where recurrence_of=$1',[linked])).rows[0].project_id,active);
 });
 await t.test('date-only deadlines use next midnight in stored zone and account for DST',async()=>{
  const result=await sql("select public.task_deadline(null,'2026-03-29','Europe/Paris') as due");assert.equal(new Date(result.rows[0].due).toISOString(),'2026-03-29T22:00:00.000Z');
 });
 await db.close();
});
