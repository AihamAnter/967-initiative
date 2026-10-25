'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Save,RefreshCw,ArrowUpLeft,Plus,Trash2} from 'lucide-react';
import {useInlineEditor} from './InlineEditorProvider';
import {contentPatch} from '@/lib/inlineContentClient';
import {canEditInlineTarget,inlineTargetKinds} from '@/lib/inlineEditorTargets';
import {safeExternalUrl} from '@/lib/media';
import ValidatedForm,{FormInput,FormTextarea,FormLabel} from '@/components/debates/ValidatedForm';

const field=(key,label,options={})=>({key,label,...options});
const schemas={
 issue:[field('title','عنوان العدد',{required:true,maxLength:250}),field('summary','ملخص العدد',{multiline:true}),field('issue_date','تاريخ الإصدار',{type:'date',required:true}),field('cover_url','رابط الغلاف',{type:'url'}),field('pdf_url','رابط ملف PDF',{type:'url',required:true})],
 work:[field('title','عنوان العمل',{required:true,maxLength:250}),field('summary','وصف العمل',{multiline:true}),field('thumbnail_url','رابط الصورة المصغرة',{type:'url'}),field('external_url','رابط الفيديو أو العمل',{type:'url',required:true}),field('category','التصنيف',{required:true}),field('platform','منصة النشر',{required:true})],
 company:[field('name','اسم المنشأة',{required:true}),field('summary','وصف المنشأة',{multiline:true}),field('category','التصنيف',{required:true}),field('location','المحافظة',{required:true}),field('address','العنوان'),field('website','الموقع الإلكتروني',{type:'url'}),field('google_maps_url','رابط الموقع على الخريطة',{type:'url'}),field('email','البريد المنشور',{type:'email'}),field('phone','الهاتف المنشور'),field('image_url','رابط صورة المنشأة',{type:'url'})],
 professional:[field('full_name','الاسم الظاهر',{required:true}),field('profession_title','المهنة',{required:true}),field('bio','الوصف',{multiline:true}),field('services','الخدمات · خدمة في كل سطر',{multiline:true,list:true,required:true}),field('location','المحافظة أو المنطقة',{required:true}),field('service_areas','مناطق الخدمة · منطقة في كل سطر',{multiline:true,list:true}),field('phone','الهاتف المصرح بنشره'),field('whatsapp','واتساب المصرح بنشره'),field('email','البريد المصرح بنشره',{type:'email'}),field('website','الموقع الإلكتروني',{type:'url'}),field('instagram','إنستغرام',{type:'url'}),field('profile_image_url','رابط صورة الملف المصرح بنشرها',{type:'url'})],
 figure:[field('full_name','اسم الشخصية',{required:true}),field('known_for','التعريف المختصر',{required:true}),field('short_bio','السيرة والنبذة',{multiline:true,required:true}),field('field','المجال',{required:true}),field('birth_year','سنة الميلاد',{type:'number',min:500,max:2100,number:true}),field('death_year','سنة الوفاة',{type:'number',min:500,max:2100,number:true}),field('image_url','رابط الصورة',{type:'url'}),field('image_credit','نسب الصورة'),field('image_source_url','مصدر الصورة',{type:'url'})],
 page:[field('title','عنوان الصفحة',{required:true,maxLength:160}),field('description','وصف الصفحة والبحث',{multiline:true,required:true,maxLength:600}),field('summary','ملخص البداية',{multiline:true,maxLength:1800})],
 governorate:[field('capital','المركز الإداري'),field('description','وصف المحافظة',{multiline:true}),field('history','نبذة تاريخية',{multiline:true}),field('geography','الطبيعة والتضاريس',{multiline:true}),field('economy','الاقتصاد',{multiline:true}),field('landmarks','المعالم',{multiline:true}),field('image_url','رابط الصورة',{type:'url'})],
 district:[field('capital','المركز الإداري'),field('description','وصف المديرية',{multiline:true}),field('landmarks','المعالم',{multiline:true}),field('image_url','رابط الصورة',{type:'url'})],
};
const list=value=>Array.isArray(value)?value.join('\n'):value||'';
const draftFor=(item,fields)=>Object.fromEntries(fields.map(spec=>[spec.key,spec.list?list(item[spec.key]):item[spec.key]??'']));
const noFields=[];
const validContentUrl=(value,original)=>!value||value===original||safeExternalUrl(value)?'':'أدخل رابط HTTP أو HTTPS صالحاً دون بيانات دخول.';

