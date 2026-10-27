'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {BookOpenText,RefreshCw,Save,FileText} from 'lucide-react';
import ValidatedForm,{FormInput,FormTextarea,FormLabel} from './debates/ValidatedForm';
import IndicatorEditorial from './IndicatorEditorial';
import useAdminEditor from './admin/useAdminEditor';
import {
  emptyIndicatorEditorial,electricityEditorialDraft,editorialFieldLimits,
  normalizeIndicatorEditorial,editorialReferencesToText,parseEditorialReferences,validateIndicatorEditorial,
} from '@/lib/indicatorEditorial';

const formFrom=row=>({...normalizeIndicatorEditorial(row),references_text:editorialReferencesToText(row?.reference_links)});
const blankForm=()=>formFrom(emptyIndicatorEditorial);
const editableFields=[
  {key:'intro',title:'خلاصة المؤشر بلغة واضحة',rows:4,hint:'ماذا تعني أحدث قيمة، وما سنة القياس؟'},
  {key:'why_it_matters',title:'لماذا يهم هذا المؤشر؟',rows:5,hint:'ما الفائدة المعرفية لهذا الرقم في السياق اليمني؟'},
  {key:'historical_context',title:'قراءة السلسلة التاريخية',rows:6,hint:'اعرض نقاطاً من السنوات المتاحة، وفرق النقاط المئوية عن نسب النمو.'},
  {key:'limitations',title:'حدود البيانات وما لا يقيسه المؤشر',rows:5,hint:'ماذا لا نستطيع استنتاجه، وهل البيانات قديمة أو تقديرية؟'},
  {key:'source_notes',title:'ملاحظات المصدر والمنهجية',rows:4,hint:'تعريف المصدر، وطبيعة التقدير، وأي احتياطات توثيقية.'},
];

