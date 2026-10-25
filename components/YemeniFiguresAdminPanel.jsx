'use client';
import ValidatedForm,{FormInput,FormTextarea,FormSelect,FormLabel} from './debates/ValidatedForm';
import {revealInvalidField,trackEditorFiles,publicationIntent} from './admin/formHelpers';
import useAdminEditor from './admin/useAdminEditor';
import EditorActions from './admin/EditorActions';
import AdminListTools,{useAdminList} from './admin/AdminListTools';
import AdminImageInput from './admin/AdminImageInput';
import {uploadAdminMedia} from '@/lib/adminUpload';


import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Eye, EyeOff, Landmark, Pencil, Save, Trash2, X} from 'lucide-react';
import {yemenGovernorates, yemeniFigureEras, yemeniFigureFields} from '@/lib/yemeniFigures';
import {validateMediaUpload} from '@/lib/uploads';
import {safeExternalUrl} from '@/lib/media';
import {emptyFigureProfile,validateFigureProfile} from '@/lib/figureProfiles';
import FigureProfileEditor from './FigureProfileEditor';
import {matchesSearch} from '@/lib/search';
import useAdminItemTarget from './inline/useAdminItemTarget';

const emptyFigure = () => ({
  full_name: '', slug: '', known_for: '', field: 'الأدب والشعر', governorate_id: '', era: 'معاصرة',
  birth_year: '', death_year: '', short_bio: '', image_url: '', website: '', facebook_url: '', instagram_url: '',
  x_url: '', youtube_url: '', image_credit:'',image_source_url:'',display_order: 0, is_published: false,
});
const cleanSlug = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
const isUrl = value => !value || Boolean(safeExternalUrl(value));

