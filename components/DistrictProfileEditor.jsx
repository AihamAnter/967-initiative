'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,Trash2,RefreshCw,ArrowUpLeft} from 'lucide-react';
import Link from 'next/link';
import ValidatedForm,{FormInput,FormTextarea,FormLabel} from './debates/ValidatedForm';
import useAdminEditor from './admin/useAdminEditor';
import EditorActions from './admin/EditorActions';
import {inlineContentRequest} from '@/lib/inlineContentClient';
import {districtTextFields} from '@/lib/districtProfiles';

export default function DistrictProfileEditor({db,id,onDirtyChange,onBusyChange}){
 const [record,setRecord]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(null);
 const alive=useRef(false),generation=useRef(0),editor=useAdminEditor({db,kind:'district',id,value:draft,onRestore:setDraft}),{markClean}=editor;
 const dirty=record&&JSON.stringify(record.item)!==JSON.stringify(draft);
 useEffect(()=>{onDirtyChange?.(Boolean(dirty));return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 const load=useCallback(async()=>{const version=++generation.current;setLoading(true);setNotice(null);try{const saved=await inlineContentRequest(db,'/api/admin/districts?id='+encodeURIComponent(id));if(alive.current&&version===generation.current){setRecord(saved);setDraft(saved.item);markClean(saved.item);}}catch(error){if(alive.current&&version===generation.current)setNotice({error:true,text:error.message});}finally{if(alive.current&&version===generation.current)setLoading(false);}},[db,id,markClean]);
 useEffect(()=>{const counter=generation;alive.current=true;setRecord(null);setDraft(null);load();return()=>{alive.current=false;counter.current++;};},[load]);
 const field=(key,value)=>setDraft(current=>({...current,[key]:value}));
 async function save(event){event.preventDefault();if(!dirty||busy)return;setBusy(true);setNotice(null);try{const saved=await inlineContentRequest(db,'/api/admin/districts?id='+encodeURIComponent(id),{method:'PUT',body:{profile:draft,revision:record.revision}});if(alive.current){setRecord(saved);setDraft(saved.item);markClean(saved.item);await editor.clearDraft();setNotice({text:'حُفظ ملف المديرية. تظهر المعلومات الجديدة في الخريطة والبحث.'});window.dispatchEvent(new CustomEvent('967:inline-content-saved',{detail:{target:{kind:'district',id}}}));}}catch(error){if(alive.current)setNotice({error:true,text:error.message});}finally{if(alive.current)setBusy(false);}}
 return <div className="district-profile-editor">
  {notice&&<p className={'feedback '+(notice.error?'error':'success')} role={notice.error?'alert':'status'}>{notice.text}</p>}
  {loading?<p role="status">جارٍ تحميل ملف المديرية…</p>:record&&draft?<><div className="debate-section-heading"><div><span className="eyebrow">{record.region.governorateNameAr}</span><h3>مديرية {record.region.nameAr}</h3><small dir="ltr">{id}</small></div><div className="debate-actions"><Link href={'/yemen-map?district='+id+'#map'} target="_blank">معاينة الخريطة <ArrowUpLeft size={15}/></Link><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>{if(!dirty||confirm('تجاهل تعديلات المديرية وتحميل المحفوظ؟'))load();}}><RefreshCw size={15}/> إعادة تحميل</button></div></div>
   <ValidatedForm className="admin-form" onSubmit={save} data-editor-key={editor.key}>
    <EditorActions editor={editor} busy={busy} value={{...draft,title:record.region.nameAr}} published allowNew={false}/>
    <fieldset disabled={busy} className="district-editor-fields">
     {Object.entries(districtTextFields).map(([key,{label,max}])=><FormLabel key={key}>{label}{['description','history','geography','economy','landmarks'].includes(key)?<FormTextarea aria-label={label} rows={key==='description'?3:4} maxLength={max} value={draft[key]} onChange={event=>field(key,event.target.value)}/>:<FormInput aria-label={label} type={key.endsWith('url')?'url':'text'} dir={key.endsWith('url')?'ltr':undefined} maxLength={max} value={draft[key]} onChange={event=>field(key,event.target.value)}/>}</FormLabel>)}
     <section className="district-editor-numbers"><h4>البيانات الموثقة</h4><p className="small-muted">اترك القيم غير المتوفرة فارغة. أضف المصدر وسنة القياس للسكان؛ لا تُستخدم التقديرات التلقائية.</p><div className="form-row">{[['area_km2','المساحة كم²'],['population','عدد السكان'],['population_year','سنة قياس السكان']].map(([key,label])=><FormLabel key={key}>{label}<FormInput type="number" min={key==='population_year'?1900:0} max={key==='population_year'?new Date().getFullYear():undefined} step={key==='area_km2'?'any':1} value={draft[key]??''} onChange={event=>field(key,event.target.value===''?null:Number(event.target.value))}/></FormLabel>)}</div></section>
     <section className="district-editor-sources"><h4>مصادر المعلومات</h4><p className="small-muted">مصدر الحدود يثبت الاسم والتبعية الإدارية. أضف مصادر مستقلة للتاريخ والمعالم والأرقام التي تحررها.</p>{draft.sources.map((source,index)=><div className="district-source-row" key={index}><FormLabel>اسم المصدر {index+1}<FormInput required maxLength={250} value={source.title} onChange={event=>field('sources',draft.sources.map((row,i)=>i===index?{...row,title:event.target.value}:row))}/></FormLabel><FormLabel>رابط المصدر {index+1}<FormInput required type="url" dir="ltr" value={source.url} onChange={event=>field('sources',draft.sources.map((row,i)=>i===index?{...row,url:event.target.value}:row))}/></FormLabel><button type="button" className="btn btn-outline" aria-label={'إزالة المصدر '+(index+1)} onClick={()=>field('sources',draft.sources.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}<button type="button" className="btn btn-outline" disabled={draft.sources.length>=15} onClick={()=>field('sources',[...draft.sources,{title:'',url:''}])}><Plus size={16}/> إضافة مصدر</button></section>
    </fieldset>
   </ValidatedForm>
  </>:!notice&&<p>اختر مديرية لتحرير معلوماتها.</p>}
 </div>;
}