export default function InlineContentEditor({target,onSaved,onDirtyChange,onBusyChange}){
 const {request}=useInlineEditor();
 const [loaded,setLoaded]=useState(null),[draft,setDraft]=useState({}),[products,setProducts]=useState([]),[publication,setPublication]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(null);
 const [correction,setCorrection]=useState(false);
 const loadVersion=useRef(0),mounted=useRef(true);
 const fields=schemas[target.kind]||noFields,specialized=Boolean(inlineTargetKinds[target.kind]?.advanced)||!canEditInlineTarget(target);
 const invalidateLoad=useCallback(()=>{loadVersion.current++;},[]);
 const load=useCallback(async()=>{
  const version=++loadVersion.current;setLoading(true);setFeedback(null);
  try{
   let result,item;
   if(target.kind==='figure'){result=await request('/api/admin/figures?id='+encodeURIComponent(target.id));item=result.record;}
   else if(target.kind==='page'){result=await request('/api/admin/pages');item=result.pages.find(page=>page.id===target.id||page.slug===target.slug);}
   else{result=await request('/api/admin/inline?view=content&kind='+encodeURIComponent(target.kind)+'&id='+encodeURIComponent(target.id));item=result.item;}
   if(!mounted.current||version!==loadVersion.current)return;
   if(!item)throw Error('لم يعد العنصر متاحاً. افتح المحرر الكامل للتحقق.');
   setLoaded({...result,item});setDraft(draftFor(item,schemas[target.kind]||[]));setProducts(structuredClone(item.products||[]));setPublication(Boolean(item.is_published));
  }catch(error){if(mounted.current&&version===loadVersion.current)setFeedback({error:true,text:error.message});}
  finally{if(mounted.current&&version===loadVersion.current)setLoading(false);}
 },[request,target.kind,target.id,target.slug]);
 useEffect(()=>{mounted.current=true;if(!specialized)load();else setLoading(false);return()=>{mounted.current=false;invalidateLoad();};},[load,specialized,invalidateLoad]);
 const patch=useMemo(()=>{
  if(!loaded)return {};
  const baseline=draftFor(loaded.item,fields);
  const values=Object.fromEntries(fields.filter(spec=>JSON.stringify(draft[spec.key])!==JSON.stringify(baseline[spec.key])).map(spec=>[spec.key,spec.list?String(draft[spec.key]||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean):spec.number?(draft[spec.key]===''?null:Number(draft[spec.key])):draft[spec.key]]));
  if(Object.hasOwn(loaded.item,'is_published'))values.is_published=publication;
  if(target.kind==='company')values.products=products;
  return contentPatch(loaded.item,values);
 },[loaded,draft,publication,products,fields,target.kind]);
 const dirty=Object.keys(patch).length>0;
 useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 function changeProduct(index,key,value){setProducts(current=>current.map((product,i)=>i===index?{...product,[key]:value}:product));setFeedback(null);}
 async function save(event){
  event.preventDefault();if(busy||!loaded||!dirty)return;
  if(patch.is_published===false&&loaded.item.is_published&&!window.confirm('سيختفي هذا العنصر عن الزوار بعد الحفظ. هل تريد إلغاء نشره؟'))return;
  setBusy(true);setFeedback(null);
  try{
   let result;
   if(target.kind==='figure')result=await request('/api/admin/figures',{record:{...loaded.item,...patch},profile:loaded.profile,revision:loaded.revision},{method:'PUT'});
   else if(target.kind==='page')result=await request('/api/admin/pages',{page:{...loaded.item,...patch},revision:loaded.revision},{method:'PUT'});
   else result=await request('/api/admin/inline',{action:'content_save',kind:target.kind,id:target.id,revision:loaded.revision,data:patch,intent:correction?'correction':'update'});
   if(!mounted.current)return;
   onDirtyChange?.(false);setFeedback({error:false,text:'تم حفظ التعديلات بنجاح.'});
   await onSaved?.(target,result);
   if(mounted.current)await load();
  }catch(error){if(mounted.current)setFeedback({error:true,text:error.message,conflict:error.status===409});}
  finally{if(mounted.current)setBusy(false);}
 }
 const advanced=<a className="btn btn-outline" href={target.adminHref} aria-disabled={busy||undefined} onClick={event=>{if(busy)event.preventDefault();}}>فتح المحرر الكامل <ArrowUpLeft size={16}/></a>;
 if(specialized)return <div className="inline-content-editor"><p>{target.isDemo?'هذا محتوى استعراضي ولا يرتبط بسجل قابل للتحرير.':!canEditInlineTarget(target)?'افتح المحرر الكامل لاختيار السجل والتحقق من بياناته.':target.kind==='district'?'افتح ملف المديرية لتحرير النبذة والتاريخ والطبيعة والاقتصاد والمعالم، وتوثيق الأرقام والصور بمصادرها.':target.kind==='statistic'?'راجع السنة والوحدة والمصدر والمنهجية في المحرر المتخصص قبل تغيير أي قيمة.':'تُحسب المراتب من بيانات الدول. افتح المؤشر ومصدره في المحرر المتخصص.'}</p>{advanced}</div>;
 return <div className="inline-content-editor">
  <p>تعديل {inlineTargetKinds[target.kind]?.label} · تُحمّل أحدث نسخة قبل الحفظ.</p>
  {['governorate','district'].includes(target.kind)&&<p className="small-muted">هذه البيانات وصفية. الحدود والإحداثيات والهوية الإدارية ثابتة هنا.</p>}
  {target.kind==='professional'&&<p className="small-muted">أدخل فقط معلومات التواصل التي وافق صاحب الملف على نشرها.</p>}
  {target.kind==='page'&&['privacy','terms'].includes(target.slug)&&<p className="small-muted">راجع أثر التغيير القانوني قبل الحفظ. الحذف غير متاح من هذه النافذة.</p>}
  {feedback&&<p className={'feedback '+(feedback.error?'error':'success')} role={feedback.error?'alert':'status'}>{feedback.text}</p>}
  {loading?<p role="status">جارٍ تحميل أحدث نسخة…</p>:!loaded?<><button className="btn btn-outline" onClick={load}><RefreshCw size={16}/> إعادة المحاولة</button>{advanced}</>:<ValidatedForm className="admin-form" onSubmit={save}><fieldset disabled={busy} className="inline-content-fields">
   {fields.map(({key,label,multiline,list:ignoredList,number:ignoredNumber,...props})=><FormLabel key={key}>{label}{multiline?<FormTextarea {...props} rows={key==='short_bio'?7:3} value={draft[key]??''} onChange={event=>{setDraft(current=>({...current,[key]:event.target.value}));setFeedback(null);}}/>:<FormInput {...props} type={props.type==='url'?'text':props.type} inputMode={props.type==='url'?'url':undefined} validate={props.type==='url'?value=>validContentUrl(value,loaded.item[key]):undefined} value={draft[key]??''} dir={props.type==='url'||props.type==='email'?'ltr':undefined} onChange={event=>{setDraft(current=>({...current,[key]:event.target.value}));setFeedback(null);}}/>}</FormLabel>)}
   {target.kind==='company'&&<details className="inline-products"><summary>المنتجات ({products.length})</summary>{products.map((product,index)=><fieldset key={index}><legend>المنتج {index+1}</legend><FormLabel>اسم المنتج<FormInput required value={product.name||''} onChange={event=>changeProduct(index,'name',event.target.value)}/></FormLabel><FormLabel>وصف المنتج<FormTextarea value={product.description||''} onChange={event=>changeProduct(index,'description',event.target.value)}/></FormLabel><FormLabel>رابط الصورة<FormInput type="text" inputMode="url" dir="ltr" validate={value=>validContentUrl(value,loaded.item.products?.[index]?.image_url)} value={product.image_url||''} onChange={event=>changeProduct(index,'image_url',event.target.value)}/></FormLabel><button type="button" className="btn btn-outline" disabled={products.length<=1} onClick={()=>{if(window.confirm('إزالة هذا المنتج من القائمة عند الحفظ؟'))setProducts(current=>current.filter((_,i)=>i!==index));}}><Trash2 size={15}/> إزالة المنتج</button></fieldset>)}<button type="button" className="btn btn-outline" onClick={()=>setProducts(current=>[...current,{name:'',description:'',image_url:null,currency:'YER',sources:[]}])}><Plus size={15}/> إضافة منتج</button><p className="small-muted">يحفظ النموذج ترتيب المنتجات وبيانات الأسعار والمصادر الحالية. تعديل الأسعار والملفات متاح في المحرر الكامل.</p></details>}
   {Object.hasOwn(loaded.item,'is_published')&&<FormLabel className="checkline"><FormInput type="checkbox" checked={publication} onChange={event=>setPublication(event.target.checked)}/> منشور للعامة</FormLabel>}
   {!specialized&&['issue','work','company','professional','governorate','district'].includes(target.kind)&&<FormLabel className="checkline"><FormInput type="checkbox" checked={correction} onChange={e=>setCorrection(e.target.checked)}/> هذا التعديل تصحيح لمعلومة منشورة</FormLabel>}
   <div className="inline-content-actions"><button className="btn btn-primary" disabled={busy||!dirty}><Save size={17}/>{busy?'جارٍ الحفظ…':'حفظ التعديلات'}</button>{advanced}<button type="button" className="btn btn-outline" disabled={busy} onClick={()=>{if(!dirty||window.confirm('إعادة تحميل المحفوظ وتجاهل تعديلاتك؟'))load();}}><RefreshCw size={16}/> إعادة تحميل المحفوظ</button></div>
  </fieldset></ValidatedForm>}
 </div>;
}
