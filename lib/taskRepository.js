import {fetchAllRows} from './pagination.js';
import {filterTasks,taskMetrics,validTimeZone,isOverdue,dueDay,dayKey,validateTask,UUID,taskCanEdit,taskIsParticipant,taskCanCompleteStep,TASK_STATUSES} from './tasks.js';
import {RequestValidationError} from './requestSecurity.js';

export function taskDbError(error){
 if(!error)return;
 const code=error.code;
 const status=code==='42501'?403:code==='40001'||code==='23505'?409:code==='P0002'?404:/^(22|23)/.test(code||'')?400:503;
 const message={403:'لا تملك صلاحية تنفيذ هذه العملية.',409:'تغيرت البيانات في جلسة أخرى. أعد تحميل المحفوظ قبل المحاولة.',404:'المهمة أو العنصر غير موجود.',400:'تحقق من الحقول والمسؤول والمشروع والمواعيد والروابط.',503:'تعذر الاتصال بمركز المهام. تأكد من تطبيق Migration الخاصة به.'}[status];
 throw new RequestValidationError(message,status);
}
async function rows(db,table,columns='*',configure=q=>q){
 try{return await fetchAllRows(()=>configure(db.from(table).select(columns,{count:'exact'})).order('id'));}
 catch{throw new RequestValidationError('تعذر تحميل مركز المهام. تأكد من تطبيق Migration الخاصة به.',503);}
}
async function taskMembers(db,id){
 try{return await fetchAllRows(()=>{let q=db.from('task_members').select('task_id,user_id',{count:'exact'});if(id)q=q.eq('task_id',id);return q.order('task_id').order('user_id');});}
 catch{throw new RequestValidationError('يلزم تطبيق ترحيل تعاون المهام قبل استخدام النسخة الجديدة. لم تتغير المهام الحالية.',503);}
}
const participantMap=members=>{const map=new Map();for(const row of members){if(!map.has(row.task_id))map.set(row.task_id,[]);map.get(row.task_id).push(row.user_id);}return map;};
export async function readTaskWorkspace(db,actor,params,now=Date.now()){
 const filters=Object.fromEntries(params),tz=validTimeZone(filters.tz)?filters.tz:'UTC';
 if(filters.summary==='1'){
  const [items,members]=await Promise.all([rows(db,'tasks','id,assigned_to,status,due_at,due_date,due_timezone,archived_at,deleted_at'),taskMembers(db)]),map=participantMap(members),tasks=items.map(t=>({...t,participant_ids:map.get(t.id)||[]}));
  return {summary:{mine_today:tasks.filter(t=>!t.archived_at&&taskIsParticipant(t,actor.user.id)&&dueDay(t,tz)===dayKey(now,tz)&&!['completed','cancelled'].includes(t.status)).length,overdue:tasks.filter(t=>isOverdue(t,now)).length,open:tasks.filter(t=>!t.archived_at&&!['completed','cancelled'].includes(t.status)).length}};
 }
 const [teamResult,projects,tasks,subtasks,notifications,memberships]=await Promise.all([
  db.rpc('task_team'),rows(db,'task_projects'),rows(db,'tasks'),rows(db,'task_subtasks','id,task_id,is_completed'),
  db.from('task_notifications').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(100),
  taskMembers(db),
 ]);
 taskDbError(teamResult.error);taskDbError(notifications.error);
 projects.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
 const members=teamResult.data||[],names=new Map(members.map(m=>[m.user_id,m.display_name])),projectNames=new Map(projects.map(p=>[p.id,p.name]));
 const counts=new Map();for(const s of subtasks){const c=counts.get(s.task_id)||{total:0,completed:0};c.total++;if(s.is_completed)c.completed++;counts.set(s.task_id,c);}
 const memberMap=participantMap(memberships);
 const enriched=tasks.map(t=>{const ids=memberMap.get(t.id)||[];return {...t,participant_ids:ids,participant_names:ids.map(id=>names.get(id)||'عضو سابق'),project_name:projectNames.get(t.project_id)||'غير مصنف',assignee_name:names.get(t.assigned_to)||'عضو سابق',subtasks:counts.get(t.id)||{total:0,completed:0},can_edit:taskCanEdit(t,actor)};});
 const personal=enriched.filter(t=>!t.archived_at&&taskIsParticipant(t,actor.user.id)&&!['completed','cancelled'].includes(t.status));
 const taskTitles=new Map(enriched.map(t=>[t.id,t.title]));
 const focus=[...personal].sort((a,b)=>Number(isOverdue(b,now))-Number(isOverdue(a,now))||Number(dueDay(b,tz)===dayKey(now,tz))-Number(dueDay(a,tz)===dayKey(now,tz))||a.id.localeCompare(b.id)).slice(0,4);
 const matched=filterTasks(enriched,filters,actor,now),size=filters.view==='calendar'?300:30,page=Math.max(1,Math.min(Math.ceil(matched.length/size)||1,parseInt(filters.page,10)||1));
 const upcoming=filterTasks(enriched,{scope:'week',tz},actor,now).filter(t=>!['completed','cancelled'].includes(t.status));
 return {actor:{id:actor.user.id,role:actor.role},members,projects,tasks:matched.slice((page-1)*size,page*size),total:matched.length,page,pages:Math.ceil(matched.length/size),metrics:taskMetrics(enriched,now,tz),focus,personal:{open:personal.length,today:personal.filter(t=>dueDay(t,tz)===dayKey(now,tz)).length,overdue:personal.filter(t=>isOverdue(t,now)).length,participating:personal.filter(t=>t.participant_ids.includes(actor.user.id)).length},overdue:enriched.filter(t=>isOverdue(t,now)).slice(0,6),upcoming:upcoming.slice(0,6),notifications:(notifications.data||[]).map(n=>({...n,task_title:taskTitles.get(n.task_id)||'مهمة لم تعد متاحة',task_available:taskTitles.has(n.task_id)})),summary:{mine_today:personal.filter(t=>dueDay(t,tz)===dayKey(now,tz)).length,overdue:enriched.filter(t=>isOverdue(t,now)).length,open:enriched.filter(t=>!t.archived_at&&!['completed','cancelled'].includes(t.status)).length},server_time:new Date(now).toISOString()};
}
export async function readTaskDetail(db,id){
 if(!UUID.test(id))throw new RequestValidationError('معرّف المهمة غير صالح.');
 const result=await db.from('tasks').select('*').eq('id',id).maybeSingle();taskDbError(result.error);
 if(!result.data)throw new RequestValidationError('المهمة غير موجودة.',404);
 const [subtasks,comments,activity,members]=await Promise.all([
  rows(db,'task_subtasks','*',q=>q.eq('task_id',id)),rows(db,'task_comments','*',q=>q.eq('task_id',id)),rows(db,'task_activity','*',q=>q.eq('task_id',id)),
  taskMembers(db,id),
 ]);
 return {task:{...result.data,participant_ids:members.map(row=>row.user_id)},subtasks:subtasks.sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)),comments:comments.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)),activity:activity.sort((a,b)=>b.created_at.localeCompare(a.created_at)||Number(b.id)-Number(a.id))};
}
export async function mutateTask(db,actor,body){
 const {action,id=null,revision=null}=body;let data=body.data??{};
 if(id!==null&&!UUID.test(id)||revision!==null&&(!Number.isSafeInteger(revision)||revision<1)||!data||typeof data!=='object'||Array.isArray(data))throw new RequestValidationError('طلب غير صالح.');
 if(['create','update'].includes(action))data=validateTask(data,{partial:action==='update'});
 if(['update','status','archive','restore','delete','members','subtask_complete','subtask_save','subtask_delete','comment_save','comment_delete'].includes(action)){
  if(!id||!revision)throw new RequestValidationError('معرّف المهمة ونسختها مطلوبان.');
  const current=await db.from('tasks').select('*').eq('id',id).maybeSingle();taskDbError(current.error);
  if(!current.data)throw new RequestValidationError('المهمة غير موجودة.',404);
  if(action==='subtask_complete'){const members=await taskMembers(db,id);if(!taskCanCompleteStep({...current.data,participant_ids:members.map(m=>m.user_id)},actor))throw new RequestValidationError('لا يمكنك تحديث خطوات هذه المهمة.',403);}
  else if(!action.startsWith('comment_')&&!taskCanEdit(current.data,actor))throw new RequestValidationError('لا يمكنك تعديل مهام الآخرين.',403);
 }
 if(action==='create'&&actor.role==='admin'&&data.assigned_to&&data.assigned_to!==actor.user.id||action==='delete'&&actor.role!=='management'||action==='project_save'&&actor.role!=='management')throw new RequestValidationError('هذه العملية متاحة للإدارة فقط.',403);
 if(action==='status'&&!Object.hasOwn(TASK_STATUSES,data.status))throw new RequestValidationError('حالة المهمة غير صالحة.');
 if(action==='project_save'&&(typeof data.name!=='string'||!data.name.trim()||data.name.length>120))throw new RequestValidationError('اسم المشروع مطلوب بحد أقصى 120 حرفاً.');
 if(action==='project_save')data={...data,name:data.name.trim()};
 if(action==='comment_save'&&(typeof data.body!=='string'||!data.body.trim()||data.body.length>5000))throw new RequestValidationError('اكتب تعليقاً من 1 إلى 5000 حرف.');
 if((action==='members'||Object.hasOwn(data,'participant_ids'))&&actor.role!=='management')throw new RequestValidationError('تغيير أعضاء المهمة متاح للإدارة فقط.',403);
 if(action==='members')validateTask({participant_ids:data.participant_ids},{partial:true});
 if(action==='subtask_complete'&&(!UUID.test(data.id||'')||typeof data.is_completed!=='boolean'||Object.keys(data).some(k=>!['id','is_completed'].includes(k))))throw new RequestValidationError('حدّد خطوة وحالة إنجاز صحيحة.');
 if(action.startsWith('comment_')){
  if(data.id&&(!Number.isSafeInteger(data.comment_revision)||data.comment_revision<1))throw new RequestValidationError('حمّل نسخة التعليق قبل تغييره.');
  if(data.parent_id!==undefined&&data.parent_id!==null&&(!UUID.test(data.parent_id)||data.id))throw new RequestValidationError('مرجع الرد غير صالح.');
  if(data.mention_ids!==undefined&&(!Array.isArray(data.mention_ids)||data.mention_ids.length>20||data.mention_ids.some(id=>!UUID.test(id))||new Set(data.mention_ids).size!==data.mention_ids.length))throw new RequestValidationError('الإشارات إلى الأعضاء غير صالحة.');
  if(action==='comment_delete'&&!data.id)throw new RequestValidationError('اختر التعليق الذي تريد حذفه.');
 }
 if(action==='subtask_save'&&data.title!==undefined&&(typeof data.title!=='string'||!data.title.trim()||data.title.length>250))throw new RequestValidationError('عنوان الخطوة مطلوب بحد أقصى 250 حرفاً.');
 if(['comment_save','comment_delete','subtask_save','subtask_delete'].includes(action)&&data.id!==undefined&&!UUID.test(data.id))throw new RequestValidationError('معرّف العنصر غير صالح.');
 if(action==='reminders'){const result=await db.rpc('task_refresh_reminders');taskDbError(result.error);return {ok:true};}
 if(action==='read_notifications'){
  let query=db.from('task_notifications').update({read_at:new Date().toISOString()}).eq('user_id',actor.user.id).is('read_at',null);
  if(data.id!==undefined){if(!Number.isSafeInteger(Number(data.id))||Number(data.id)<1)throw new RequestValidationError('معرّف التنبيه غير صالح.');query=query.eq('id',data.id);}
  const result=await query;taskDbError(result.error);return {ok:true};
 }
 if(!['create','update','status','archive','restore','delete','members','subtask_complete','subtask_save','subtask_delete','comment_save','comment_delete','project_save'].includes(action))throw new RequestValidationError('العملية غير مدعومة.');
 const result=await db.rpc('task_mutate',{p_action:action,p_id:id,p_revision:revision,p_data:data});taskDbError(result.error);return result.data;
}
