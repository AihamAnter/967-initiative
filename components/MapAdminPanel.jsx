'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MapPinned,Save,RefreshCw,ArrowUpLeft} from 'lucide-react';
import {contentPatch,inlineContentRequest,saveInlineContent} from '@/lib/inlineContentClient';
import useUnsavedChanges from './debates/useUnsavedChanges';

const editable={governorate:['capital','description','history','geography','economy','landmarks','image_url'],district:['capital','description','landmarks','image_url']};
const labels={capital:'المركز الإداري',description:'النبذة التعريفية',history:'نبذة تاريخية',geography:'الطبيعة والتضاريس',economy:'الاقتصاد',landmarks:'المعالم والأنشطة',image_url:'رابط الصورة'};
export default function MapAdminPanel({db,initialItem='',initialRegion='governorate',onDirtyChange}){
 const [kind,setKind]=useState(initialRegion),[catalog,setCatalog]=useState(null),[selected,setSelected]=useState(initialItem),[item,setItem]=useState(null),[draft,setDraft]=useState({}),[revision,setRevision]=useState(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
 const generation=useRef(0),alive=useRef(true);
 const baseline=item?Object.fromEntries(editable[kind].map(key=>[key,item[key]||''])):{};
 const patch=item?contentPatch(baseline,draft):{},dirty=Boolean(Object.keys(patch).length);
 useUnsavedChanges(dirty);
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{alive.current=true;fetch('/data/yemen-map/yemen-boundaries.json').then(response=>response.ok?response.json():Promise.reject()).then(data=>{if(alive.current)setCatalog(data);}).catch(()=>{if(alive.current)setNotice({error:true,text:'تعذر تحميل فهرس الأماكن. أعد فتح القسم.'});});return()=>{alive.current=false;};},[]);
 const load=useCallback(async()=>{
  const version=++generation.current;setItem(null);setNotice(null);if(!selected)return;setLoading(true);
  try{const result=await inlineContentRequest(db,'/api/admin/inline?view=content&kind='+kind+'&id='+encodeURIComponent(selected));if(!alive.current||version!==generation.current)return;setItem(result.item);setRevision(result.revision);setDraft(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));}
  catch(error){if(alive.current&&version===generation.current)setNotice({error:true,text:error.status===404?'لا يوجد ملف وصفي محفوظ لهذا المكان. يلزم تطبيق ملف تهيئة بيانات الخريطة المعتمد قبل تحريره. لم تُنشأ قيم افتراضية.':error.message});}
  finally{if(alive.current&&version===generation.current)setLoading(false);}
 },[db,kind,selected]);
 useEffect(()=>{load();},[load]);
 const discard=()=>!dirty||window.confirm('لديك تعديلات غير محفوظة. هل تريد تجاهلها؟');
 async function save(event){event.preventDefault();if(!item||busy||!dirty)return;setBusy(true);setNotice(null);try{const result=await saveInlineContent(db,kind,item.id,revision,patch);if(!alive.current)return;setItem(result.item);setRevision(result.revision);setDraft(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));setNotice({error:false,text:'تم حفظ الملف الوصفي للمكان.'});}catch(error){if(alive.current)setNotice({error:true,text:error.message});}finally{if(alive.current)setBusy(false);}}
 const regions=catalog?(kind==='district'?catalog.districts:catalog.governorates):[];
 return <section className="admin-panel"><h2><MapPinned size={20}/> تحرير معلومات الخريطة</h2><p>تحرير البيانات الوصفية المرتبطة بالمكان. الحدود والإحداثيات والأرقام الأساسية تُراجع في مصادرها المتخصصة.</p>
  <div className="form-row"><label>نوع المكان<select disabled={busy} value={kind} onChange={event=>{if(discard()){setKind(event.target.value);setSelected('');}}}><option value="governorate">محافظة</option><option value="district">مديرية</option></select></label><label>المكان<select disabled={busy||!catalog} value={selected} onChange={event=>{if(discard())setSelected(event.target.value);}}><option value="">اختر مكاناً</option>{regions.map(region=><option key={region.id} value={region.id}>{kind==='district'?region.governorateNameAr+' / ':''}{region.nameAr}</option>)}</select></label></div>
  {notice&&<p className={'feedback '+(notice.error?'error':'success')} role={notice.error?'alert':'status'}>{notice.text}</p>}
  {loading?<p role="status">جارٍ تحميل أحدث ملف…</p>:item?<form className="admin-form" onSubmit={save}><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><h3>{item.name_ar} <small dir="ltr">{item.id}</small></h3>{editable[kind].map(key=><label key={key}>{labels[key]}{key==='image_url'?<input type="url" dir="ltr" value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>:key==='capital'?<input value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>:<textarea rows={4} value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>}</label>)}<div className="company-admin-actions"><button className="btn btn-primary" disabled={busy||!dirty}><Save size={17}/>{busy?'جارٍ الحفظ…':'حفظ معلومات المكان'}</button><button className="btn btn-outline" type="button" disabled={busy} onClick={()=>{if(discard())load();}}><RefreshCw size={17}/> إعادة تحميل المحفوظ</button><a className="btn btn-outline" href={'/yemen-map?'+(kind==='district'?'district=':'region=')+encodeURIComponent(selected)+'#map'}>عرض المكان <ArrowUpLeft size={17}/></a></div></fieldset></form>:!selected&&<p className="small-muted">اختر المحافظة أو المديرية للوصول إلى ملفها.</p>}
 </section>;
}
