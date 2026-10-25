'use client';
import {useState} from 'react';
import {TASK_STATUSES,TASK_PRIORITIES,TASK_RECURRENCES,validateTask} from '@/lib/tasks';
import TaskDialog from './TaskDialog';
import styles from './TaskCenter.module.css';
const localInput=value=>{if(!value)return '';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function TaskForm({task,workspace,onClose,onSave,busy,error}){
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 const [form,setForm]=useState(()=>({title:task?.title||'',description:task?.description||'',notes:task?.notes||'',project_id:task?.project_id||'',assigned_to:task?.assigned_to||workspace.actor.id,status:task?.status||'not_started',priority:task?.priority||'normal',start_at:localInput(task?.start_at),due_date:task?.due_date||task?.due_at&&localInput(task.due_at).slice(0,10)||'',due_time:task?.due_at?localInput(task.due_at).slice(11,16):'',due_timezone:task?.due_timezone||zone,estimated_minutes:task?.estimated_minutes||'',tags:(task?.tags||[]).join('، '),links:(task?.links||[]).join('\n'),requires_review:task?.requires_review||false,recurrence:task?.recurrence||'none'}));
 const [validation,setValidation]=useState('');const set=(key,value)=>setForm(f=>({...f,[key]:value}));const manager=workspace.actor.role==='management';
 const [participants,setParticipants]=useState(task?.participant_ids||[]);
 async function submit(e){e.preventDefault();setValidation('');try{
  const {due_time,...data}=form;
  if(due_time&&!form.due_date)throw Error('حدد يوم التسليم قبل إضافة الساعة.');
  data.project_id=form.project_id||null;data.estimated_minutes=form.estimated_minutes?Number(form.estimated_minutes):null;
  data.start_at=form.start_at?new Date(form.start_at).toISOString():null;
  data.due_at=form.due_date&&due_time?new Date(form.due_date+'T'+due_time).toISOString():null;
  if(data.due_at&&localInput(data.due_at)!==form.due_date+'T'+due_time)throw Error('هذا الوقت المحلي غير موجود بسبب تغيير التوقيت. اختر ساعة أخرى.');
  data.due_date=form.due_date&&!due_time?form.due_date:null;
  data.due_timezone=data.due_at?zone:form.due_timezone;
  data.tags=form.tags.split(/[,،]/).map(x=>x.trim()).filter(Boolean);data.links=form.links.split('\n').map(x=>x.trim()).filter(Boolean);
  if(manager)data.participant_ids=participants.filter(id=>id!==form.assigned_to);
  validateTask(data);await onSave(data);
 }catch(err){setValidation(err.message);}}
 return <TaskDialog title={task?'تعديل المهمة':'إضافة مهمة جديدة'} onClose={onClose} busy={busy} wide><form onSubmit={submit} className={styles.form}>
  <label className={styles.full}>عنوان المهمة <span>مطلوب</span><input required autoFocus maxLength={250} value={form.title} onChange={e=>set('title',e.target.value)}/></label>
  <label className={styles.full}>الوصف<textarea rows={3} maxLength={15000} value={form.description} onChange={e=>set('description',e.target.value)}/></label>
  <label>المشروع أو القسم<select aria-label="المشروع أو القسم" value={form.project_id} onChange={e=>set('project_id',e.target.value)}><option value="">غير مصنف</option>{workspace.projects.filter(p=>p.is_active||p.id===form.project_id).map(p=><option key={p.id} value={p.id}>{p.name}{!p.is_active?' (متوقف)':''}</option>)}</select></label>
  <label>المسؤول الرئيسي<select aria-label="المسؤول الرئيسي" required disabled={!manager} value={form.assigned_to} onChange={e=>{set('assigned_to',e.target.value);setParticipants(ids=>ids.filter(id=>id!==e.target.value));}}>{workspace.members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
  <fieldset className={styles.participantPicker+' '+styles.full} disabled={!manager||busy}><legend>الأعضاء المشاركون · {participants.filter(id=>id!==form.assigned_to).length}</legend><p className={styles.hint}>المسؤول الرئيسي لا يتكرر ضمن المشاركين. تعديل العضوية متاح للإدارة.</p><div>{workspace.members.filter(m=>m.user_id!==form.assigned_to).map(m=><label key={m.user_id} className={styles.check}><input type="checkbox" checked={participants.includes(m.user_id)} onChange={e=>setParticipants(ids=>e.target.checked?[...ids,m.user_id]:ids.filter(id=>id!==m.user_id))}/><span>{m.display_name}</span></label>)}</div></fieldset>
  <label>الأولوية<select aria-label="الأولوية" value={form.priority} onChange={e=>set('priority',e.target.value)}>{Object.entries(TASK_PRIORITIES).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
  <label>الحالة<select aria-label="الحالة" value={form.status} onChange={e=>set('status',e.target.value)}>{Object.entries(TASK_STATUSES).map(([v,label])=><option key={v} value={v} disabled={v==='completed'&&form.requires_review&&!manager}>{label}</option>)}</select></label>
  <label>تاريخ ووقت البدء<input type="datetime-local" value={form.start_at} onChange={e=>set('start_at',e.target.value)}/></label>
  <label>الوقت المقدّر بالدقائق<input type="number" min={1} max={525600} value={form.estimated_minutes} onChange={e=>set('estimated_minutes',e.target.value)}/></label>
  <label>يوم التسليم<input type="date" value={form.due_date} onChange={e=>set('due_date',e.target.value)}/></label>
  <label>ساعة التسليم <span>اختياري</span><input type="time" value={form.due_time} onChange={e=>set('due_time',e.target.value)}/></label>
  <p className={`${styles.hint} ${styles.full}`}>{form.due_time?`يُدخل الموعد بتوقيت جهازك (${zone}) ويُحفظ كوقت عالمي.`:`بدون ساعة، تستحق المهمة بنهاية يوم التسليم في ${form.due_timezone}. امسح اليوم لإزالة الموعد.`}</p>
  <label>التكرار<select value={form.recurrence} onChange={e=>set('recurrence',e.target.value)}>{Object.entries(TASK_RECURRENCES).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
  <label>الوسوم <span>افصل بفاصلة</span><input value={form.tags} onChange={e=>set('tags',e.target.value)}/></label>
  <label className={`${styles.check} ${styles.full}`}><input type="checkbox" checked={form.requires_review} disabled={Boolean(task)&&!manager} onChange={e=>set('requires_review',e.target.checked)}/> تتطلب اعتماد الإدارة قبل الإكمال</label>
  <label className={styles.full}>روابط مرجعية <span>رابط HTTP أو HTTPS في كل سطر</span><textarea rows={2} dir="ltr" value={form.links} onChange={e=>set('links',e.target.value)}/></label>
  <label className={styles.full}>ملاحظات إضافية<textarea rows={2} maxLength={10000} value={form.notes} onChange={e=>set('notes',e.target.value)}/></label>
  {form.recurrence!=='none'&&<p className={`${styles.hint} ${styles.full}`}>تُنشأ نسخة واحدة جديدة عند الإكمال، بنفس المسؤول والمشاركين الفعالين ومع إعادة ضبط الخطوات. لا تُنسخ المناقشات، وإعادة الفتح والإكمال لا تنشئ نسخة إضافية.</p>}
  {(validation||error)&&<p role="alert" className={`${styles.error} ${styles.full}`}>{validation||error}</p>}
  <footer className={`${styles.actions} ${styles.full}`}><button className={styles.primary} disabled={busy} type="submit">{busy?'جارٍ الحفظ…':'حفظ المهمة'}</button><button className={styles.secondary} type="button" disabled={busy} onClick={onClose}>إلغاء</button></footer>
 </form></TaskDialog>;
}