export default function IndicatorEditorialAdmin({db,indicator,onDirtyChange}) {
  const [original,setOriginal]=useState(null);
  const [saved,setSaved]=useState(blankForm);
  const [form,setForm]=useState(blankForm);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [preview,setPreview]=useState(false);
  const [schemaMissing,setSchemaMissing]=useState(false);
  const editor=useAdminEditor({db,kind:'statistic',id:'editorial_'+indicator.id,value:form,onRestore:setForm,active:true});
  const dirty=useMemo(()=>JSON.stringify(form)!==JSON.stringify(saved),[form,saved]);
  useEffect(()=>{onDirtyChange?.(dirty);return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);

  const load=useCallback(async()=>{
    setLoading(true);setError('');setNotice('');setSchemaMissing(false);
    const {data,error:dbError}=await db.from('stat_indicator_editorial')
      .select('*').eq('indicator_id',indicator.id).maybeSingle();
    if(dbError){
      setError(dbError.code==='42P01'||dbError.code==='PGRST205'?
        'لم تُطبّق Migration الإثراء في قاعدة البيانات المستهدفة بعد. لا يمكن الحفظ حتى اختبارها وتطبيقها.':
        'تعذر تحميل النص المعرفي. تحقق من صلاحيات المحرر والاتصال.');
      setSchemaMissing(dbError.code==='42P01'||dbError.code==='PGRST205');
    } else {
      const next=formFrom(data);setOriginal(data);setSaved(next);setForm(next);editor.markClean(next);
    }
    setLoading(false);
  },[db,indicator.id,editor.markClean]);

  useEffect(()=>{load();},[load]);

  function change(key,value){setForm(old=>({...old,[key]:value}));setNotice('');setError('');}
  function loadElectricityDraft(){
    if(dirty&&!window.confirm('سيؤدي تحميل النموذج إلى استبدال تعديلاتك غير المحفوظة. هل تريد الاستمرار؟'))return;
    setForm(formFrom(electricityEditorialDraft));setPreview(true);setNotice('حُمّلت مسودة الكهرباء داخل المحرر فقط. لم تُحفظ أو تُنشر.');
  }
  function reset(){
    if(dirty&&!window.confirm('تجاهل كل التعديلات غير المحفوظة؟'))return;
    setForm({...saved});setError('');setNotice('');setPreview(false);
  }
  async function save(event){
    event.preventDefault();if(saving||loading||schemaMissing||!dirty)return;
    setError('');setNotice('');
    let payload;
    try {
      payload=validateIndicatorEditorial({...form,reference_links:parseEditorialReferences(form.references_text)});
    }catch(err){setError(err.message);return;}
    if(payload.is_published&&!window.confirm('سيظهر هذا النص أو تحديثه فوراً للزوار في البيئة المتصلة. هل تمت مراجعة جميع الأرقام والمراجع؟'))return;
    setSaving(true);
    try {
      const {data,error:dbError}=await db.rpc('editorial_stat_indicator_enrichment_save',{
        p_indicator_id:indicator.id,p_revision:original?.revision??null,p_data:payload,
      });
      if(dbError){
        if(dbError.code==='40001')throw new Error('عُدّل النص من جلسة أخرى. أعد تحميل النسخة الحديثة قبل الحفظ.');
        if(dbError.code==='42501')throw new Error('ليس لديك تصريح بحفظ الشروحات المعرفية.');
        if(dbError.code==='PGRST202')throw new Error('دالة حفظ الإثراء غير موجودة؛ يجب اختبار Migration الجديدة وتطبيقها أولاً.');
        throw new Error(dbError.message||'تعذر حفظ النص.');
      }
      const next=formFrom(data);setOriginal(data);setSaved(next);setForm(next);editor.markClean(next);await editor.clearDraft();
      setNotice(data.is_published?'حُفظت القراءة المعرفية ونُشرت.':'حُفظت مسودة القراءة المعرفية دون نشر.');
    }catch(err){setError(err.message);}
    finally{setSaving(false);}
  }

  let previewReferences=[];
  try {previewReferences=parseEditorialReferences(form.references_text);}catch {}
  return <section className="admin-panel" aria-label="محرر إثراء المؤشر">
    <h2><BookOpenText size={20}/> إثراء المحتوى المعرفي</h2>
    <p className="small-muted">هذا النص مستقل عن قيم المؤشر والرسوم والمصادر الرقمية. يمكن حفظ مسودة دون نشرها، ومراجعة النتيجة قبل إتاحتها للزوار.</p>
    <p className="small-muted">المؤشر المحدد: <strong>{indicator.name}</strong></p>
    {error&&<p className="feedback error" role="alert">{error}</p>}
    {notice&&<p className="feedback success" role="status">{notice}</p>}
    {loading?<p role="status">جارٍ تحميل المسودة المعرفية…</p>:<ValidatedForm className="admin-form" onSubmit={save}>
      <fieldset className="admin-editor-fields" disabled={saving}>
        {editableFields.map(field=><FormLabel key={field.key}>{field.title}
          <FormTextarea rows={field.rows} maxLength={editorialFieldLimits[field.key]} value={form[field.key]} onChange={event=>change(field.key,event.target.value)} placeholder={field.hint}/>
          <small className="small-muted">{form[field.key].length} / {editorialFieldLimits[field.key]} حرف</small>
        </FormLabel>)}
        <FormLabel>المراجع المباشرة (كل مرجع في سطر: اسم المرجع | الرابط)
          <FormTextarea rows={4} dir="ltr" value={form.references_text} onChange={event=>change('references_text',event.target.value)} placeholder="World Bank | https://data.worldbank.org/..."/>
        </FormLabel>
        <FormLabel>تاريخ مراجعة المصادر
          <FormInput type="date" value={form.reviewed_on} onChange={event=>change('reviewed_on',event.target.value)}/>
        </FormLabel>
        <FormLabel className="checkline">
          <FormInput type="checkbox" checked={form.is_published} onChange={event=>change('is_published',event.target.checked)}/>
          نشر القراءة المعرفية للعامة بعد مراجعتها
        </FormLabel>
        <p className="small-muted">لا يمكن نشر الشرح دون خلاصة وحدود واضحة ورابط مرجع وتاريخ مراجعة. النشر لا يغيّر قيم المؤشر.</p>
        <div className="admin-form-actions" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button className="btn btn-outline" type="button" disabled={saving||editor.draftBusy} onClick={()=>editor.saveDraft().catch(err=>setError(err.message))}>حفظ مسودة خاصة بالحساب</button>
          {editor.draft&&<button className="btn btn-outline" type="button" onClick={editor.restoreDraft}>استعادة المسودة الخاصة</button>}
          <button className="btn btn-red" type="submit" disabled={!dirty||saving||schemaMissing}><Save size={17}/> {saving?'جارٍ الحفظ…':'حفظ النص المعرفي'}</button>
          <button className="btn btn-outline" type="button" onClick={()=>setPreview(x=>!x)}><FileText size={17}/> {preview?'إخفاء المعاينة':'معاينة عرض الزائر'}</button>
          <button className="btn btn-outline" type="button" onClick={reset}>تراجع عن التعديلات</button>
          <button className="btn btn-outline" type="button" onClick={()=>{if(!dirty||window.confirm('تجاهل التعديلات غير المحفوظة وإعادة التحميل؟'))load();}}><RefreshCw size={16}/> إعادة تحميل</button>
        </div>
        {editor.draftMessage&&<p className="small-muted" role="status">{editor.draftMessage}</p>}
        {indicator.slug==='access-to-electricity'&&<button className="btn btn-outline" type="button" onClick={loadElectricityDraft}>تحميل نموذج إثراء الكهرباء غير المنشور</button>}
      </fieldset>
    </ValidatedForm>}
    {preview&&<div aria-label="معاينة النص المعرفي"><IndicatorEditorial data={{...form,reference_links:previewReferences}} indicatorName={indicator.name} preview/></div>}
  </section>;
}
