'use client';
import ValidatedForm,{FormInput,FormTextarea,FormSelect,FormLabel} from './debates/ValidatedForm';
import {revealInvalidField,trackEditorFiles} from './admin/formHelpers';
import useAdminEditor from './admin/useAdminEditor';
import EditorActions from './admin/EditorActions';
import DistrictProfileEditor from './DistrictProfileEditor';

import {useCallback,useEffect,useRef,useState} from 'react';
import {MapPinned,Save,RefreshCw,ArrowUpLeft} from 'lucide-react';
import {contentPatch,inlineContentRequest,saveInlineContent} from '@/lib/inlineContentClient';
import useUnsavedChanges from './debates/useUnsavedChanges';

const editable={governorate:['capital','description','history','geography','economy','landmarks','image_url'],district:['capital','description','landmarks','image_url']};
const labels={capital:'المركز الإداري',description:'النبذة التعريفية',history:'نبذة تاريخية',geography:'الطبيعة والتضاريس',economy:'الاقتصاد',landmarks:'المعالم والأنشطة',image_url:'رابط الصورة'};
export default function MapAdminPanel({db,initialItem='',initialRegion='governorate',onDirtyChange}){
 const [kind,setKind]=useState(initialRegion),[catalog,setCatalog]=useState(null),[selected,setSelected]=useState(initialItem),[item,setItem]=useState(null),[draft,setDraft]=useState({}),[revision,setRevision]=useState(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
 const generation=useRef(0),alive=useRef(true);
 const [governorateFilter,setGovernorateFilter]=useState('');
 const [districtDirty,setDistrictDirty]=useState(false),[districtBusy,setDistrictBusy]=useState(false);
 const baseline=item?Object.fromEntries(editable[kind].map(key=>[key,item[key]||''])):{};
 const editor=useAdminEditor({db,kind:'governorate',id:kind==='governorate'?selected:null,value:draft,onRestore:setDraft,active:kind==='governorate'});
 const {markClean}=editor;
 const patch=item?contentPatch(baseline,draft):{},dirty=Boolean(Object.keys(patch).length);
 useUnsavedChanges(false);
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{alive.current=true;fetch('/data/yemen-map/yemen-boundaries.json').then(response=>response.ok?response.json():Promise.reject()).then(data=>{if(alive.current)setCatalog(data);}).catch(()=>{if(alive.current)setNotice({error:true,text:'تعذر تحميل فهرس الأماكن. أعد فتح القسم.'});});return()=>{alive.current=false;};},[]);
 const load=useCallback(async()=>{
  const version=++generation.current;setItem(null);setNotice(null);setLoading(false);if(!selected||kind==='district')return;setLoading(true);
  try{const result=await inlineContentRequest(db,'/api/admin/inline?view=content&kind='+kind+'&id='+encodeURIComponent(selected));if(!alive.current||version!==generation.current)return;setItem(result.item);setRevision(result.revision);setDraft(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));markClean(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));}
  catch(error){if(alive.current&&version===generation.current)setNotice({error:true,text:error.status===404?'لا يوجد ملف وصفي محفوظ لهذا المكان. يلزم تطبيق ملف تهيئة بيانات الخريطة المعتمد قبل تحريره. لم تُنشأ قيم افتراضية.':error.message});}
  finally{if(alive.current&&version===generation.current)setLoading(false);}
 },[db,kind,selected,markClean]);
 useEffect(()=>{load();},[load]);
 const discard=()=>!districtBusy&&((!editor.unprotected&&!districtDirty)||window.confirm('لديك تعديلات غير محفوظة. هل تريد تجاهلها؟'));
 async function save(event){event.preventDefault();if(!item||busy||!dirty)return;setBusy(true);setNotice(null);try{const result=await saveInlineContent(db,kind,item.id,revision,patch);if(!alive.current)return;setItem(result.item);setRevision(result.revision);setDraft(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));markClean(Object.fromEntries(editable[kind].map(key=>[key,result.item[key]||''])));await editor.clearDraft();setNotice({error:false,text:'تم حفظ الملف الوصفي للمكان.'});}catch(error){if(alive.current)setNotice({error:true,text:error.message});}finally{if(alive.current)setBusy(false);}}
 const regions=catalog?(kind==='district'?catalog.districts.filter(region=>!governorateFilter||region.governorateId===governorateFilter):catalog.governorates):[];
 return <section className="admin-panel map-admin-panel"><h2><MapPinned size={20}/> تحرير معلومات الخريطة</h2><p>حرّر النبذة والتاريخ والطبيعة والاقتصاد والمعالم. تدعم ملفات المديريات المصادر والأرقام والصور الموثقة، وتبقى الحدود والهوية الإدارية مرتبطة بفهرس الخريطة.</p>
  <div className="form-row"><FormLabel>نوع المكان<FormSelect disabled={busy} value={kind} onChange={event=>{if(discard()){setKind(event.target.value);setSelected('');}}}><option value="governorate">محافظة</option><option value="district">مديرية</option></FormSelect></FormLabel><FormLabel>المكان<FormSelect disabled={busy||!catalog} value={selected} onChange={event=>{if(discard())setSelected(event.target.value);}}><option value="">اختر مكاناً</option>{regions.map(region=><option key={region.id} value={region.id}>{kind==='district'?region.governorateNameAr+' / ':''}{region.nameAr}</option>)}</FormSelect></FormLabel></div>
  {kind==='district'&&catalog&&<FormLabel>تصفية المديريات بالمحافظة<FormSelect value={governorateFilter} disabled={busy||districtBusy} onChange={event=>{if(discard()){setGovernorateFilter(event.target.value);setSelected('');}}}><option value="">جميع المحافظات</option>{catalog.governorates.map(region=><option key={region.id} value={region.id}>{region.nameAr}</option>)}</FormSelect><small>اختيار المحافظة يضيّق قائمة الأماكن أعلاه.</small></FormLabel>}
  {kind==='district'&&selected&&<DistrictProfileEditor key={selected} db={db} id={selected} onDirtyChange={setDistrictDirty} onBusyChange={setDistrictBusy}/>}
  {notice&&<p className={'feedback '+(notice.error?'error':'success')} role={notice.error?'alert':'status'}>{notice.text}</p>}
  {loading?<p role="status">جارٍ تحميل أحدث ملف…</p>:item?<ValidatedForm className="admin-form" onSubmit={save} data-editor-key={editor.key} onInvalidCapture={revealInvalidField} onChangeCapture={event=>trackEditorFiles(event,editor)}><EditorActions editor={editor} busy={busy} value={{...draft,title:item.name_ar}} published allowNew={false}/><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><h3>{item.name_ar} <small dir="ltr">{item.id}</small></h3>{editable[kind].map(key=><FormLabel key={key}>{labels[key]}{key==='image_url'?<FormInput type="url" dir="ltr" value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>:key==='capital'?<FormInput value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>:<FormTextarea rows={4} value={draft[key]} onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/>}</FormLabel>)}</fieldset></ValidatedForm>:!selected&&<p className="small-muted">اختر المحافظة أو المديرية للوصول إلى ملفها.</p>}
 </section>;
}
