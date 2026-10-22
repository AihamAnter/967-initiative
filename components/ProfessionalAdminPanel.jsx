'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Eye, EyeOff, Pencil, Save, Trash2, UserRound, X} from 'lucide-react';
import {professionalCategories, serviceModes} from '@/lib/professionals';
import {mapProfessional} from '@/lib/professionals';
import {safeExternalUrl} from '@/lib/media';
import {contentPatch,saveInlineContent} from '@/lib/inlineContentClient';
import useAdminItemTarget from './inline/useAdminItemTarget';

const emptyProfessional = () => ({
  full_name: '', slug: '', profession_title: '', category: 'البناء والصيانة', location: '',
  service_areas: '', service_mode: 'حضوري', years_experience: '', availability: '', bio: '',
  services: '', skills: '', languages: 'العربية', phone: '', whatsapp: '', email: '', website: '', instagram: '',
  profile_image_url:'',image_position:'center',is_verified: false, is_published: false,
});
const cleanSlug = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
const splitList = value => String(value || '').split(/\r?\n|،|,/).map(item => item.trim()).filter(Boolean);
const joinList = value => Array.isArray(value) ? value.join('\n') : '';

export default function ProfessionalAdminPanel({db, canDelete = false,initialItem = ''}) {
  const [professionals, setProfessionals] = useState([]);
  const [professional, setProfessional] = useState(emptyProfessional);
  const [editingId, setEditingId] = useState(null);
  const [original,setOriginal]=useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const categories = useMemo(() => [...new Set([
    ...professionalCategories.filter(item => item !== 'الكل'),
    ...professionals.map(item => item.category).filter(Boolean),
  ])], [professionals]);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    const {data, error} = await db.from('professionals').select('*').order('created_at', {ascending: false});
    setLoading(false);
    if (error) {
      setProfessionals([]);
      setSchemaMissing(error.code === '42P01' || /professionals|schema cache/i.test(error.message || ''));
      setNotice('خطأ: ' + error.message);
      return;
    }
    setSchemaMissing(false);
    setProfessionals(data || []);
  }, [db]);

  useEffect(() => { loadProfessionals(); }, [loadProfessionals]);
  useAdminItemTarget({item:initialItem,rows:professionals,loading,onSelect:editProfessional,onMissing:()=>setNotice('خطأ: لم يتم العثور على الملف المطلوب. لم يتغير أي محتوى.')});

  function setField(field, value) {
    setProfessional(current => ({...current, [field]: value}));
  }

  function resetForm(clearNotice = true) {
    setEditingId(null);
    setProfessional(emptyProfessional());
    if (clearNotice) setNotice('');
  }

  function editProfessional(row) {
    setOriginal(row);
    setEditingId(row.id);
    setProfessional({
      full_name: row.full_name || '', slug: row.slug || '', profession_title: row.profession_title || '',
      category: row.category || 'البناء والصيانة', location: row.location || '', service_areas: joinList(row.service_areas),
      service_mode: row.service_mode || 'حضوري', years_experience: row.years_experience ?? '', availability: row.availability || '',
      bio: row.bio || '', services: joinList(row.services), skills: joinList(row.skills), languages: joinList(row.languages) || 'العربية',
      phone: row.phone || '', whatsapp: row.whatsapp || '', email: row.email || '', website: row.website || '',
      instagram: row.instagram || '',profile_image_url:row.profile_image_url||'',image_position:row.image_position||'center', is_verified: Boolean(row.is_verified), is_published: Boolean(row.is_published),
    });
    setNotice('تعدّل الآن ملف: ' + row.full_name);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  async function saveProfessional(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const form = event.currentTarget;
      const slug = cleanSlug(professional.slug);
      const services = splitList(professional.services);
      if (!professional.full_name.trim() || !slug || !professional.profession_title.trim() || !professional.category.trim() || !professional.location.trim()) throw Error('الاسم والرابط المختصر والمهنة والتصنيف والمحافظة حقول إلزامية.');
      if (!services.length) throw Error('أضف خدمة واحدة على الأقل.');
      if (professional.is_verified && /@example\.(com|org|net)$/i.test(professional.email.trim())) throw Error('استبدل البريد التجريبي قبل توثيق الملف.');
      if (professional.website && !safeExternalUrl(professional.website)) throw Error('رابط الموقع غير صالح. استخدم HTTP أو HTTPS دون بيانات دخول.');
      if (professional.instagram && !safeExternalUrl(professional.instagram)) throw Error('رابط إنستغرام غير صالح.');
      if (professional.profile_image_url && !safeExternalUrl(professional.profile_image_url)) throw Error('رابط الصورة غير صالح. استخدم HTTP أو HTTPS دون بيانات دخول.');
      const payload = {
        slug, full_name: professional.full_name.trim(), profession_title: professional.profession_title.trim(),
        category: professional.category.trim(), location: professional.location.trim(), service_areas: splitList(professional.service_areas),
        service_mode: professional.service_mode, years_experience: professional.years_experience === '' ? null : Number(professional.years_experience),
        availability: professional.availability.trim(), bio: professional.bio.trim(), services, skills: splitList(professional.skills),
        languages: splitList(professional.languages), phone: professional.phone.trim() || null, whatsapp: professional.whatsapp.trim() || null,
        email: professional.email.trim() || null, website: professional.website.trim() || null, instagram: professional.instagram.trim() || null,
        profile_image_url:professional.profile_image_url.trim()||null,image_position:professional.image_position,is_verified: professional.is_verified, is_published: professional.is_published,
      };
      const {error} = editingId ? await saveInlineContent(db,'professional',editingId,original?.revision,contentPatch(original,payload)) : await db.from('professionals').insert(payload);
      if (error) throw Error(error.message);
      const message = editingId ? 'تم تحديث الملف المهني بنجاح.' : professional.is_published ? 'تمت إضافة المهني ونشر ملفه في الدليل.' : 'تم حفظ الملف كمسودة.';
      resetForm(false);
      form.reset();
      await loadProfessionals();
      setNotice(message);
    } catch (error) {
      setNotice('خطأ: ' + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row) {
    setBusy(true);
    let error;try{await saveInlineContent(db,'professional',row.id,row.revision,{is_published:!row.is_published});}catch(failure){error=failure;}
    if (error) setNotice('خطأ: ' + error.message);
    else { setNotice(row.is_published ? 'تم تحويل الملف إلى مسودة.' : 'تم نشر الملف في دليل مهنيون.'); await loadProfessionals(); }
    setBusy(false);
  }

  async function removeProfessional(row) {
    if (!canDelete) { setNotice('خطأ: الحذف متاح لحساب الإدارة فقط.'); return; }
    if (!window.confirm('هل تريد حذف ملف "' + row.full_name + '" نهائياً؟')) return;
    setBusy(true);
    const {error} = await db.from('professionals').delete().eq('id', row.id);
    if (error) setNotice('خطأ: ' + error.message);
    else { if (editingId === row.id) resetForm(false); setNotice('تم حذف الملف المهني.'); await loadProfessionals(); }
    setBusy(false);
  }

  return <div className="company-admin-layout">
    <section className="admin-panel company-admin-editor">
      <h2><UserRound size={20}/> {editingId ? 'تعديل الملف المهني' : 'إضافة مهني أو مقدم خدمة'}</h2>
      {schemaMissing && <div className="company-admin-schema"><strong>يلزم تفعيل جدول المهنيين أولاً.</strong><span>شغّل الملف <code>supabase/professionals.sql</code> مرة واحدة داخل Supabase SQL Editor.</span></div>}
      {notice && <p className={'feedback ' + (notice.startsWith('خطأ') ? 'error' : 'success')} role="status">{notice}</p>}
      <form className="admin-form company-admin-form" onSubmit={saveProfessional}>
        <div className="company-admin-group"><h3>الهوية المهنية</h3>
          <div className="form-row"><label>الاسم الكامل<input required value={professional.full_name} onChange={event => setField('full_name', event.target.value)}/></label><label>الرابط المختصر بالإنجليزية<input required dir="ltr" placeholder="ahmed-carpenter" value={professional.slug} onChange={event => setField('slug', event.target.value)}/></label></div>
          <div className="form-row"><label>المسمى المهني<input required placeholder="نجار أثاث، فني كهرباء..." value={professional.profession_title} onChange={event => setField('profession_title', event.target.value)}/></label><label>التصنيف<input required list="professional-category-options" placeholder="اختر أو اكتب تصنيفاً جديداً" value={professional.category} onChange={event => setField('category', event.target.value)}/><datalist id="professional-category-options">{categories.map(item => <option value={item} key={item}/>)}</datalist></label></div>
          <div className="form-row"><label>المحافظة أو المدينة<input required value={professional.location} onChange={event => setField('location', event.target.value)}/></label><label>طريقة تقديم الخدمة<select value={professional.service_mode} onChange={event => setField('service_mode', event.target.value)}>{serviceModes.map(item => <option key={item}>{item}</option>)}</select></label></div>
          <div className="form-row"><label>سنوات الخبرة<input type="number" min="0" max="80" dir="ltr" value={professional.years_experience} onChange={event => setField('years_experience', event.target.value)}/></label><label>حالة التوفر<input placeholder="متاح، حسب موعد مسبق..." value={professional.availability} onChange={event => setField('availability', event.target.value)}/></label></div>
        </div>

        <div className="company-admin-group"><h3>الخدمات والخبرة</h3>
          <label>نبذة مهنية<textarea rows="4" value={professional.bio} onChange={event => setField('bio', event.target.value)}/></label>
          <div className="form-row"><label>الخدمات المقدمة<textarea required rows="5" placeholder={'خدمة في كل سطر\nتركيب وصيانة\nمعاينة واستشارة'} value={professional.services} onChange={event => setField('services', event.target.value)}/></label><label>المهارات<textarea rows="5" placeholder={'مهارة في كل سطر\nتشخيص أعطال\nتركيب'} value={professional.skills} onChange={event => setField('skills', event.target.value)}/></label></div>
          <div className="form-row"><label>مناطق تقديم الخدمة<textarea rows="4" placeholder={'صنعاء\nعمران'} value={professional.service_areas} onChange={event => setField('service_areas', event.target.value)}/></label><label>اللغات<textarea rows="4" placeholder={'العربية\nالإنجليزية'} value={professional.languages} onChange={event => setField('languages', event.target.value)}/></label></div>
        </div>

        <div className="company-admin-group"><h3>التواصل</h3>
          <div className="form-row"><label>رقم الهاتف<input dir="ltr" placeholder="+967..." value={professional.phone} onChange={event => setField('phone', event.target.value)}/></label><label>رقم واتساب<input dir="ltr" placeholder="967..." value={professional.whatsapp} onChange={event => setField('whatsapp', event.target.value)}/></label></div>
          <div className="form-row"><label>البريد الإلكتروني<input type="email" dir="ltr" value={professional.email} onChange={event => setField('email', event.target.value)}/></label><label>الموقع الإلكتروني<input type="url" dir="ltr" placeholder="https://..." value={professional.website} onChange={event => setField('website', event.target.value)}/></label></div>
          <label>رابط إنستغرام<input type="url" dir="ltr" placeholder="https://instagram.com/..." value={professional.instagram} onChange={event => setField('instagram', event.target.value)}/></label>
          <label>رابط صورة الملف المصرح بنشرها<input type="url" dir="ltr" placeholder="https://..." value={professional.profile_image_url} onChange={event=>setField('profile_image_url',event.target.value)}/></label>
          <label>موضع الصورة<select value={professional.image_position} onChange={event=>setField('image_position',event.target.value)}>{[['center','الوسط'],['top','الأعلى'],['bottom','الأسفل'],['left','اليسار'],['right','اليمين']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        </div>

        <div className="company-admin-group"><h3>النشر</h3>
          <p className="small-muted">تحقق من هوية صاحب الملف وموافقته على نشر وسائل الاتصال قبل التوثيق والنشر. عناوين example.com بيانات توضيحية وتتطلب المراجعة.</p><label className="checkline"><input type="checkbox" checked={professional.is_verified} onChange={event => setField('is_verified', event.target.checked)}/> تأكيد التحقق من الملف وموافقة صاحبه</label>
          <label className="checkline"><input type="checkbox" checked={professional.is_published} onChange={event => setField('is_published', event.target.checked)}/> نشر الملف فور الحفظ</label>
        </div>

        <div className="company-admin-actions"><button className="btn btn-red" disabled={busy || schemaMissing}><Save size={17}/>{busy ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المهني'}</button>{editingId && <button type="button" className="btn btn-outline" onClick={() => resetForm()}><X size={17}/> إلغاء التعديل</button>}</div>
      </form>
    </section>

    <section className="admin-panel company-admin-list"><h2>المهنيون ({professionals.length})</h2>
      {loading && <p className="small-muted">جارٍ تحميل الملفات...</p>}
      {!loading && !professionals.length && !schemaMissing && <p className="small-muted">لم تُضف أي ملفات مهنية بعد.</p>}
      {professionals.map(row => <div className="admin-list-item" key={row.id}><div><strong>{row.full_name}</strong>{mapProfessional(row).needsReview && <span className="status-badge">بحاجة إلى مراجعة — بيانات تجريبية</span>}<small>{row.profession_title} · {row.location} · {row.is_published ? 'منشور' : 'مسودة'}</small></div><div><button disabled={busy} onClick={() => editProfessional(row)} title="تعديل"><Pencil size={17}/></button><button disabled={busy} onClick={() => togglePublished(row)} title={row.is_published ? 'إلغاء النشر' : 'نشر'}>{row.is_published ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{canDelete && <button disabled={busy} onClick={() => removeProfessional(row)} title="حذف"><Trash2 size={17}/></button>}</div></div>)}
    </section>
  </div>;
}
