'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpLeft, RefreshCw, Save, Settings} from 'lucide-react';
import {ABOUT_TAGS_KEY, SITE_CONTENT_KEY, buildSiteSettingsRows, resolveSiteSettings, siteSettingsGroups} from '@/lib/siteSettings';
import {formatArabicDate} from '@/lib/format';

export default function SiteSettingsPanel({db}) {
  const router=useRouter();
  const [form,setForm]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[feedback,setFeedback]=useState(null),[updatedAt,setUpdatedAt]=useState(null),[saved,setSaved]=useState('');
  const mounted=useRef(false),loadId=useRef(0);
  const load=useCallback(async()=>{
    const id=++loadId.current;
    setLoading(true);setFeedback(null);
    try {
      const {data,error}=await db.from('site_settings').select('key,value,updated_at').in('key',[SITE_CONTENT_KEY,ABOUT_TAGS_KEY]);
      if(error)throw new Error('تعذر تحميل الإعدادات. تحقق من الاتصال وصلاحية التحرير ووجود جدول site_settings.');
      if(!mounted.current||id!==loadId.current)return;
      const settings=resolveSiteSettings(data||[]);
      const next={...settings,aboutTags:settings.aboutTags.join('\n')};
      setForm(next);setSaved(JSON.stringify(next));
      setUpdatedAt((data||[]).map(row=>row.updated_at).filter(Boolean).sort().at(-1)||null);
    }catch(error){if(mounted.current&&id===loadId.current)setFeedback({error:true,text:error.message});}
    finally{if(mounted.current&&id===loadId.current)setLoading(false);}
  },[db]);
  useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;};},[load]);
  const setField=(key,value)=>{setForm(current=>({...current,[key]:value}));setFeedback(null);};
  async function save(event){
    event.preventDefault();if(saving)return;setFeedback(null);setSaving(true);
    try{
      const rows=buildSiteSettingsRows(form);
      // A single upsert writes both records atomically and preserves unrelated settings.
      const {error}=await db.from('site_settings').upsert(rows,{onConflict:'key'});
      if(error)throw new Error('تعذر حفظ الإعدادات. تحقق من الاتصال وصلاحية حسابك ثم حاول مجدداً.');
      if(!mounted.current)return;
      const settings=resolveSiteSettings(rows),next={...settings,aboutTags:settings.aboutTags.join('\n')};
      setForm(next);setSaved(JSON.stringify(next));setUpdatedAt(rows[0].updated_at);
      setFeedback({error:false,text:'تم حفظ إعدادات الموقع. تظهر التعديلات عند فتح الموقع أو تحديث صفحته.'});
      router.refresh();
    }catch(error){if(mounted.current)setFeedback({error:true,text:error.message});}
    finally{if(mounted.current)setSaving(false);}
  }
  const dirty=form&&JSON.stringify(form)!==saved;
  return <div className="site-settings-panel">
    <header className="site-settings-heading"><div><h2><Settings size={22}/> إعدادات محتوى الموقع</h2><p>عدّل النصوص والكلمات التعريفية والروابط من هنا، ثم احفظ تغييراتك.</p></div><Link className="btn btn-outline" href="/" target="_blank" rel="noopener noreferrer">معاينة الموقع <ArrowUpLeft size={17}/></Link></header>
    {feedback&&<p className={'feedback '+(feedback.error?'error':'success')} role={feedback.error?'alert':'status'}>{feedback.text}</p>}
    {loading?<p role="status">جارٍ تحميل إعدادات الموقع…</p>:!form?<button className="btn btn-outline" type="button" onClick={load}>إعادة المحاولة <RefreshCw size={17}/></button>:<form className="site-settings-form" onSubmit={save}>
      <fieldset disabled={saving} className="site-settings-fields">{siteSettingsGroups.map(group=><section className="admin-panel" key={group.title}><h3>{group.title}</h3><p className="small-muted">{group.description}</p><div className="admin-form">{group.fields.map(field=><label key={field.key}>{field.label}{field.multiline?<textarea rows={3} value={form[field.key]} required={!field.optional} maxLength={field.maxLength} onChange={event=>setField(field.key,event.target.value)}/>:<input type={field.url?'url':'text'} dir={field.url?'ltr':undefined} value={form[field.key]} required={!field.optional} maxLength={field.maxLength} onChange={event=>setField(field.key,event.target.value)}/>}</label>)}{group.title==='عن المبادرة'&&<label>الكلمات التعريفية<textarea rows={5} value={form.aboutTags} onChange={event=>setField('aboutTags',event.target.value)} required maxLength={600}/><small>اكتب كل كلمة أو عبارة في سطر مستقل؛ حتى 12 كلمة، وبحد أقصى 40 حرفاً لكل كلمة.</small></label>}</div></section>)}</fieldset>
      <div className="site-settings-actions"><button className="btn btn-primary" disabled={saving||!dirty} type="submit"><Save size={18}/>{saving?'جارٍ الحفظ…':'حفظ إعدادات الموقع'}</button><button type="button" className="btn btn-outline" onClick={load} disabled={saving}><RefreshCw size={17}/> إعادة تحميل المحفوظ</button><span role="status">{dirty?'لديك تغييرات غير محفوظة':updatedAt?'آخر حفظ: '+formatArabicDate(updatedAt):'تُعرض الإعدادات الافتراضية'}</span></div>
    </form>}
  </div>;
}
