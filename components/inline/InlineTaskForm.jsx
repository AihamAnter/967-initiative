'use client';
import {useEffect,useState} from 'react';
import ValidatedForm,{FormInput,FormTextarea,FormLabel} from '@/components/debates/ValidatedForm';
import {useInlineEditor} from './InlineEditorProvider';

export default function InlineTaskForm({target,onSaved,onDirtyChange,onBusyChange}){
 const {request,actor}=useInlineEditor(),[title,setTitle]=useState('مراجعة '+(target.title||'هذه الصفحة')),[description,setDescription]=useState(target.description||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(null);
 const defaultTitle='مراجعة '+(target.title||'هذه الصفحة');
 useEffect(()=>{onDirtyChange(title!==defaultTitle||Boolean(description));return()=>onDirtyChange(false);},[title,description,defaultTitle,onDirtyChange]);
 useEffect(()=>{onBusyChange(busy);return()=>onBusyChange(false);},[busy,onBusyChange]);
 async function save(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const result=await request('/api/admin/inline',{action:'task',data:{title:title.trim(),description:description.trim(),source_type:target.kind||'page',source_id:target.id||null,source_url:target.href||location.pathname,assigned_to:actor.id}});setCreated(result.id||result.task_id||result.task?.id);onDirtyChange(false);await onSaved(target,result,'task');}catch(err){setError(err.message);}finally{setBusy(false);}}
 return <>{error&&<p className="inline-error" role="alert">{error}</p>}{created?<div role="status"><p>أُنشئت المهمة في مركز المهام.</p><a className="btn btn-primary" href={'/admin/tasks?task='+created}>فتح المهمة</a></div>:<ValidatedForm className="inline-form" onSubmit={save}><fieldset disabled={busy}><FormLabel required>عنوان المهمة<FormInput required minLength={3} maxLength={250} value={title} onChange={event=>setTitle(event.target.value)}/></FormLabel><FormLabel>وصف المشكلة أو المطلوب<FormTextarea maxLength={15000} rows={4} value={description} onChange={event=>setDescription(event.target.value)}/></FormLabel><div className="inline-readonly"><p>الصفحة: <bdi>{target.href||location.pathname}</bdi></p><p>ترتبط المهمة بالعنصر الحالي وتُسند إليك. تتاح بقية إعداداتها في مركز المهام.</p></div><button className="btn btn-primary" disabled={busy}>{busy?'جارٍ الإنشاء…':'إنشاء المهمة'}</button></fieldset></ValidatedForm>}</>;
}
