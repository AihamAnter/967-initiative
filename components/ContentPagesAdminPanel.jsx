'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Plus,Save,Trash2,RefreshCw,ArrowUp,ArrowDown,ArrowUpLeft,FileText} from 'lucide-react';
import {builtInPages,contentPagePath,pageKinds} from '@/lib/contentPages';
import {formatArabicDate} from '@/lib/format';

const newId=()=>crypto.randomUUID();
const emptyPage=()=>({id:newId(),slug:'',kind:'article',title:'',description:'',summary:'',order:40,showInFooter:true,sections:[],faqs:[],team:[]});

export default function ContentPagesAdminPanel({db}){
 const router=useRouter();
 const [pages,setPages]=useState([]),[revision,setRevision]=useState(null),[form,setForm]=useState(null),[saved,setSaved]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(null),[canDelete,setCanDelete]=useState(false);
 const mounted=useRef(false),loadId=useRef(0),saving=useRef(false);
 const api=useCallback(async(method='GET',body)=>{
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw new Error('انتهت جلسة الدخول. سجّل الدخول مجددًا.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch('/api/admin/pages',{method,headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:controller.signal});
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result)throw new Error(result?.error||'تعذر تنفيذ العملية. أعد تحميل المحفوظ قبل المحاولة.');
   return result;
  }catch(error){if(error.name==='AbortError')throw new Error('تأخر رد الخادم ولم تُؤكد العملية. أعد تحميل المحفوظ قبل المحاولة.');throw error;}
  finally{clearTimeout(timer);}
 },[db]);
 const select=page=>{const next=structuredClone(page);setForm(next);setSaved(JSON.stringify(next));};
 const load=useCallback(async()=>{
  const id=++loadId.current;setLoading(true);setFeedback(null);
  try{const result=await api();if(!mounted.current||id!==loadId.current)return;setPages(result.pages);setRevision(result.revision);setCanDelete(result.canDelete);const next=structuredClone(result.pages[0]||emptyPage());setForm(next);setSaved(JSON.stringify(next));}
  catch(error){if(mounted.current&&id===loadId.current)setFeedback({error:true,text:error.message});}
  finally{if(mounted.current&&id===loadId.current)setLoading(false);}
 },[api]);
 useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;};},[load]);
 const dirty=form&&JSON.stringify(form)!==saved;
 const discard=()=>!dirty||window.confirm('لديك تعديلات غير محفوظة. هل تريد تجاهلها؟');
 const setField=(key,value)=>{setForm(current=>({...current,[key]:value}));setFeedback(null);};
 const rowChange=(key,id,patch)=>{setFeedback(null);setForm(current=>({...current,[key]:current[key].map(item=>item.id===id?{...item,...patch}:item)}));};
 const removeRow=(key,id)=>{setFeedback(null);setForm(current=>({...current,[key]:current[key].filter(item=>item.id!==id)}));};
 const moveRow=(key,index,step)=>setForm(current=>{const rows=[...current[key]],next=index+step;if(next<0||next>=rows.length)return current;[rows[index],rows[next]]=[rows[next],rows[index]];return {...current,[key]:rows};});
 const addRow=key=>{const row={id:newId(),...(key==='sections'?{title:'',text:''}:key==='faqs'?{question:'',answer:''}:{name:'',role:'',bio:'',isExample:false})};setForm(current=>({...current,[key]:[...current[key],row]}));};
 async function save(event){
  event.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setFeedback(null);
  const exists=pages.some(page=>page.id===form.id);
  try{const result=await api(exists?'PUT':'POST',{page:form,revision});if(!mounted.current)return;setPages(result.pages);setRevision(result.revision);select(result.pages.find(page=>page.id===form.id));setFeedback({error:false,text:'تم حفظ الصفحة. تظهر التعديلات عند فتح الصفحة أو تحديثها.'});router.refresh();}
  catch(error){if(mounted.current)setFeedback({error:true,text:error.message});}
  finally{saving.current=false;if(mounted.current)setBusy(false);}
 }
 async function remove(page){
  if(!canDelete||saving.current||!discard()||!window.confirm(`هل تريد حذف صفحة «${page.title}»؟ سيُزال رابطها من الموقع ولن تظهر للزوار.`))return;
  saving.current=true;setBusy(true);setFeedback(null);
  try{const result=await api('DELETE',{id:page.id,revision});if(!mounted.current)return;setPages(result.pages);setRevision(result.revision);select(result.pages[0]||emptyPage());setFeedback({error:false,text:'تم حذف الصفحة وإزالة رابطها من الصفحات العامة.'});router.refresh();}
  catch(error){if(mounted.current)setFeedback({error:true,text:error.message});}
  finally{saving.current=false;if(mounted.current)setBusy(false);}
 }
 const tools=(key,index,item)=> <div className="content-editor-row-tools"><button type="button" aria-label={`نقل العنصر ${index+1} للأعلى`} onClick={()=>moveRow(key,index,-1)} disabled={index===0}><ArrowUp size={16}/></button><button type="button" aria-label={`نقل العنصر ${index+1} للأسفل`} onClick={()=>moveRow(key,index,1)} disabled={index===form[key].length-1}><ArrowDown size={16}/></button><button type="button" onClick={()=>removeRow(key,item.id)}><Trash2 size={16}/> إزالة العنصر</button></div>;
 return <div className="content-pages-admin">
  <header className="site-settings-heading"><div><h2><FileText size={22}/> إدارة صفحات الموقع</h2><p>أضف الصفحات والأقسام والأسئلة وأعضاء الطاقم، أو عدّلها. كل محتوى محفوظ هنا متاح للزوار؛ الحفظ ينشر التعديلات مباشرة.</p></div><button type="button" className="btn btn-outline" disabled={busy||loading} onClick={()=>{if(discard())load();}}><RefreshCw size={17}/> إعادة تحميل المحفوظ</button></header>
  {feedback&&<p className={'feedback '+(feedback.error?'error':'success')} role={feedback.error?'alert':'status'}>{feedback.text}</p>}
  {loading?<p role="status">جارٍ تحميل صفحات الموقع…</p>:!form?<button className="btn btn-outline" type="button" onClick={load}>إعادة المحاولة</button>:<div className="content-editor-layout">
   <aside className="admin-panel content-editor-list"><h3>الصفحات ({pages.length})</h3><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>{if(discard())select(emptyPage());}}><Plus size={17}/> إضافة صفحة</button>
    {pages.map(page=><article className={form.id===page.id?'selected':''} key={page.id}><button type="button" className="content-page-select" disabled={busy} aria-pressed={form.id===page.id} onClick={()=>{if(discard())select(page);}}><strong>{page.title}</strong><small dir="ltr">{contentPagePath(page)}</small></button>{canDelete&&<button type="button" className="content-page-delete" disabled={busy} aria-label={'حذف صفحة '+page.title} onClick={()=>remove(page)}><Trash2 size={17}/></button>}</article>)}
    {!pages.length&&<p>لا توجد صفحات محفوظة. يمكنك إضافة صفحة جديدة من الزر أعلاه.</p>}
    {!canDelete&&<p className="small-muted">الحذف النهائي للصفحات متاح لحساب الإدارة. يمكنك تعديل المحتوى وإضافة عناصره.</p>}
   </aside>
   <section className="admin-panel content-editor-form"><h3>{pages.some(page=>page.id===form.id)?'تعديل الصفحة':'إضافة صفحة جديدة'}</h3><form className="admin-form" onSubmit={save}><fieldset disabled={busy} className="content-editor-fields">
    <label>عنوان الصفحة<input required maxLength={160} value={form.title} onChange={event=>setField('title',event.target.value)}/></label>
    <div className="form-row"><label>الرابط المختصر بالإنجليزية<input required dir="ltr" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={pages.some(page=>page.id===form.id)&&Object.hasOwn(builtInPages,form.slug)} value={form.slug} placeholder="our-story" onChange={event=>{const slug=event.target.value;setForm(current=>({...current,slug,...(Object.hasOwn(builtInPages,slug)?{kind:builtInPages[slug]}:{})}));}}/><small>تظل روابط الصفحات الأساسية ثابتة. الصفحات الجديدة لها رابط ضمن /pages/.</small></label><label>نوع الصفحة<select value={form.kind} disabled={Object.hasOwn(builtInPages,form.slug)} onChange={event=>setField('kind',event.target.value)}>{Object.entries(pageKinds).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
    <label>وصف الصفحة والبحث<textarea rows={2} required maxLength={600} value={form.description} onChange={event=>setField('description',event.target.value)}/></label>
    <label>ملخص البداية<textarea rows={3} maxLength={1800} value={form.summary} onChange={event=>setField('summary',event.target.value)}/></label>
    <div className="form-row"><label>ترتيب الظهور<input type="number" min={0} max={10000} required value={form.order} onChange={event=>setField('order',event.target.value===''?'':Number(event.target.value))}/></label><label className="checkline"><input type="checkbox" checked={form.showInFooter} onChange={event=>setField('showInFooter',event.target.checked)}/> إظهار رابط الصفحة في الفوتر</label></div>
    <section className="content-editor-collection"><h4>أقسام الصفحة</h4><p className="small-muted">اكتب فقرات عادية. للروابط استخدم [النص](https://example.com)، وللقوائم ابدأ السطر بشرطة ومسافة.</p>
     {form.sections.map((item,index)=><fieldset className="content-editor-item" key={item.id}><legend>قسم {index+1}</legend>{tools('sections',index,item)}<label>عنوان القسم<input required maxLength={180} value={item.title} onChange={event=>rowChange('sections',item.id,{title:event.target.value})}/></label><label>النص<textarea required rows={5} maxLength={6000} value={item.text} onChange={event=>rowChange('sections',item.id,{text:event.target.value})}/></label></fieldset>)}
     <button type="button" className="btn btn-outline" disabled={form.sections.length>=40} onClick={()=>addRow('sections')}><Plus size={17}/> إضافة قسم</button>
    </section>
    {form.kind==='faq'&&<section className="content-editor-collection"><h4>الأسئلة والإجابات</h4>{form.faqs.map((item,index)=><fieldset className="content-editor-item" key={item.id}><legend>سؤال {index+1}</legend>{tools('faqs',index,item)}<label>السؤال<input required maxLength={250} value={item.question} onChange={event=>rowChange('faqs',item.id,{question:event.target.value})}/></label><label>الإجابة<textarea required rows={4} maxLength={4000} value={item.answer} onChange={event=>rowChange('faqs',item.id,{answer:event.target.value})}/></label></fieldset>)}<button type="button" className="btn btn-outline" disabled={form.faqs.length>=40} onClick={()=>addRow('faqs')}><Plus size={17}/> إضافة سؤال</button></section>}
    {form.kind==='about'&&<section className="content-editor-collection"><h4>أعضاء الطاقم ومهامهم</h4>{form.team.map((item,index)=><fieldset className="content-editor-item" key={item.id}><legend>عضو {index+1}</legend>{tools('team',index,item)}<div className="form-row"><label>اسم العضو<input required maxLength={120} value={item.name} onChange={event=>rowChange('team',item.id,{name:event.target.value})}/></label><label>المهمة أو المنصب<input required maxLength={180} value={item.role} onChange={event=>rowChange('team',item.id,{role:event.target.value})}/></label></div><label>نبذة مختصرة<textarea rows={3} maxLength={1200} value={item.bio} onChange={event=>rowChange('team',item.id,{bio:event.target.value})}/></label><label className="checkline"><input type="checkbox" checked={item.isExample} onChange={event=>rowChange('team',item.id,{isExample:event.target.checked})}/> هذه بيانات تجريبية؛ إظهار الوسم للزوار</label></fieldset>)}<button type="button" className="btn btn-outline" disabled={form.team.length>=40} onClick={()=>addRow('team')}><Plus size={17}/> إضافة عضو</button></section>}
    {form.kind==='requests'&&<p className="small-muted">يظهر نموذج الطلبات والبلاغات بعد الأقسام. تصل الرسائل إلى قسم «الرسائل» في لوحة التحرير بحسب نوع الطلب.</p>}
    <div className="content-editor-actions"><button className="btn btn-primary" type="submit" disabled={busy||!dirty}><Save size={18}/>{busy?'جارٍ التنفيذ…':'حفظ الصفحة'}</button>{pages.some(page=>page.id===form.id)&&<Link className="btn btn-outline" href={contentPagePath(pages.find(page=>page.id===form.id))} target="_blank" rel="noopener noreferrer">معاينة المحفوظ <ArrowUpLeft size={17}/></Link>}<span role="status">{dirty?'لديك تعديلات غير محفوظة':form.updatedAt?'آخر حفظ: '+formatArabicDate(form.updatedAt):'ابدأ ببيانات الصفحة'}</span></div>
   </fieldset></form></section>
  </div>}
 </div>;
}
