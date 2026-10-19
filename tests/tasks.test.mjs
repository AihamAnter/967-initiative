import test from 'node:test';
import assert from 'node:assert/strict';
import {deadline,isOverdue,isOnTime,dayKey,calendarDays,filterTasks,taskMetrics,validateTask,dueLabel} from '../lib/tasks.js';
import {handleTaskRequest} from '../lib/taskApi.js';
import {createTaskTestDatabase,taskTestUsers} from './helpers/taskTestDatabase.mjs';
const A=taskTestUsers[0].id,B=taskTestUsers[1].id,C=taskTestUsers[2].id,actor={role:'admin',user:{id:A}},now=Date.parse('2026-10-21T12:00:00Z');
const task=(overrides={})=>({id:'a',title:'حلقة يامكان',description:'إنتاج الفيديو',status:'in_progress',priority:'normal',assigned_to:A,created_by:C,due_at:'2026-10-21T14:00:00Z',due_date:null,due_timezone:'Europe/Paris',created_at:'2026-10-20T10:00:00Z',updated_at:'2026-10-21T10:00:00Z',tags:['تصوير'],project_name:'الإنتاج الإعلامي',assignee_name:'أيهم',...overrides});
test('deadlines, all-day zones/DST, on-time completion and overdue stay separate from status',()=>{
 const allDay=task({due_at:null,due_date:'2026-03-29'});assert.equal(new Date(deadline(allDay)).toISOString(),'2026-03-29T22:00:00.000Z');
 assert.equal(isOverdue(allDay,Date.parse('2026-03-29T21:59:59Z')),false);assert.equal(isOverdue(allDay,Date.parse('2026-03-29T22:00:00Z')),true);
 assert.equal(isOnTime({...allDay,status:'completed',completed_at:'2026-03-29T22:00:00Z'}),false);
 assert.equal(isOverdue(task(),now),false);assert.equal(isOverdue(task({due_at:'2026-10-21T11:59:00Z'}),now),true);assert.equal(task().status,'in_progress');
 assert.equal(dueLabel(task({due_at:null}),now),'بلا موعد');assert.match(dueLabel(task({status:'completed',completed_at:'2026-10-21T13:00:00Z'}),now),/في الموعد/);
});
test('team-wide search, all scopes, archive separation, sorting, tags and calendar boundaries',()=>{
 const tasks=[task(),task({id:'b',title:'تحديث المنصة',assigned_to:B,priority:'urgent',due_at:'2026-10-20T12:00Z'}),task({id:'c',title:'مؤرشفة',archived_at:'2026-10-20T12:00Z'})];
 assert.equal(filterTasks(tasks,{},actor,now).length,2);assert.equal(filterTasks(tasks,{q:'تصوير'},actor,now).length,2);assert.equal(filterTasks(tasks,{q:'أيهم'},actor,now).length,2);
 assert.equal(filterTasks(tasks,{scope:'mine'},actor,now).length,1);assert.equal(filterTasks(tasks,{scope:'created'},actor,now).length,0);assert.equal(filterTasks(tasks,{scope:'overdue'},actor,now)[0].id,'b');
 assert.equal(filterTasks(tasks,{scope:'urgent'},actor,now)[0].id,'b');assert.equal(filterTasks(tasks,{archive:'1'},actor,now).length,1);assert.equal(filterTasks(tasks,{sort:'priority'},actor,now)[0].id,'b');
 assert.equal(filterTasks(tasks,{scope:'today',tz:'Europe/Paris'},actor,now).length,1);assert.equal(filterTasks(tasks,{scope:'week'},actor,now).length,1);assert.equal(filterTasks(tasks,{assignee:B},actor,now)[0].id,'b');
 assert.equal(calendarDays('2026-10-21').length,42);assert.equal(calendarDays('2026-10-21','week')[0],'2026-10-18');assert.equal(dayKey('2026-10-21T23:00Z','Asia/Aden'),'2026-10-22');
});
test('weekly metrics derive from actual dates and exclude archives/deletions, with explicit denominator',()=>{
 const tasks=[task(),task({id:'b',status:'completed',completed_at:'2026-10-20T12:00Z'}),task({id:'c',status:'completed',completed_at:'2026-10-21T11:00Z',due_at:'2026-10-20T12:00Z'}),task({id:'d',archived_at:'2026-10-20T12:00Z'}),task({id:'e',deleted_at:'2026-10-20T12:00Z'})];
 const m=taskMetrics(tasks,now,'Europe/Paris');assert.equal(m.total,3);assert.equal(m.completed,2);assert.equal(m.on_time_rate,50);assert.equal(m.completion_rate,67);assert.equal(m.weekly.created,3);assert.equal(m.weekly.completed,2);assert.equal(m.weekly.on_time,1);assert.equal(m.weekly.late,1);
 assert.equal(taskMetrics([],now).on_time_rate,null);
});
test('validation rejects field injection, unsafe URLs, impossible dates and invalid assignees',()=>{
 for(const data of [{title:''},{title:'x',assigned_to:'missing'},{title:'x',completed_by:A},{title:'x',links:['javascript:alert(1)']},{title:'x',links:['https://u:p@example.com']},{title:'x',due_date:'2026-02-30'},{title:'x',due_timezone:'bad'},{title:'x',estimated_minutes:-1}])assert.throws(()=>validateTask(data));
 assert.equal(validateTask({title:' عُدّل ',links:['https://github.com/AihamAnter/967-initiative']}).title,'عُدّل');
});
test('actual API handler + PostgreSQL: 401/403, CRUD, filters, comments, subtasks, archive, notifications, direct tampering',async()=>{
 const db=await createTaskTestDatabase();
 const request=(user,body,query='')=>new Request('http://127.0.0.1:3104/api/admin/tasks'+query,{method:body?'POST':'GET',headers:{...(user?{Authorization:'Bearer '+user}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const call=(user,body,query)=>handleTaskRequest(request(user,body,query),db.createDb);
 try{
  assert.equal((await call(null)).status,401);assert.equal((await call('invalid')).status,401);assert.equal((await call(taskTestUsers[3].id)).status,403);
  const foreign=new Request('http://127.0.0.1:3104/api/admin/tasks',{headers:{Authorization:'Bearer '+A,Origin:'https://foreign.example'}});assert.equal((await handleTaskRequest(foreign,db.createDb)).status,403);
  const created=await call(C,{action:'create',data:{title:'اختبار API',assigned_to:B,tags:['بحث']}});assert.equal(created.status,201);const {id}=await created.json();
  assert.equal((await call(A,{action:'update',id,revision:1,data:{title:'ممنوع'}})).status,403);
  assert.equal((await call(A,{action:'delete',id,revision:1})).status,403);
  assert.equal((await call(A,{action:'create',data:{title:'ممنوع',assigned_to:B}})).status,403);
  const all=await (await call(A,undefined,'?q=بحث')).json();assert.equal(all.tasks.length,1);assert.equal(all.tasks[0].assigned_to,B);assert.equal(all.tasks[0].can_edit,false);assert.equal(all.total,1);
  assert.equal((await call(A,{action:'comment_save',id,revision:1,data:{body:'تعليق من عضو آخر'}})).status,200);
  assert.equal((await call(B,{action:'subtask_save',id,revision:1,data:{title:'خطوة'}})).status,200);
  assert.equal((await call(B,{action:'update',id,revision:1,data:{priority:'urgent'}})).status,409);
  assert.equal((await call(B,{action:'update',id,revision:2,data:{priority:'urgent'}})).status,200);
  assert.equal((await call(B,{action:'status',id,revision:3,data:{status:'completed'}})).status,200);
  let detail=await (await call(A,undefined,'?id='+id)).json();assert.equal(detail.task.completed_by,B);assert.equal(detail.comments.length,1);assert.equal(detail.subtasks.length,1);assert.ok(detail.activity.length>3);
  assert.equal((await call(B,{action:'archive',id,revision:4})).status,200);
  assert.equal((await (await call(A)).json()).tasks.length,0);assert.equal((await (await call(A,undefined,'?archive=1')).json()).tasks.length,1);
  assert.equal((await call(B,{action:'restore',id,revision:5})).status,200);
  assert.equal((await call(B,{action:'read_notifications'})).status,200);
  const notifications=(await (await call(B)).json()).notifications;assert.ok(notifications.length);assert.ok(notifications.every(n=>n.read_at));
  assert.equal((await call(C,{action:'delete',id,revision:6})).status,200);assert.equal((await call(A,undefined,'?id='+id)).status,404);
  const response=await call(A);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
  for(let i=0;i<31;i++)assert.equal((await call(A,{action:'create',data:{title:'مهمة صفحة '+i}})).status,201);
  const first=await(await call(A)).json(),second=await(await call(A,undefined,'?page=2')).json();assert.equal(first.tasks.length,30);assert.equal(first.pages,2);assert.equal(second.tasks.length,1);assert.equal(second.page,2);
  const summary=await(await call(A,undefined,'?summary=1')).json();assert.equal(summary.summary.open,31);assert.equal(summary.tasks,undefined);
 }finally{await db.close();}
});
