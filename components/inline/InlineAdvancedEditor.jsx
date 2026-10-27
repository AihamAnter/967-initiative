'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Save,RefreshCw,ArrowUpLeft} from 'lucide-react';
import {useInlineEditor} from './InlineEditorProvider';
import {inlineTargetKinds} from '@/lib/inlineEditorTargets';
import {safeExternalUrl} from '@/lib/media';
import ValidatedForm,{FormInput,FormTextarea,FormLabel} from '@/components/debates/ValidatedForm';

const field=(key,label,props={})=>({key,label,...props});
const forms={
 university:[
  field('name_ar','اسم المؤسسة',{required:true,maxLength:250}),
  field('summary','النبذة التعريفية',{multiline:true,maxLength:12000}),
  field('governorate','المحافظة'),field('city','المدينة أو المديرية'),field('address','العنوان',{multiline:true}),
  field('website','الموقع الرسمي',{type:'url'}),field('phone','الهاتف'),field('email','البريد',{type:'email'}),
  field('logo_url','رابط الشعار',{type:'url'}),field('admission_info','معلومات القبول المؤرخة',{multiline:true,maxLength:6000}),
  field('registration_url','رابط التسجيل',{type:'url'}),
 ],
 medical_center:[
  field('name_ar','اسم المنشأة الطبية',{required:true,maxLength:250}),
  field('summary','الوصف والخدمات المنشورة',{multiline:true,maxLength:12000}),
  field('governorate','المحافظة'),field('city','المدينة أو المديرية'),field('address','العنوان',{multiline:true}),
  field('website','الموقع الرسمي',{type:'url'}),field('phone','رقم الاتصال المنشور'),field('email','البريد',{type:'email'}),
  field('logo_url','رابط الشعار',{type:'url'}),field('booking_url','رابط الحجز',{type:'url'}),
 ],
 statistic:[
  field('name','عنوان المؤشر',{required:true,maxLength:250}),
  field('short_description','الوصف المختصر',{multiline:true,maxLength:1500}),
  field('definition','تعريف المؤشر',{multiline:true,maxLength:6000}),
  field('measurement_method','منهجية القياس',{multiline:true,maxLength:6000}),
 ],
 ranking:[
  field('name','عنوان مؤشر الترتيب',{required:true,maxLength:160}),
  field('description','شرح المؤشر',{multiline:true,maxLength:3000}),
 ],
 district:[
  field('capital','المركز الإداري',{maxLength:160}),
  field('description','النبذة',{multiline:true,maxLength:4000}),
  field('history','التاريخ',{multiline:true,maxLength:6000}),
  field('geography','الطبيعة',{multiline:true,maxLength:6000}),
  field('economy','الاقتصاد',{multiline:true,maxLength:6000}),
  field('landmarks','المعالم',{multiline:true,maxLength:6000}),
  field('image_url','رابط صورة المديرية',{type:'url'}),
  field('image_credit','اسم صاحب الصورة والترخيص',{maxLength:1000}),
  field('image_source_url','مصدر الصورة',{type:'url'}),
 ],
};
const valueFor=(item,fields)=>Object.fromEntries(fields.map(({key})=>[key,item?.[key]??'']));
const urlError=(value,original)=>!value||value===original||safeExternalUrl(value)?'':'استخدم رابطاً يبدأ بـ HTTP أو HTTPS.';
function parseResponse(kind,response,id){
 if(kind==='ranking'){
  const item=response.indicators?.find(row=>row.id===id);
  if(!item)throw Error('لم يعد مؤشر الترتيب موجوداً. أعد اختيار المؤشر.');
  return {item,revision:item.updated_at};
 }
 if(!response.item)throw Error('لم يتوفر سجل يمكن تحريره في هذه الصفحة.');
 return {item:response.item,revision:response.revision??(kind==='statistic'?response.item.updated_at:response.item.revision)};
}

