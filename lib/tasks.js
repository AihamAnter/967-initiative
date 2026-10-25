import {RequestValidationError} from './requestSecurity.js';

export const TASK_STATUSES = {not_started:'لم تبدأ',in_progress:'قيد التنفيذ',in_review:'بانتظار المراجعة',blocked:'متوقفة',completed:'مكتملة',cancelled:'ملغاة'};
export const TASK_PRIORITIES = {low:'منخفضة',normal:'عادية',high:'عالية',urgent:'عاجلة'};
export const TASK_RECURRENCES = {none:'لا تتكرر',daily:'يومياً',weekly:'أسبوعياً',monthly:'شهرياً'};
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const taskCanEdit = (task,actor) => actor?.role==='management'||(actor?.role==='admin'&&task.assigned_to===actor.user.id);
export const taskIsParticipant=(task,userId)=>task.assigned_to===userId||(task.participant_ids||[]).includes(userId);
export const taskCanCompleteStep=(task,actor)=>taskCanEdit(task,actor)||(actor?.role==='admin'&&taskIsParticipant(task,actor.user.id)&&!task.deleted_at&&!task.archived_at&&!['completed','cancelled'].includes(task.status));
export const dayKey = (value=new Date(),timeZone) => new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function addCalendarDays(day,amount){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function validTimeZone(value){try{new Intl.DateTimeFormat('en',{timeZone:value});return typeof value==='string'&&value.length<100;}catch{return false;}}
// A date-only deadline expires at the next midnight in its recorded IANA zone.
// Converting with the zone offset twice handles offset changes around DST.
export function zonedMidnight(date,timeZone){
 const [y,m,d]=date.split('-').map(Number),target=Date.UTC(y,m-1,d);let result=target;
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(result)).map(x=>[x.type,x.value]));const wall=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);result+=target-wall;}
 return result;
}
export function deadline(task){
 if(task.due_at)return Date.parse(task.due_at);
 if(!task.due_date)return null;
 const next=new Date(task.due_date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 return zonedMidnight(next.toISOString().slice(0,10),task.due_timezone||'UTC');
}
export const isOverdue=(task,now=Date.now())=>!task.archived_at&&!task.deleted_at&&!['completed','cancelled'].includes(task.status)&&deadline(task)!==null&&deadline(task)<=now;
export const isOnTime=task=>task.status==='completed'&&deadline(task)!==null&&Date.parse(task.completed_at)<=(task.due_date?deadline(task)-1:deadline(task));
export function dueDay(task,timeZone){return task.due_date||(task.due_at?dayKey(task.due_at,timeZone):null);}
export function dueLabel(task,now=Date.now(),timeZone){
 if(deadline(task)===null)return 'بلا موعد';
 if(task.status==='completed')return isOnTime(task)?'مكتملة في الموعد':'مكتملة متأخرة';
 if(task.status==='cancelled')return 'ملغاة';
 const hours=Math.abs(deadline(task)-now)/3600000;
 if(isOverdue(task,now))return hours<24?'متأخرة بأقل من يوم':`متأخرة منذ ${Math.floor(hours/24).toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} يوم`;
 if(dueDay(task,timeZone)===dayKey(now,timeZone))return task.due_date?'موعد التسليم اليوم':`بقي ${Math.max(1,Math.ceil(hours)).toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} ساعة`;
 return `بقي ${Math.max(1,Math.ceil(hours/24)).toLocaleString('ar-u-nu-latn',{numberingSystem:'latn'})} يوم`;
}
export function validateTask(input,{partial=false}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RequestValidationError('بيانات المهمة غير صالحة.');
 const fields=['title','description','project_id','assigned_to','participant_ids','status','priority','start_at','due_at','due_date','due_timezone','estimated_minutes','tags','links','notes','requires_review','recurrence'];
 if(Object.keys(input).some(k=>!fields.includes(k)))throw new RequestValidationError('تحتوي المهمة على حقول غير مسموحة.');
 const out={...input};const fail=()=>{throw new RequestValidationError('تحقق من العنوان والمواعيد والروابط والحقول المطلوبة.');};
 for(const [key,max] of [['title',250],['description',15000],['notes',10000]])if(key in out){if(typeof out[key]!=='string'||out[key].length>max||(key==='title'&&!out[key].trim()))fail();out[key]=out[key].trim();}
 if(!partial&&!out.title)fail();
 if('participant_ids' in out&&(!Array.isArray(out.participant_ids)||out.participant_ids.length>50||out.participant_ids.some(id=>!UUID.test(id)||id===out.assigned_to)||new Set(out.participant_ids).size!==out.participant_ids.length))fail();
 for(const key of ['assigned_to','project_id'])if(key in out&&!(key==='project_id'&&out[key]===null)&&!UUID.test(out[key]))fail();
 for(const [key,choices] of [['status',TASK_STATUSES],['priority',TASK_PRIORITIES],['recurrence',TASK_RECURRENCES]])if(key in out&&!Object.hasOwn(choices,out[key]))fail();
 for(const key of ['due_at','start_at'])if(out[key]!==undefined&&out[key]!==null){if(typeof out[key]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(out[key])||!Number.isFinite(Date.parse(out[key])))fail();out[key]=new Date(out[key]).toISOString();}
 if(out.due_date!==undefined&&out.due_date!==null&&(!/^\d{4}-\d\d-\d\d$/.test(out.due_date)||Number.isNaN(Date.parse(out.due_date))||new Date(out.due_date).toISOString().slice(0,10)!==out.due_date))fail();
 if(out.due_at&&out.due_date)fail();
 if('due_timezone' in out&&!validTimeZone(out.due_timezone))fail();
 if(out.start_at&&(out.due_at||out.due_date)&&Date.parse(out.start_at)>=deadline(out))fail();
 if(out.estimated_minutes!==undefined&&out.estimated_minutes!==null&&(!Number.isInteger(out.estimated_minutes)||out.estimated_minutes<1||out.estimated_minutes>525600))fail();
 if('requires_review' in out&&typeof out.requires_review!=='boolean')fail();
 if('tags' in out){if(!Array.isArray(out.tags)||out.tags.length>20||out.tags.some(x=>typeof x!=='string'||!x.trim()||x.length>60))fail();out.tags=[...new Set(out.tags.map(x=>x.trim()))];}
 if('links' in out){if(!Array.isArray(out.links)||out.links.length>20)fail();for(const link of out.links){try{const url=new URL(link);if(typeof link!=='string'||link.length>2048||!['https:','http:'].includes(url.protocol)||url.username||url.password)fail();}catch{fail();}}out.links=[...new Set(out.links.map(x=>x.trim()))];}
 return out;
}
export function filterTasks(tasks,filters={},actor,now=Date.now()){
 const tz=validTimeZone(filters.tz)?filters.tz:'UTC',today=dayKey(now,tz),end=addCalendarDays(today,6),needle=(filters.q||'').trim().toLocaleLowerCase('ar');
 const items=tasks.filter(t=>{
  if(t.deleted_at||Boolean(t.archived_at)!==(filters.archive==='1'))return false;
  if(filters.status&&t.status!==filters.status||filters.priority&&t.priority!==filters.priority||filters.assignee&&!taskIsParticipant(t,filters.assignee)||filters.project&&t.project_id!==filters.project)return false;
  if(needle&&![t.title,t.description,t.project_name,t.assignee_name,...(t.participant_names||[]),...(t.tags||[])].join(' ').toLocaleLowerCase('ar').includes(needle))return false;
  const day=dueDay(t,tz);
  switch(filters.scope){case 'mine':if(!taskIsParticipant(t,actor.user.id))return false;break;case 'responsible':if(t.assigned_to!==actor.user.id)return false;break;case 'participating':if(!(t.participant_ids||[]).includes(actor.user.id))return false;break;case 'created':if(t.created_by!==actor.user.id)return false;break;case 'review':if(t.status!=='in_review')return false;break;case 'overdue':if(!isOverdue(t,now))return false;break;case 'today':if(day!==today)return false;break;case 'week':if(!day||day<today||day>end)return false;break;case 'urgent':if(t.priority!=='urgent')return false;break;case 'completed':if(t.status!=='completed')return false;break;case 'open':if(['completed','cancelled'].includes(t.status))return false;break;}
  if(filters.from&&(!day||day<filters.from)||filters.to&&(!day||day>filters.to))return false;
  return true;
 });
 const priority={urgent:0,high:1,normal:2,low:3};
 return items.sort((a,b)=>{switch(filters.sort){case 'newest':return Date.parse(b.created_at)-Date.parse(a.created_at)||a.id.localeCompare(b.id);case 'updated':return Date.parse(b.updated_at)-Date.parse(a.updated_at)||a.id.localeCompare(b.id);case 'priority':return priority[a.priority]-priority[b.priority]||a.id.localeCompare(b.id);case 'assignee':return (a.assignee_name||'').localeCompare(b.assignee_name||'','ar')||a.id.localeCompare(b.id);default:return (deadline(a)??Infinity)-(deadline(b)??Infinity)||a.id.localeCompare(b.id);}});
}
export function taskMetrics(tasks,now=Date.now(),timeZone='UTC'){
 const active=tasks.filter(t=>!t.archived_at&&!t.deleted_at),today=dayKey(now,timeZone),end=addCalendarDays(today,6),completed=active.filter(t=>t.status==='completed'),withDeadline=completed.filter(t=>deadline(t)!==null);
 const weekday=new Date(today+'T12:00Z').getUTCDay(),weekStart=zonedMidnight(addCalendarDays(today,-((weekday+6)%7)),timeZone);
 const history=tasks.filter(t=>!t.deleted_at&&(!t.archived_at||t.auto_archived));
 const weekCompleted=history.filter(t=>t.completed_at&&Date.parse(t.completed_at)>=weekStart&&Date.parse(t.completed_at)<=now&&t.status==='completed');
 const weekTasks=history.filter(t=>Date.parse(t.created_at)>=weekStart&&Date.parse(t.created_at)<=now||t.completed_at&&Date.parse(t.completed_at)>=weekStart&&Date.parse(t.completed_at)<=now);
 const distribution=key=>Object.entries(weekTasks.reduce((acc,t)=>{acc[t[key]||'غير محدد']=(acc[t[key]||'غير محدد']||0)+1;return acc;},{})).map(([name,count])=>({name,count}));
 return {total:active.length,not_started:active.filter(t=>t.status==='not_started').length,in_progress:active.filter(t=>t.status==='in_progress').length,completed:completed.length,overdue:active.filter(t=>isOverdue(t,now)).length,today:active.filter(t=>dueDay(t,timeZone)===today).length,week:active.filter(t=>{const d=dueDay(t,timeZone);return d&&d>=today&&d<=end;}).length,completion_rate:active.filter(t=>t.status!=='cancelled').length?Math.round(completed.length/active.filter(t=>t.status!=='cancelled').length*100):0,on_time_rate:withDeadline.length?Math.round(withDeadline.filter(isOnTime).length/withDeadline.length*100):null,weekly:{created:history.filter(t=>Date.parse(t.created_at)>=weekStart&&Date.parse(t.created_at)<=now).length,completed:weekCompleted.length,on_time:weekCompleted.filter(isOnTime).length,late:weekCompleted.filter(t=>deadline(t)!==null&&!isOnTime(t)).length,overdue:active.filter(t=>isOverdue(t,now)).length,projects:distribution('project_name'),assignees:distribution('assignee_name')}};
}
export function calendarDays(anchor,mode='month'){
 const d=new Date(anchor+'T12:00:00Z'),start=new Date(d);let count;
 if(mode==='week'){start.setUTCDate(d.getUTCDate()-d.getUTCDay());count=7;}else{start.setUTCDate(1);start.setUTCDate(1-start.getUTCDay());count=42;}
 return Array.from({length:count},(_,i)=>{const day=new Date(start);day.setUTCDate(start.getUTCDate()+i);return day.toISOString().slice(0,10);});
}
