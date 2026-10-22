'use client';

import Image from 'next/image';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Building2, Eye, EyeOff, ImagePlus, Pencil, Plus, Save, Trash2, X} from 'lucide-react';
import {companyEntityTypes, companyScaleOptions, companyTeamSizeOptions, productCategories} from '@/lib/yemeniProducts';
import {validateMediaUpload} from '@/lib/uploads';
import {safeExternalUrl} from '@/lib/media';
import {normalizeCompanySources,validateCompanySources} from '@/lib/companySources';
import {fetchAllRows} from '@/lib/pagination';
import {contentPatch,saveInlineContent} from '@/lib/inlineContentClient';
import useAdminItemTarget from './inline/useAdminItemTarget';

const emptyProduct = () => ({
  clientKey: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
  name: '', description: '', format: '', image_url: '', imageFileName: '', size: '', weight: '',
  quantity: '', wholesale_price: '', retail_price: '', currency: 'YER',
  sources: [],
});
const emptyCompany = () => ({
  name: '', slug: '', legal_name: '', category: 'أغذية ومشروبات', location: '', scale: '',
  entity_type: 'شركة', ownership: '', owner_name: '', ceo_name: '', founded: '', team_size: '',
  address: '', google_maps_url: '', website: '', email: '', phone: '', summary: '', story: '', impact: '',
  strengths: '', markets: '', products: [emptyProduct()], image_url: '', image_position: 'center',
  is_published: false,
});

const cleanSlug = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
const splitList = value => String(value || '').split(/\r?\n|،|,/).map(item => item.trim()).filter(Boolean);
const joinList = value => Array.isArray(value) ? value.join('\n') : '';
const optionalNumber = value => value === '' || value === null || value === undefined ? null : Number(value);