export default function InlineAdvancedEditor({target,onSaved,onDirtyChange,onBusyChange}){
 const {request}=useInlineEditor();
 const fields=forms[target.kind]||[];
 const [original,setOriginal]=useState(null),[draft,setDraft]=useState({}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(null);
 const alive=useRef(true),version=useRef(0);
 const loaded=Boolean(original);
 const load=useCallback(async()=>{
  const count=++version.current;setLoading(true);setFeedback(null);
  try{
   let response;
   if(target.kind==='ranking')response=await request('/api/admin/rankings');
   else if(target.kind==='district')response=await request('/api/admin/districts?id='+encodeURIComponent(target.id));
   else response=await request('/api/admin/inline-quick?kind='+encodeURIComponent(target.kind)+'&id='+encodeURIComponent(target.id));
   if(!alive.current||count!==version.current)return;
   const next=parseResponse(target.kind,response,target.id);
   setOriginal(next);setDraft(valueFor(next.item,fields));
  }catch(error){if(alive.current&&count===version.current)setFeedback({error:true,text:error.message});}
  finally{if(alive.current&&count===version.current)setLoading(false);}
 },[request,target.id,target.kind,fields]);
 // The form schemas above are constants, so the dependency reference is stable.
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false;version.current++;};},[load]);
 const changes=useMemo(()=>Object.fromEntries(fields.filter(({key})=>String(draft[key]??'')!==String(original?.item?.[key]??'')).map(({key})=>[key,draft[key]??''])),[fields,draft,original]);
 const dirty=Boolean(original&&Object.keys(changes).length);
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[onDirtyChange,dirty]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[onBusyChange,busy]);
 async function save(event){
  event.preventDefault();if(busy||loading||!dirty||!original)return;
  for(const spec of fields){
   if(spec.type==='url'&&Object.hasOwn(changes,spec.key)&&urlError(String(changes[spec.key]).trim(),original.item[spec.key])){
    setFeedback({error:true,text:'الرابط في حقل «'+spec.label+'» غير صالح.'});return;
   }
  }
  setBusy(true);setFeedback(null);
  try{
   let result;
   if(target.kind==='ranking'){
    const saved=original.item;
    const keys=['id','name','slug','category','unit','code','direction','better','description','display_order','is_published'];
    const indicator=Object.fromEntries(keys.map(key=>[key,Object.hasOwn(changes,key)?changes[key]:saved[key]]));
    result=await request('/api/admin/rankings',{indicator,expectedUpdatedAt:original.revision});
   }else if(target.kind==='district'){
    result=await request('/api/admin/districts?id='+encodeURIComponent(target.id),{
     profile:{...original.item,...changes},revision:original.revision,
    },{method:'PUT'});
   }else{
    result=await request('/api/admin/inline-quick',{
     kind:target.kind,id:target.id,revision:original.revision,data:changes,
    });
   }
   if(!alive.current)return;
   // Only report success after the authenticated save endpoint confirms it.
   if(target.kind==='ranking'&&!result.indicator?.id)throw Error('لم يؤكد الخادم حفظ المؤشر.');
   if(target.kind!=='ranking'&&!result.item)throw Error('لم يؤكد الخادم حفظ التغييرات.');
   setFeedback({error:false,text:'تم حفظ التعديلات من هذه الصفحة.'});
   await onSaved?.(target,result);
   if(alive.current)await load();
  }catch(error){if(alive.current)setFeedback({error:true,text:error.status===409?'تغيّر الملف أثناء التحرير. احتفظ بتعديلاتك وراجع النسخة الحديثة قبل الحفظ.':error.message});}
  finally{if(alive.current)setBusy(false);}
 }
 return <div className="inline-content-editor">
  <p>تعديل {inlineTargetKinds[target.kind]?.label} من الصفحة الحالية، دون الانتقال إلى لوحة التحكم.</p>
  {['university','medical_center'].includes(target.kind)&&<p className="small-muted">التعديل السريع للبيانات التعريفية فقط. تبقى المصادر والكليات والتخصصات والخدمات وساعات العمل محفوظة كما هي. لتعديل العلاقات استخدم المحرر الكامل.</p>}
  {target.kind==='statistic'&&<p className="small-muted">تُعدل التعريفات والنصوص فقط؛ قيم السنوات ووحدات القياس والمصادر تُراجع في المحرر الإحصائي المتخصص.</p>}
  {target.kind==='ranking'&&<p className="small-muted">لا تتغير مراتب الدول أو مصادر المؤشر عند تعديل العنوان والشرح.</p>}
  {target.kind==='district'&&<p className="small-muted">مصادر المديرية والحدود والأرقام محفوظة. لا تستخدم صورة دون إضافة ترخيصها ومصدرها.</p>}
  {feedback&&<p className={'feedback '+(feedback.error?'error':'success')} role={feedback.error?'alert':'status'}>{feedback.text}</p>}
  {loading?<p role="status">جارٍ تحميل أحدث بيانات العنصر…</p>:!loaded?
   <button className="btn btn-outline" type="button" onClick={load}><RefreshCw size={16}/> إعادة المحاولة</button>:
   <ValidatedForm className="admin-form" onSubmit={save}><fieldset className="inline-content-fields" disabled={busy}>
    {fields.map(({key,label,multiline,...props})=><FormLabel key={key}>{label}
     {multiline?
      <FormTextarea {...props} rows={['description','summary','admission_info','history'].includes(key)?5:3} value={draft[key]??''} onChange={e=>{setDraft(state=>({...state,[key]:e.target.value}));setFeedback(null);}}/>:
      <FormInput {...props} type={props.type==='url'?'text':props.type||'text'} inputMode={props.type==='url'?'url':undefined} dir={['url','email'].includes(props.type)?'ltr':undefined} value={draft[key]??''} validate={props.type==='url'?value=>urlError(value,original.item[key]):undefined} onChange={e=>{setDraft(state=>({...state,[key]:e.target.value}));setFeedback(null);}}/>
     }</FormLabel>)}
    <div className="inline-content-actions">
     <button className="btn btn-primary" disabled={busy||!dirty}><Save size={16}/>{busy?'جارٍ الحفظ…':'حفظ التعديلات'}</button>
     <a className="btn btn-outline" href={target.adminHref} onClick={e=>{if(busy||(dirty&&!window.confirm('هناك تعديلات غير محفوظة. هل تريد فتح المحرر الكامل دون حفظها؟')))e.preventDefault();}}>المحرر الكامل <ArrowUpLeft size={15}/></a>
     <button type="button" className="btn btn-outline" disabled={busy} onClick={()=>{if(!dirty||window.confirm('تجاهل التعديلات غير المحفوظة وإعادة التحميل؟'))load();}}><RefreshCw size={16}/> إعادة التحميل</button>
    </div>
   </fieldset></ValidatedForm>}
 </div>;
}
