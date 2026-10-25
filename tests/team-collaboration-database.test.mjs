import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeamUpgradeDatabase,teamUpgradeUsers} from './helpers/teamUpgradeDatabase.mjs';
const [a,b,manager,guest,c,d]=teamUpgradeUsers.map(u=>u.id);
const fails=(promise,code)=>assert.rejects(promise,e=>e.code===code);

test('legacy tasks, membership, recurrence, review, threaded comments and RLS remain consistent',async()=>{
 const db=await createTeamUpgradeDatabase();
 try{
  const legacy=await db.mutate(a,'create',null,null,{title:'مهمة قديمة',assigned_to:a});
  assert.equal((await db.task(legacy.id)).assigned_to,a);
  assert.equal((await db.pg.query('select count(*)::int n from public.task_members')).rows[0].n,0);
  const created=await db.mutate(manager,'create',null,null,{title:'مهمة مشتركة',assigned_to:a,participant_ids:[b,c,d],recurrence:'weekly',requires_review:true});
  let t=await db.task(created.id);assert.equal(t.assigned_to,a);
  assert.equal((await db.pg.query('select count(*)::int n from public.task_members where task_id=$1',[t.id])).rows[0].n,3);
  await fails(db.mutate(b,'update',t.id,t.revision,{title:'محاولة غير مخولة'}),'42501');
  await fails(db.mutate(b,'members',t.id,t.revision,{participant_ids:[]}),'42501');
  await fails(db.mutate(manager,'members',t.id,t.revision,{participant_ids:[b,b]}),'23514');
  await fails(db.mutate(manager,'members',t.id,t.revision,{participant_ids:[guest]}),'23514');
  await db.mutate(a,'subtask_save',t.id,t.revision,{title:'خطوة مشتركة'});t=await db.task(t.id);
  const step=(await db.pg.query('select * from public.task_subtasks where task_id=$1',[t.id])).rows[0];
  await db.mutate(b,'subtask_complete',t.id,t.revision,{id:step.id,is_completed:true});
  await fails(db.run(b,'update public.task_subtasks set title=$1 where id=$2',['تغيير غير مسموح',step.id]),'42501');
  t=await db.task(t.id);await fails(db.mutate(a,'status',t.id,t.revision,{status:'completed'}),'42501');
  const root=await db.mutate(b,'comment_save',t.id,t.revision,{body:'تعليق أصلي'});
  const reply=await db.mutate(c,'comment_save',t.id,t.revision,{body:'رد أول',parent_id:root.comment_id,mention_ids:[d]});
  await db.mutate(d,'comment_save',t.id,t.revision,{body:'رد على رد',parent_id:reply.comment_id});
  await fails(db.mutate(b,'comment_save',legacy.id,1,{body:'ربط مديرية مختلفة',parent_id:root.comment_id}),'23514');
  await fails(db.mutate(a,'comment_save',t.id,t.revision,{id:reply.comment_id,comment_revision:1,body:'ليس تعليقي'}),'42501');
  await db.mutate(c,'comment_save',t.id,t.revision,{id:reply.comment_id,comment_revision:1,body:'رد محرر',mention_ids:[d]});
  await fails(db.mutate(c,'comment_save',t.id,t.revision,{id:reply.comment_id,comment_revision:1,body:'نسخة قديمة'}),'40001');
  await fails(db.run(c,'select public.task_mutate_legacy($1,$2,$3,$4::jsonb)',['comment_save',t.id,t.revision,JSON.stringify({id:reply.comment_id,body:'تجاوز نسخة التعليق'})]),'40001');
  await db.mutate(b,'comment_delete',t.id,t.revision,{id:root.comment_id,comment_revision:1});
  assert.equal((await db.pg.query('select count(*)::int n from public.task_comments where task_id=$1',[t.id])).rows[0].n,3);
  assert.ok((await db.pg.query('select deleted_at from public.task_comments where id=$1',[root.comment_id])).rows[0].deleted_at);
  assert.ok((await db.pg.query("select 1 from public.task_notifications where user_id=$1 and kind='reply'",[b])).rows.length);
  assert.ok((await db.pg.query("select 1 from public.task_notifications where user_id=$1 and kind='mention'",[d])).rows.length);
  await db.mutate(manager,'update',t.id,t.revision,{assigned_to:b,participant_ids:[a,c,d],status:'completed'});t=await db.task(t.id);
  const successor=(await db.pg.query('select * from public.tasks where recurrence_of=$1',[t.id])).rows[0];assert.ok(successor);assert.equal(successor.assigned_to,b);
  assert.deepEqual((await db.pg.query('select user_id from public.task_members where task_id=$1 order by user_id',[successor.id])).rows.map(x=>x.user_id),[c,d,a].sort());
  await db.mutate(manager,'status',t.id,t.revision,{status:'in_progress'});t=await db.task(t.id);await db.mutate(manager,'status',t.id,t.revision,{status:'completed'});t=await db.task(t.id);
  assert.equal((await db.pg.query('select count(*)::int n from public.tasks where recurrence_of=$1',[t.id])).rows[0].n,1);
  await db.mutate(manager,'archive',t.id,t.revision);t=await db.task(t.id);assert.ok(t.archived_at);await db.mutate(manager,'restore',t.id,t.revision);t=await db.task(t.id);assert.equal(t.archived_at,null);assert.ok(t.auto_archive_at);
  assert.equal((await db.run(guest,'select * from public.task_members')).rows.length,0);
  await fails(db.run(null,'select * from public.tasks'),'42501');
 }finally{await db.close();}
});