export default function YemeniFiguresAdminPanel({db, canDelete = false,initialItem = ''}) {
  const portraitBackup=useRef(null);
  const [figures, setFigures] = useState([]);
  const [figure, setFigure] = useState(emptyFigure);
  const [editingId, setEditingId] = useState(null);
  const [profile,setProfile]=useState(emptyFigureProfile);
  const [revision,setRevision]=useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [listQuery,setListQuery]=useState('');
  const fields = useMemo(() => [...new Set([...yemeniFigureFields, ...figures.map(item => item.field).filter(Boolean)])], [figures]);

  const editor=useAdminEditor({db,kind:'figure',id:editingId,value:{figure,profile},onRestore:value=>{setFigure(value.figure);setProfile(value.profile);}});
  const list=useAdminList(figures,'figures');
  const api=useCallback(async(method='GET',body,id)=>{
    const session=await db.auth.getSession();const token=session.data?.session?.access_token;
    if(!token)throw Error('سجل الدخول بحساب تحرير أولًا.');
    const response=await fetch('/api/admin/figures'+(id?'?id='+encodeURIComponent(id):''),{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000),cache:'no-store'});
    const result=await response.json();if(!response.ok)throw Error(result.error||'تعذر تنفيذ العملية.');return result;
  },[db]);
  const loadFigures=useCallback(async()=>{setLoading(true);try{const result=await api();setFigures(result.records);}catch(error){setNotice('خطأ: '+error.message);}finally{setLoading(false);}},[api]);

  useEffect(() => { loadFigures(); }, [loadFigures]);
  useAdminItemTarget({item:initialItem,rows:figures,loading,onSelect:editFigure,onMissing:()=>setNotice('خطأ: لم يتم العثور على الشخصية المطلوبة. لم يتغير أي محتوى.')});

  function setField(field, value) {
    setFigure(current => ({...current, [field]: value}));
  }

  function resetForm(clearNotice = true,force=false) {
    if(!force&&!editor.confirm())return;editor.markClean({figure:emptyFigure(),profile:emptyFigureProfile()});
    setEditingId(null);
    setProfile(emptyFigureProfile());setRevision(null);
    setFigure(emptyFigure());
    if (clearNotice) setNotice('');
  }

  async function editFigure(selected,force=false) {
    if(!force&&!editor.confirm())return;
    portraitBackup.current=null;setBusy(true);
    try{
    const result=await api('GET',null,selected.id),row=result.record;setProfile(result.profile);setRevision(result.revision);
    setEditingId(row.id);
    const next={
      full_name: row.full_name || '', slug: row.slug || '', known_for: row.known_for || '', field: row.field || 'الأدب والشعر',
      governorate_id: row.governorate_id || '', era: row.era || 'معاصرة', birth_year: row.birth_year ?? '',
      death_year: row.death_year ?? '', short_bio: row.short_bio || '', image_url: row.image_url || '', website: row.website || '',
      facebook_url: row.facebook_url || '', instagram_url: row.instagram_url || '', x_url: row.x_url || '',
      youtube_url: row.youtube_url || '',image_credit:row.image_credit||'',image_source_url:row.image_source_url||'',
      display_order: row.display_order || 0, is_published: Boolean(row.is_published),
    };setFigure(next);editor.markClean({figure:next,profile:result.profile});
    setNotice('تعدّل الآن شخصية: ' + row.full_name);
    window.scrollTo({top: 0, behavior: 'smooth'});
    }catch(error){setNotice('خطأ: '+error.message);}finally{setBusy(false);}
  }

  async function uploadPortrait(file) {
    const {extension, contentType} = await validateMediaUpload(file);
    const filename = (globalThis.crypto?.randomUUID?.() || Date.now().toString(36)) + '.' + extension;
    const path = 'yemeni-figures/' + filename;
    return uploadAdminMedia(db,file,path,contentType);
  }

  async function saveFigure(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const form = event.currentTarget;
      const portrait = new FormData(form).get('portrait');
      const slug = cleanSlug(figure.slug);
      const governorate = yemenGovernorates.find(item => item.id === figure.governorate_id);
      if (!figure.full_name.trim() || !slug || !figure.known_for.trim() || !figure.field.trim() || !figure.short_bio.trim()) throw Error('الاسم والرابط المختصر والتعريف والمجال والنبذة حقول إلزامية.');
      for (const value of [figure.website, figure.facebook_url, figure.instagram_url, figure.x_url, figure.youtube_url]) {
        if (!isUrl(value)) throw Error('جميع الروابط يجب أن تبدأ بـ http:// أو https://');
      }
      const payload = {
        slug, full_name: figure.full_name.trim(), known_for: figure.known_for.trim(), field: figure.field.trim(),
        governorate_id: governorate?.id||'', governorate_name: governorate?.name||'', era: figure.era,
        birth_year: figure.birth_year === '' ? null : Number(figure.birth_year),
        death_year: figure.death_year === '' ? null : Number(figure.death_year), short_bio: figure.short_bio.trim(),
        image_url: figure.image_url || null, website: figure.website.trim() || null, facebook_url: figure.facebook_url.trim() || null,
        instagram_url: figure.instagram_url.trim() || null, x_url: figure.x_url.trim() || null, youtube_url: figure.youtube_url.trim() || null,
        image_credit:figure.image_credit,image_source_url:figure.image_source_url,display_order: Number(figure.display_order) || 0, is_published: publicationIntent(event,figure.is_published),
      };
      if (portrait?.size) payload.image_url = await uploadPortrait(portrait);
      const result=await api(editingId?'PUT':'POST',{record:{...payload,...(editingId?{id:editingId}:{})},profile:validateFigureProfile(profile),revision});
      const message = editingId ? 'تم تحديث الشخصية بنجاح.' : payload.is_published ? 'تمت إضافة الشخصية ونشرها في الدليل.' : 'تم حفظ الشخصية كمسودة.';
      await editor.clearDraft();form.reset();
      if(event.nativeEvent?.submitter?.value==='new')resetForm(false,true);else await editFigure(result.record,true);
      await loadFigures();
      setNotice(message);
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row){setBusy(true);try{const current=await api('GET',null,row.id);await api('PUT',{record:{...current.record,is_published:!current.record.is_published},profile:current.profile,revision:current.revision});await loadFigures();setNotice(current.record.is_published?'تم تحويل الشخصية إلى مسودة.':'تم نشر الشخصية.');}catch(error){setNotice('خطأ: '+error.message);}finally{setBusy(false);}}
  async function removeFigure(row){if(!canDelete)return;if(!window.confirm('هل تريد حذف شخصية "'+row.full_name+'" نهائيًا؟'))return;setBusy(true);try{await api('DELETE',{id:row.id,revision:row.updated_at});if(editingId===row.id)resetForm(false);await loadFigures();setNotice('تم حذف الشخصية.');}catch(error){setNotice('خطأ: '+error.message);}finally{setBusy(false);}}

  return <div className="company-admin-layout">
    <section className="admin-panel company-admin-editor">
      <h2><Landmark size={20}/> {editingId ? 'تعديل الشخصية' : 'إضافة شخصية يمنية'}</h2>
      {notice && <p className={'feedback ' + (notice.startsWith('خطأ') ? 'error' : 'success')} role="status">{notice}</p>}
      <ValidatedForm className="admin-form company-admin-form" onSubmit={saveFigure} data-editor-key={editor.key} onInvalidCapture={revealInvalidField} onChangeCapture={event=>trackEditorFiles(event,editor)}><EditorActions editor={editor} busy={busy} value={{...figure,profile}} published={figure.is_published} onCancel={()=>resetForm()}/><fieldset className="admin-editor-fields" disabled={busy}>
        <details className="company-admin-group" open><summary>الهوية والتصنيف</summary>
          <div className="form-row"><FormLabel>الاسم الكامل<FormInput required value={figure.full_name} onChange={event => setField('full_name', event.target.value)}/></FormLabel><FormLabel>الرابط المختصر بالإنجليزية<FormInput required dir="ltr" placeholder="figure-name" value={figure.slug} onChange={event => setField('slug', event.target.value)}/></FormLabel></div>
          <FormLabel>تعريف مختصر<FormInput required placeholder="شاعر وناقد وأديب يمني" value={figure.known_for} onChange={event => setField('known_for', event.target.value)}/></FormLabel>
          <div className="form-row"><FormLabel>المجال<FormInput required list="yemeni-figure-field-options" placeholder="اختر أو اكتب مجالًا جديدًا" value={figure.field} onChange={event => setField('field', event.target.value)}/><datalist id="yemeni-figure-field-options">{fields.map(item => <option value={item} key={item}/>)}</datalist></FormLabel><FormLabel>المحافظة<FormSelect value={figure.governorate_id} onChange={event => setField('governorate_id', event.target.value)}><option value="">غير محددة في المصادر</option>{yemenGovernorates.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</FormSelect></FormLabel></div>
          <div className="form-row"><FormLabel>الفترة<FormSelect value={figure.era} onChange={event => setField('era', event.target.value)}>{yemeniFigureEras.map(item => <option key={item}>{item}</option>)}</FormSelect></FormLabel><FormLabel>ترتيب الظهور<FormInput type="number" min="0" dir="ltr" value={figure.display_order} onChange={event => setField('display_order', event.target.value)}/></FormLabel></div>
          <div className="form-row"><FormLabel>سنة الميلاد<FormInput type="number" min="500" max="2100" dir="ltr" value={figure.birth_year} onChange={event => setField('birth_year', event.target.value)}/></FormLabel><FormLabel>سنة الوفاة<FormInput type="number" min="500" max="2100" dir="ltr" value={figure.death_year} onChange={event => setField('death_year', event.target.value)}/></FormLabel></div>
          <FormLabel>نبذة تعريفية<FormTextarea required rows="5" value={figure.short_bio} onChange={event => setField('short_bio', event.target.value)}/></FormLabel>
        </details>

        <details className="company-admin-group"><summary>الصورة</summary>
          <FormLabel>صورة الشخصية (اختيارية، حتى 5MB)<AdminImageInput name="portrait" currentUrl={figure.image_url} onSelection={selected=>{if(selected){portraitBackup.current={credit:figure.image_credit,source:figure.image_source_url};setField('image_credit','');setField('image_source_url','');}else if(portraitBackup.current){setField('image_credit',portraitBackup.current.credit);setField('image_source_url',portraitBackup.current.source);portraitBackup.current=null;}}}/></FormLabel>
          <FormLabel>نسب الصورة وصاحبها<FormInput value={figure.image_credit} onChange={event=>setField('image_credit',event.target.value)}/></FormLabel><FormLabel>صفحة مصدر الصورة<FormInput type="url" value={figure.image_source_url} onChange={event=>setField('image_source_url',event.target.value)}/></FormLabel>
          {figure.image_url && <p className="small-muted">توجد صورة محفوظة حاليًا. اختيار ملف جديد سيستبدلها.</p>}
        </details>

        <details className="company-admin-group"><summary>الموقع وحسابات التواصل</summary>
          <div className="form-row"><FormLabel>الموقع الإلكتروني<FormInput type="url" dir="ltr" placeholder="https://..." value={figure.website} onChange={event => setField('website', event.target.value)}/></FormLabel><FormLabel>فيسبوك<FormInput type="url" dir="ltr" placeholder="https://facebook.com/..." value={figure.facebook_url} onChange={event => setField('facebook_url', event.target.value)}/></FormLabel></div>
          <div className="form-row"><FormLabel>إنستغرام<FormInput type="url" dir="ltr" placeholder="https://instagram.com/..." value={figure.instagram_url} onChange={event => setField('instagram_url', event.target.value)}/></FormLabel><FormLabel>منصة X<FormInput type="url" dir="ltr" placeholder="https://x.com/..." value={figure.x_url} onChange={event => setField('x_url', event.target.value)}/></FormLabel></div>
          <FormLabel>يوتيوب<FormInput type="url" dir="ltr" placeholder="https://youtube.com/..." value={figure.youtube_url} onChange={event => setField('youtube_url', event.target.value)}/></FormLabel>
        </details>

        <FigureProfileEditor profile={profile} onChange={setProfile}/>
        <FormLabel className="checkline"><FormInput type="checkbox" checked={figure.is_published} onChange={event => setField('is_published', event.target.checked)}/> نشر الشخصية فور الحفظ</FormLabel>

      </fieldset></ValidatedForm>
    </section>

    <section className="admin-panel company-admin-list"><h2>الشخصيات ({figures.length})</h2>
      <AdminListTools list={list}/>
      {loading && <p className="small-muted">جارٍ تحميل الشخصيات...</p>}
      {!loading && !figures.length && <p className="small-muted">لم تُضف أي شخصيات بعد.</p>}
      {list.items.map(row => <div className="admin-list-item" key={row.id}><div><strong>{row.full_name}</strong><small>{row.field} · {row.governorate_name} · {row.is_published ? 'منشور' : 'مسودة'}</small></div><div><button disabled={busy} onClick={() => editFigure(row)} title="تعديل"><Pencil size={17}/></button><button disabled={busy} onClick={() => togglePublished(row)} title={row.is_published ? 'إلغاء النشر' : 'نشر'}>{row.is_published ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{canDelete && <button disabled={busy} onClick={() => removeFigure(row)} title="حذف"><Trash2 size={17}/></button>}</div></div>)}
    </section>
  </div>;
}