export default function CompanyAdminPanel({db, canDelete = false,initialItem = ''}) {
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(emptyCompany);
  const [editingId, setEditingId] = useState(null);
  const [original,setOriginal]=useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const categoryOptions = useMemo(() => [...new Set([
    ...productCategories.filter(value => value !== 'الكل'),
    ...companies.map(item => item.category).filter(Boolean),
  ])], [companies]);
  const entityTypeOptions = useMemo(() => [...new Set([
    ...companyEntityTypes,
    ...companies.map(item => item.entity_type).filter(Boolean),
  ])], [companies]);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data=await fetchAllRows(()=>db.from('yemeni_companies').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id'));
      setSchemaMissing(false);
      setCompanies(data);
    } catch(error) {
      setCompanies([]);
      setSchemaMissing(error.code === '42P01' || /yemeni_companies|schema cache/i.test(error.message || ''));
      setNotice('خطأ: ' + error.message);
    } finally { setLoading(false); }
  }, [db]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useAdminItemTarget({item:initialItem,rows:companies,loading,onSelect:editCompany,onMissing:()=>setNotice('خطأ: لم يتم العثور على المنشأة المطلوبة. لم يتغير أي محتوى.')});

  function setField(field, value) {
    setCompany(current => ({...current, [field]: value}));
  }

  function setProduct(index, field, value) {
    setCompany(current => ({
      ...current,
      products: current.products.map((product, productIndex) => productIndex === index ? {...product, [field]: value} : product),
    }));
  }

  function addProduct() {
    setCompany(current => ({...current, products: [...current.products, emptyProduct()]}));
  }

  function changeSource(productIndex,sourceIndex,field,value){
    setCompany(current=>({...current,products:current.products.map((product,index)=>index===productIndex?{...product,sources:product.sources.map((source,i)=>i===sourceIndex?{...source,[field]:value}:source)}:product)}));
  }

  function removeProduct(index) {
    setCompany(current => ({...current, products: current.products.length === 1 ? [emptyProduct()] : current.products.filter((_, productIndex) => productIndex !== index)}));
  }

  function resetForm() {
    setEditingId(null);
    setCompany(emptyCompany());
    setNotice('');
  }

  function editCompany(row) {
    setOriginal(row);
    setEditingId(row.id);
    setCompany({
      name: row.name || '', slug: row.slug || '', legal_name: row.legal_name || '', category: row.category || 'أغذية ومشروبات',
      location: row.location || '', scale: row.scale || '', entity_type: row.entity_type || '', ownership: row.ownership || '',
      owner_name: row.owner_name || '', ceo_name: row.ceo_name || '', founded: row.founded || '', team_size: row.team_size || '',
      address: row.address || '', google_maps_url: row.google_maps_url || '', website: row.website || '', email: row.email || '', phone: row.phone || '', summary: row.summary || '',
      story: row.story || '', impact: row.impact || '', strengths: joinList(row.strengths), markets: joinList(row.markets),
      products: Array.isArray(row.products) && row.products.length ? row.products.map(product => ({
        ...product,
        clientKey: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
        name: product.name || '', description: product.description || '', format: product.format || '',
        image_url: product.image_url || '', imageFileName: '', size: product.size || '', weight: product.weight || '',
        quantity: product.quantity ?? '', wholesale_price: product.wholesale_price ?? '', retail_price: product.retail_price ?? '',
        currency: product.currency || 'YER',
        sources: normalizeCompanySources(product.sources),
      })) : [emptyProduct()],
      image_url: row.image_url || '', image_position: row.image_position || 'center', is_published: Boolean(row.is_published),
    });
    setNotice('تعدّل الآن: ' + row.name);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  async function uploadImage(file, folder, fallbackUrl = null) {
    if (!file?.size) return fallbackUrl;
    const {extension, contentType} = await validateMediaUpload(file);
    const filename = (globalThis.crypto?.randomUUID?.() || Date.now().toString(36)) + '.' + extension;
    const path = folder + '/' + filename;
    const {error} = await db.storage.from('media').upload(path, file, {contentType, upsert: false});
    if (error) throw Error(error.message);
    return db.storage.from('media').getPublicUrl(path).data.publicUrl;
  }

  async function saveCompany(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const slug = cleanSlug(company.slug);
      const productDrafts = company.products.map(product => ({
        ...Object.fromEntries(Object.entries(product).filter(([key])=>!['clientKey','imageFileName'].includes(key))),
        name: product.name.trim(), description: product.description.trim(), format: product.format.trim(),
        image_url: product.image_url || null, size: product.size.trim(), weight: product.weight.trim(),
        quantity: optionalNumber(product.quantity), wholesale_price: optionalNumber(product.wholesale_price),
        retail_price: optionalNumber(product.retail_price), currency: product.currency || 'YER',
        sources: validateCompanySources(product.sources),
      }));
      if (!company.name.trim() || !slug || !company.category || !company.location.trim()) throw Error('الاسم والرابط المختصر والتصنيف والمحافظة حقول إلزامية. استخدم أحرفاً إنجليزية للرابط المختصر.');
      if (!productDrafts.length || productDrafts.some(product => !product.name)) throw Error('أضف منتجاً واحداً على الأقل، واكتب اسم كل منتج.');
      if (company.website && !safeExternalUrl(company.website)) throw Error('رابط الموقع غير صالح. استخدم HTTP أو HTTPS دون بيانات دخول.');
      if (company.google_maps_url && !safeExternalUrl(company.google_maps_url)) throw Error('رابط خرائط Google غير صالح.');
      const imageUrl = await uploadImage(formData.get('company_image'), 'companies', company.image_url || null);
      const products = await Promise.all(productDrafts.map(async (product, index) => ({
        ...product,
        image_url: await uploadImage(formData.get('product_image_' + index), 'products', product.image_url),
      })));
      const payload = {
        slug, name: company.name.trim(), legal_name: company.legal_name.trim(), category: company.category,
        location: company.location.trim(), scale: company.scale.trim(), entity_type: company.entity_type.trim(),
        ownership: company.ownership.trim(), owner_name: company.owner_name.trim(), ceo_name: company.ceo_name.trim(),
        founded: company.founded.trim(), team_size: company.team_size.trim(), address: company.address.trim(),
        google_maps_url: company.google_maps_url.trim() || null,
        website: company.website.trim() || null, email: company.email.trim() || null, phone: company.phone.trim() || null,
        summary: company.summary.trim(), story: company.story.trim(), impact: company.impact.trim(),
        strengths: splitList(company.strengths), markets: splitList(company.markets), products,
        image_url: imageUrl, image_position: company.image_position, is_published: company.is_published,
      };
      const {error} = editingId ? await saveInlineContent(db,'company',editingId,original?.revision,contentPatch(original,payload)) : await db.from('yemeni_companies').insert(payload);
      if (error) throw Error(error.message);
      setNotice(editingId ? 'تم تحديث بيانات الشركة بنجاح.' : 'تمت إضافة الشركة إلى Supabase بنجاح.');
      setEditingId(null);
      setCompany(emptyCompany());
      form.reset();
      await loadCompanies();
    } catch (error) {
      const message = /google_maps_url/i.test(error.message)
        ? 'شغّل الملف supabase/add-company-google-maps-url.sql مرة واحدة في Supabase SQL Editor، ثم أعد المحاولة.'
        : error.message;
      setNotice('خطأ: ' + message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row) {
    setBusy(true);
    setNotice('');
    let error;try{await saveInlineContent(db,'company',row.id,row.revision,{is_published:!row.is_published});}catch(failure){error=failure;}
    if (error) setNotice('خطأ: ' + error.message);
    else {
      setNotice(row.is_published ? 'تم تحويل الشركة إلى مسودة.' : 'تم نشر الشركة في صفحة منتجات يمنية.');
      await loadCompanies();
    }
    setBusy(false);
  }

  async function deleteCompany(row) {
    if (!canDelete) { setNotice('خطأ: الحذف متاح لحساب الإدارة فقط.'); return; }
    if (!window.confirm('هل تريد حذف شركة "' + row.name + '" نهائياً؟')) return;
    setBusy(true);
    setNotice('');
    const {error} = await db.from('yemeni_companies').delete().eq('id', row.id);
    if (error) setNotice('خطأ: ' + error.message);
    else {
      if (editingId === row.id) resetForm();
      setNotice('تم حذف الشركة.');
      await loadCompanies();
    }
    setBusy(false);
  }

  return <div className="company-admin-layout">
    <section className="admin-panel company-admin-editor">
      <h2><Building2 size={20}/> {editingId ? 'تعديل بيانات الشركة أو المصنع' : 'إضافة شركة أو مصنع'}</h2>
      {schemaMissing && <div className="company-admin-schema"><strong>يلزم تفعيل جدول الشركات أولاً.</strong><span>شغّل الملف <code>supabase/yemeni-products.sql</code> مرة واحدة داخل Supabase SQL Editor.</span></div>}
      {notice && <p className={'feedback ' + (notice.startsWith('خطأ') ? 'error' : 'success')} role="status">{notice}</p>}
      <form className="admin-form company-admin-form" onSubmit={saveCompany}>
        <div className="company-admin-group">
          <h3>البيانات الأساسية</h3>
          <div className="form-row"><label>اسم الشركة أو المصنع<input required value={company.name} onChange={event => setField('name', event.target.value)}/></label><label>الرابط المختصر بالإنجليزية<input required dir="ltr" placeholder="yemeni-company" value={company.slug} onChange={event => setField('slug', event.target.value)}/></label></div>
          <label>الاسم القانوني<input value={company.legal_name} onChange={event => setField('legal_name', event.target.value)}/></label>
          <div className="form-row"><label>التصنيف<input required list="company-category-options" placeholder="اختر أو اكتب تصنيفاً جديداً" value={company.category} onChange={event => setField('category', event.target.value)}/><datalist id="company-category-options">{categoryOptions.map(value => <option value={value} key={value}/>)}</datalist><small className="field-hint">يمكنك كتابة تصنيف جديد إذا لم تجده في القائمة.</small></label><label>المحافظة أو المدينة<input required value={company.location} onChange={event => setField('location', event.target.value)}/></label></div>
          <div className="form-row"><label>حجم المنشأة<select value={company.scale} onChange={event => setField('scale', event.target.value)}><option value="">غير محدد</option>{company.scale && !companyScaleOptions.includes(company.scale) && <option value={company.scale}>{company.scale}</option>}{companyScaleOptions.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label>نوع الكيان<input list="company-entity-options" placeholder="اختر أو اكتب نوعاً جديداً" value={company.entity_type} onChange={event => setField('entity_type', event.target.value)}/><datalist id="company-entity-options">{entityTypeOptions.map(value => <option value={value} key={value}/>)}</datalist><small className="field-hint">يمكنك كتابة نوع كيان جديد.</small></label></div>
        </div>

        <div className="company-admin-group">
          <h3>الإدارة والتواصل</h3>
          <div className="form-row"><label>اسم المالك<input value={company.owner_name} onChange={event => setField('owner_name', event.target.value)}/></label><label>الرئيس التنفيذي<input value={company.ceo_name} onChange={event => setField('ceo_name', event.target.value)}/></label></div>
          <div className="form-row"><label>نوع الملكية<input value={company.ownership} onChange={event => setField('ownership', event.target.value)}/></label><label>سنة التأسيس<input dir="ltr" inputMode="numeric" value={company.founded} onChange={event => setField('founded', event.target.value)}/></label></div>
          <div className="form-row"><label>حجم الفريق<select value={company.team_size} onChange={event => setField('team_size', event.target.value)}><option value="">غير محدد</option>{company.team_size && !companyTeamSizeOptions.includes(company.team_size) && <option value={company.team_size}>{company.team_size}</option>}{companyTeamSizeOptions.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label>رقم الهاتف<input dir="ltr" value={company.phone} onChange={event => setField('phone', event.target.value)}/></label></div>
          <label>العنوان<textarea rows="2" value={company.address} onChange={event => setField('address', event.target.value)}/></label>
          <label>رابط الموقع على Google Maps<input type="url" dir="ltr" placeholder="https://maps.app.goo.gl/..." value={company.google_maps_url} onChange={event => setField('google_maps_url', event.target.value)}/><small className="field-hint">الصق رابط المكان أو الدبوس من خرائط Google للحصول على موقع دقيق.</small></label>
          <div className="form-row"><label>الموقع الإلكتروني<input type="url" dir="ltr" placeholder="https://..." value={company.website} onChange={event => setField('website', event.target.value)}/></label><label>البريد الإلكتروني<input type="email" dir="ltr" value={company.email} onChange={event => setField('email', event.target.value)}/></label></div>
        </div>

        <div className="company-admin-group">
          <h3>محتوى صفحة الشركة</h3>
          <label>نبذة مختصرة<textarea rows="3" value={company.summary} onChange={event => setField('summary', event.target.value)}/></label>
          <label>قصة الشركة<textarea rows="4" value={company.story} onChange={event => setField('story', event.target.value)}/></label>
          <label>الأثر المحلي<textarea rows="3" value={company.impact} onChange={event => setField('impact', event.target.value)}/></label>
          <div className="form-row"><label>نقاط القوة<textarea rows="4" placeholder={'جودة محلية\nتعبئة يمنية\nقابل للشحن'} value={company.strengths} onChange={event => setField('strengths', event.target.value)}/></label><label>الأسواق المستهدفة<textarea rows="4" placeholder={'البيع المباشر\nمتاجر التجزئة\nالتصدير'} value={company.markets} onChange={event => setField('markets', event.target.value)}/></label></div>
        </div>

        <div className="company-admin-group">
          <div className="company-product-editor-head"><h3>المنتجات</h3><button type="button" className="btn btn-outline" onClick={addProduct}><Plus size={16}/> إضافة منتج</button></div>
          <div className="company-product-editor">{company.products.map((product, index) => <div className="company-product-row" key={product.clientKey}>
            <div className="company-product-row-title"><strong>المنتج {index + 1}</strong><button type="button" onClick={() => removeProduct(index)} title="حذف المنتج"><Trash2 size={16}/></button></div>
            <div className="company-product-row-grid"><label>اسم المنتج<input required value={product.name} onChange={event => setProduct(index, 'name', event.target.value)}/></label><label>الشكل أو العبوة<input value={product.format} onChange={event => setProduct(index, 'format', event.target.value)}/></label></div>
            <label>وصف المنتج<textarea rows="2" value={product.description} onChange={event => setProduct(index, 'description', event.target.value)}/></label>
            <fieldset className="company-source-editor"><legend>مصادر بيانات المنشأة والمنتج</legend>
              <p className="field-hint">أضف روابط المعلومات المنشورة وتاريخ مراجعتها. اترك التفاصيل غير المنشورة فارغة.</p>
              {product.sources.map((source,sourceIndex)=><div className="company-source-row" key={sourceIndex}>
                <label>اسم المصدر<input required value={source.title} maxLength={180} onChange={event=>changeSource(index,sourceIndex,'title',event.target.value)}/></label>
                <label>رابط المصدر<input required type="url" dir="ltr" value={source.url} onChange={event=>changeSource(index,sourceIndex,'url',event.target.value)}/></label>
                <label>تاريخ المراجعة<input type="date" value={source.reviewedAt} onChange={event=>changeSource(index,sourceIndex,'reviewedAt',event.target.value)}/></label>
                <button type="button" className="btn btn-outline" onClick={()=>setProduct(index,'sources',product.sources.filter((_,i)=>i!==sourceIndex))}>حذف المصدر</button>
              </div>)}
              <button type="button" className="btn btn-outline" disabled={product.sources.length>=12} onClick={()=>setProduct(index,'sources',[...product.sources,{title:'',url:'',type:'reference',reviewedAt:''}])}><Plus size={15}/> إضافة مصدر</button>
            </fieldset>
            <div className="company-product-row-grid"><label>حجم المنتج<input placeholder="صغير، متوسط، 250 مل..." value={product.size} onChange={event => setProduct(index, 'size', event.target.value)}/></label><label>الوزن<input placeholder="500 جم، 1 كجم..." value={product.weight} onChange={event => setProduct(index, 'weight', event.target.value)}/></label></div>
            <div className="company-product-pricing"><label>الكمية المتوفرة<input type="number" min="0" step="1" dir="ltr" value={product.quantity} onChange={event => setProduct(index, 'quantity', event.target.value)}/></label><label>سعر الجملة<input type="number" min="0" step="0.01" dir="ltr" value={product.wholesale_price} onChange={event => setProduct(index, 'wholesale_price', event.target.value)}/></label><label>سعر التجزئة<input type="number" min="0" step="0.01" dir="ltr" value={product.retail_price} onChange={event => setProduct(index, 'retail_price', event.target.value)}/></label><label>العملة<select value={product.currency} onChange={event => setProduct(index, 'currency', event.target.value)}><option value="YER">ريال يمني</option><option value="SAR">ريال سعودي</option><option value="USD">دولار أمريكي</option></select></label></div>
            <label>صورة المنتج — اختيارية (حتى 5MB)<input type="file" name={'product_image_' + index} accept="image/png,image/jpeg,image/webp" onChange={event => setProduct(index, 'imageFileName', event.target.files?.[0]?.name || '')}/></label>
            {(product.image_url || product.imageFileName) && <div className="company-product-image-status">{product.image_url && <Image src={product.image_url} alt={product.name || 'صورة المنتج'} width={70} height={70}/>}<span>{product.imageFileName ? 'الصورة الجديدة: ' + product.imageFileName : 'صورة المنتج محفوظة في Supabase.'}</span></div>}
          </div>)}</div>
        </div>

        <div className="company-admin-group">
          <h3>الصورة والنشر</h3>
          <label>صورة الشركة أو منتجاتها (حتى 5MB)<input type="file" name="company_image" accept="image/png,image/jpeg,image/webp"/></label>
          {company.image_url && <div className="company-current-image"><ImagePlus size={17}/><span>توجد صورة محفوظة، واختيار صورة جديدة سيستبدلها.</span></div>}
          <label>موضع الصورة<select value={company.image_position} onChange={event => setField('image_position', event.target.value)}><option value="center">الوسط</option><option value="left center">اليسار</option><option value="right center">اليمين</option><option value="center top">الأعلى</option><option value="center bottom">الأسفل</option></select></label>
          <label className="checkline"><input type="checkbox" checked={company.is_published} onChange={event => setField('is_published', event.target.checked)}/> نشر الشركة فور الحفظ</label>
        </div>

        <div className="company-admin-actions"><button className="btn btn-red" disabled={busy || schemaMissing}><Save size={17}/> {busy ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة الشركة'}</button>{editingId && <button type="button" className="btn btn-outline" onClick={resetForm}><X size={17}/> إلغاء التعديل</button>}</div>
      </form>
    </section>

    <section className="admin-panel company-admin-list">
      <h2>الشركات والمصانع ({companies.length})</h2>
      {loading && <p className="small-muted">جارٍ تحميل البيانات...</p>}
      {!loading && !companies.length && !schemaMissing && <p className="small-muted">لم تُضف أي شركة بعد. أضف بيانات منشأة حقيقية ثم انشرها لتظهر للزوار.</p>}
      {companies.map(row => <div className="admin-list-item" key={row.id}><div><strong>{row.name}</strong><small>{row.category} · {row.location} · {row.is_published ? 'منشور' : 'مسودة'}</small></div><div><button disabled={busy} onClick={() => editCompany(row)} title="تعديل"><Pencil size={17}/></button><button disabled={busy} onClick={() => togglePublished(row)} title={row.is_published ? 'إلغاء النشر' : 'نشر'}>{row.is_published ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{canDelete && <button disabled={busy} onClick={() => deleteCompany(row)} title="حذف"><Trash2 size={17}/></button>}</div></div>)}
    </section>
  </div>;
}