test('member removal revokes step access, stale membership edits conflict, and notifications avoid self-noise',async()=>{
 const db=await createTeamUpgradeDatabase();try{
  const created=await db.mutate(manager,'create',null,null,{title:'مهمة التنبيهات',assigned_to:a,participant_ids:[b,c],due_at:new Date(Date.now()+3600000).toISOString()});let t=await db.task(created.id);
  await db.mutate(a,'subtask_save',t.id,t.revision,{title:'خطوة'});t=await db.task(t.id);const step=(await db.pg.query('select id from public.task_subtasks where task_id=$1',[t.id])).rows[0];
  const revision=t.revision;await db.mutate(manager,'members',t.id,revision,{participant_ids:[c]});t=await db.task(t.id);
  await fails(db.mutate(manager,'members',t.id,revision,{participant_ids:[b,c]}),'40001');
  await fails(db.mutate(b,'subtask_complete',t.id,t.revision,{id:step.id,is_completed:true}),'42501');
  assert.equal((await db.pg.query("select count(*)::int n from public.task_notifications where user_id=$1 and task_id=$2 and kind='unassigned'",[b,t.id])).rows[0].n,1);
  for(let i=0;i<4;i++)await db.mutate(a,'comment_save',t.id,t.revision,{body:'تحديث محلي '+i});
  assert.equal((await db.pg.query("select count(*)::int n from public.task_notifications where user_id=$1 and task_id=$2 and kind='comment'",[c,t.id])).rows[0].n,1);
  assert.equal((await db.pg.query("select count(*)::int n from public.task_notifications where user_id=$1 and task_id=$2 and kind='comment'",[a,t.id])).rows[0].n,0);
  await db.run(c,'select public.task_refresh_reminders()');assert.equal((await db.pg.query("select count(*)::int n from public.task_notifications where user_id=$1 and task_id=$2 and kind='due_soon'",[c,t.id])).rows[0].n,1);
  const own=await db.mutate(a,'create',null,null,{title:'إجراء شخصي'});assert.equal((await db.pg.query("select count(*)::int n from public.task_notifications where task_id=$1 and kind='assignment'",[own.id])).rows[0].n,0);
 }finally{await db.close();}
});
