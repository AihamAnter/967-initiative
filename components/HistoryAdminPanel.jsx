'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {BookOpen,Plus,RefreshCcw,Save,Trash2,ExternalLink} from 'lucide-react';
import {historyEras,historyKinds} from '@/lib/yemenHistory';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import useAdminEditor from './admin/useAdminEditor';
import HistoryMedia from './history/HistoryMedia';
import styles from './history/HistoryAdminPanel.module.css';

const blank=()=>({slug:'',title:'',kind:'event',era:'modern',year:1990,period:'',summary:'',paragraphs:[''],sources:[{title:'',url:''}],related:[],location:'',governorate:'',figureQuery:'',certainty:'',images:[],hideImages:false,isPublished:false});
export default function HistoryAdminPanel({db,canDelete=false,initialItem=''}){
 const [entries,setEntries]=useState([]),[form,setForm]=useState(null),[revision,setRevision]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[search,setSearch]=useState('');
 const [saved,setSaved]=useState('');
 const editor=useAdminEditor({db,kind:'page',id:form?.slug?'history-'+form.slug:null,value:form,onRestore:setForm});
 const mounted=useRef(false);
 const api=useCallback(async(method='GET',body)=>{
  const session=await db.auth.getSession();
  const token=session.data?.session?.access_token;
  if(!token)throw Error('يجب تسجيل الدخول بحساب محرر.');
  const response=await fetch('/api/admin/history',{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(25000)});
  const data=await response.json().catch(()=>({error:'لم يصل رد صالح من الخادم.'}));
  if(!response.ok)throw Error(data.error||'تعذر تحميل المحتوى.');
  return data;
 },[db]);
 const choose=entry=>{const next=structuredClone(entry);setForm(next);setSaved(JSON.stringify(next));setMessage('');editor.markClean(next);};
 const load=useCallback(async()=>{
  setLoading(true);setMessage('');
  try{const data=await api();if(!mounted.current)return;setEntries(data.entries);setRevision(data.revision);const next=data.entries.find(x=>x.slug===initialItem)||data.entries[0]||blank();setForm(structuredClone(next));setSaved(JSON.stringify(next));editor.markClean(next);}
  catch(error){if(mounted.current)setMessage('خطأ: '+error.message);}
  finally{if(mounted.current)setLoading(false);}
 },[api,editor.markClean,initialItem]);
 useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;};},[load]);
 const patch=(key,value)=>{setForm(f=>({...f,[key]:value}));setMessage('');};
 const pick=entry=>{if(!editor.confirm())return;choose(entry);};
 async function save(e){
  e.preventDefault();if(busy||!form)return;setBusy(true);setMessage('');
  try{const result=await api('PUT',{entry:form,revision});setEntries(result.entries);setRevision(result.revision);const latest=result.entries.find(x=>x.slug===form.slug);choose(latest);await editor.clearDraft();setMessage('تم حفظ المادة بنجاح. افتح صفحة تاريخ اليمن أو حدّثها لرؤية التغييرات.');}
  catch(error){setMessage('خطأ: '+error.message);}
  finally{setBusy(false);}
 }
 async function remove(){
  if(!form||!canDelete||entries.find(x=>x.slug===form.slug)?.slug===undefined)return;
  if(!editor.confirm()||!window.confirm('حذف هذه المادة نهائياً؟ المواد الأساسية لا تُحذف ويمكن إخفاؤها من خيار النشر.'))return;
  setBusy(true);
  try{const response=await api('DELETE',{slug:form.slug,revision});setEntries(response.entries);setRevision(response.revision);choose(response.entries[0]||blank());setMessage('تم حذف المادة الإضافية.');}
  catch(error){setMessage('خطأ: '+error.message);}
  finally{setBusy(false);}
 }
 const filtered=entries.filter(x=>(x.title+' '+x.slug+' '+x.period).includes(search));
 const field=(label,element)=> <label className={styles.field}><span>{label}</span>{element}</label>;
 return <div className={styles.root}>
  <header className={styles.head}><div><h2><BookOpen size={23}/> إدارة تاريخ اليمن</h2><p>أنشئ ملفات الدول والأحداث والوثائق والحياة الاجتماعية؛ عدّل المصادر والروابط واحفظ النشر دون تعديل الكود. المواد الأساسية قابلة للإخفاء لا الحذف.</p></div><button className="btn btn-outline" type="button" onClick={()=>{if(editor.confirm())load();}} disabled={busy}><RefreshCcw size={16}/> تحديث</button></header>
  {message&&<p className={'feedback '+(message.startsWith('خطأ')?'error':'success')} role={message.startsWith('خطأ')?'alert':'status'}>{message}</p>}
  {loading?<p role="status">جارٍ تحميل أرشيف تاريخ اليمن…</p>:<div className={styles.layout}>
   <aside className={styles.list}><div className={styles.listTop}><h3>المواد ({entries.length})</h3><button className="btn btn-outline" type="button" disabled={busy} onClick={()=>{if(editor.confirm())choose(blank());}}><Plus size={16}/> مادة جديدة</button></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث في المواد..." aria-label="بحث في المواد"/>
   <div className={styles.listItems}>{filtered.map(x=><button type="button" key={x.slug} onClick={()=>pick(x)} className={form?.slug===x.slug?styles.selected:''}><strong>{x.title}</strong><small>{historyKinds[x.kind]} · {x.isPublished?'منشورة':'غير منشورة'}</small></button>)}</div></aside>
   {form&&<form className={styles.form} onSubmit={save}>
    <div className={styles.formHead}><h3>{entries.some(x=>x.slug===form.slug)?'تحرير مادة تاريخية':'إنشاء مادة جديدة'}</h3>{entries.some(x=>x.slug===form.slug)&&<Link href={'/yemen-history/'+form.slug} target="_blank" rel="noopener noreferrer">معاينة <ExternalLink size={15}/></Link>}</div>
    <fieldset disabled={busy} className={styles.fields}>
     {field('عنوان المادة',<input required maxLength={160} value={form.title} onChange={e=>patch('title',e.target.value)}/>)}
     <div className={styles.two}>{field('رابط المادة (بالإنجليزية)',<input required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={90} value={form.slug} readOnly={entries.some(x=>x.slug===form.slug)} onChange={e=>patch('slug',e.target.value)}/>)}{field('السنة المرجعية (سالب = ق.م)',<input type="number" required min={-30000} max={2100} value={form.year} onChange={e=>patch('year',Number(e.target.value))}/>)}</div>
     <div className={styles.two}>{field('التصنيف',<select value={form.kind} onChange={e=>patch('kind',e.target.value)}>{Object.entries(historyKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>)}{field('العصر',<select value={form.era} onChange={e=>patch('era',e.target.value)}>{historyEras.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>)}</div>
     {field('الفترة التاريخية المعروضة',<input maxLength={180} required value={form.period} onChange={e=>patch('period',e.target.value)}/>)}
     {field('ملخص المادة',<textarea required minLength={25} maxLength={700} rows={3} value={form.summary} onChange={e=>patch('summary',e.target.value)}/>)}
     {field('فقرات المادة (افصل بين الفقرات بسطر فارغ)',<textarea required rows={11} value={form.paragraphs.join('\n\n')} onChange={e=>patch('paragraphs',e.target.value.split(/\n\s*\n/))}/>)}
     {field('المراجع – سطر لكل مصدر بالصيغة: العنوان | https://example.com',<textarea required rows={4} dir="auto" value={form.sources.map(s=>s.title+' | '+s.url).join('\n')} onChange={e=>patch('sources',e.target.value.split('\n').filter(Boolean).map(line=>{const j=line.lastIndexOf(' | ');return j<0?{title:line,url:''}:{title:line.slice(0,j),url:line.slice(j+3)}}))}/>)}
     <div className={styles.photoEditor}>
      <h4>الصور والوثائق البصرية</h4>
      <p>يمكنك إضافة ما يصل إلى 8 صور مرخّصة من ويكيميديا كومنز. كل سطر: اسم الملف | وصف الصورة | المصور أو المصدر | الترخيص. صور الأرشيف الافتراضية سياقية، أما الصور الجديدة فيمكن تخصيصها لكل مادة.</p>
      <p><a href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image" target="_blank" rel="noopener noreferrer">البحث عن الصور في ويكيميديا كومنز ↗</a></p>
      {field('صور المادة – سطر لكل صورة (اختياري)',<textarea dir="auto" rows={5} value={(form.images||[]).map(i=>[i.file,i.caption,i.credit,i.license].join(' | ')).join('\n')} onChange={e=>patch('images',e.target.value.split('\n').filter(Boolean).map(line=>{const parts=line.split(' | ');return {file:parts[0]||'',caption:parts[1]||'',credit:parts[2]||'',license:parts.slice(3).join(' | ')||'',kind:'context'};}))}/>)}
      <label className={styles.publish}><input type="checkbox" checked={form.hideImages===true} onChange={e=>patch('hideImages',e.target.checked)}/> إخفاء صور هذه المادة تماماً</label>
      {!form.hideImages&&<div><small>معاينة أول صورة للمادة:</small><HistoryMedia entry={form} variant="thumbnail"/></div>}
     </div>
     <div className={styles.two}>{field('اسم المكان المرتبط',<input maxLength={120} value={form.location||''} onChange={e=>patch('location',e.target.value)}/>)}{field('المحافظة المعاصرة',<select value={form.governorate||''} onChange={e=>patch('governorate',e.target.value)}><option value="">غير محددة</option>{yemenGovernorates.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>)}</div>
     {field('روابط مواد مرتبطة (أسماء Slug تفصلها فاصلة)',<input dir="ltr" value={(form.related||[]).join(', ')} onChange={e=>patch('related',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/>)}
     <div className={styles.two}>{field('بحث عن شخصية مرتبطة (اختياري)',<input value={form.figureQuery||''} maxLength={120} onChange={e=>patch('figureQuery',e.target.value)}/>)}{field('ملاحظة حدود التوثيق (اختياري)',<input value={form.certainty||''} maxLength={150} onChange={e=>patch('certainty',e.target.value)}/>)}</div>
     <label className={styles.publish}><input type="checkbox" checked={form.isPublished} onChange={e=>patch('isPublished',e.target.checked)}/> نشر المادة للزوار</label>
    </fieldset>
    <div className={styles.actions}><button className="btn btn-red" disabled={busy||!form.title} type="submit"><Save size={16}/> {busy?'جارٍ الحفظ…':'نشر التعديلات'}</button>{canDelete&&entries.some(x=>x.slug===form.slug)&&<button className="btn btn-outline" type="button" disabled={busy} onClick={remove}><Trash2 size={16}/> حذف مادة إضافية</button>}<span>{JSON.stringify(form)!==saved?'لديك تغييرات غير محفوظة':''}</span></div>
   </form>}
  </div>}
 </div>;
}
