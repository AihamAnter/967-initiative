'use client';

import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import {AlertTriangle, Check, Eye, EyeOff, Library, Pencil, Plus, RefreshCw, Save, Search, Square, X} from 'lucide-react';
import {defaultRankingIndicators, rankingCategories} from '@/lib/rankingCatalog';
import {formatNumber} from '@/lib/format';
import styles from './RankingAdminPanel.module.css';
import useAdminItemTarget from './inline/useAdminItemTarget';

const blankDraft = () => ({
  name:'', slug:'', category:rankingCategories[0]?.id || '', unit:'', code:'',
  direction:'desc', better:'contextual', description:'', display_order:0, is_published:false,
});
const toDraft = row => ({
  ...blankDraft(),
  ...Object.fromEntries(['id', 'name', 'slug', 'category', 'unit', 'code', 'direction', 'better', 'description', 'display_order', 'is_published'].filter(key => row[key] !== undefined).map(key => [key, row[key]])),
  expectedUpdatedAt:row.updated_at || undefined,
});
const categoryName = id => rankingCategories.find(category => category.id === id)?.name || id;
const present = value => value !== null && value !== undefined && value !== '';
const dateLabel = value => {
  if (!value || Number.isNaN(Date.parse(value))) return 'غير متوفر';
  return new Intl.DateTimeFormat('ar-YE-u-nu-latn', {dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Paris'}).format(new Date(value));
};
const sortIndicators = rows => [...rows].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'ar'));

function SnapshotFacts({snapshot}) {
  if (!snapshot) return <p className="small-muted">لم تُجلب لقطة محفوظة من المصدر لهذا المؤشر بعد.</p>;
  return <dl className={styles.snapshot}>
    <div><dt>آخر جلب محفوظ</dt><dd>{dateLabel(snapshot.updatedAt)}</dd></div>
    <div><dt>السنوات في اللقطة</dt><dd>{present(snapshot.fromYear) && present(snapshot.toYear) ? `${formatNumber(snapshot.fromYear)} — ${formatNumber(snapshot.toYear)}` : 'غير متوفرة'}</dd></div>
    <div><dt>الاقتصادات في اللقطة</dt><dd>{present(snapshot.countryCount) ? formatNumber(snapshot.countryCount) : 'غير متوفر'}</dd></div>
    <div><dt>القيم المتاحة</dt><dd>{present(snapshot.valueCount) ? formatNumber(snapshot.valueCount) : 'غير متوفر'}</dd></div>
    <div><dt>أحدث سنة لليمن</dt><dd>{present(snapshot.latestYemenYear) ? formatNumber(snapshot.latestYemenYear) : 'لا توجد قيمة يمنية متاحة في اللقطة'}</dd></div>
    {snapshot.sourceUpdatedAt && <div><dt>تاريخ تحديث المصدر</dt><dd>{snapshot.sourceUpdatedAt}</dd></div>}
  </dl>;
}

export default function RankingAdminPanel({db,initialItem = ''}) {
  const fieldId = useId();
  const editorHeading = useRef(null);
  const mounted = useRef(true);
  const requests = useRef(new Set());
  const loadRequest = useRef(null);
  const queueCancelled = useRef(false);
  const dirtyRef = useRef(false);
  const [indicators, setIndicators] = useState([]);
  const [library, setLibrary] = useState(defaultRankingIndicators);
  const [draft, setDraft] = useState(blankDraft);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [action, setAction] = useState('');
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [publication, setPublication] = useState('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [queue, setQueue] = useState({running:false, total:0, completed:0, succeeded:0, failed:0, current:'', cancelled:false, results:[]});

  useEffect(() => {
    mounted.current = true;
    const activeRequests = requests.current;
    return () => {
      mounted.current = false;
      queueCancelled.current = true;
      for (const controller of activeRequests) controller.abort();
    };
  }, []);

  const request = useCallback(async (path, payload, controller = new AbortController()) => {
    requests.current.add(controller);
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      if (!db?.auth) throw Error('الاتصال بحساب الإدارة غير متاح. أعد تسجيل الدخول.');
      const {data, error} = await db.auth.getSession();
      if (error || !data?.session?.access_token) throw Error('انتهت جلسة الإدارة. سجّل الدخول مجدداً؛ لم تُحفظ أي تغييرات من هذا الطلب.');
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const response = await fetch(path, {
        method:payload ? 'POST' : 'GET', cache:'no-store', signal:controller.signal,
        headers:{Authorization:`Bearer ${data.session.access_token}`, ...(payload ? {'Content-Type':'application/json'} : {})},
        ...(payload ? {body:JSON.stringify(payload)} : {}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const failure = new Error(typeof body?.error === 'string' ? body.error : 'تعذر تنفيذ الطلب. حاول مجدداً.');
        failure.status = response.status;
        throw failure;
      }
      if (!body || typeof body !== 'object') throw Error('لم تصل استجابة صالحة من الخادم. أعد تحميل القائمة للتحقق قبل المحاولة مجدداً.');
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw Error('انقطع الطلب أو انتهت مهلته. قد تكون العملية بدأت على الخادم؛ أعد تحميل القائمة للتحقق قبل تكرارها.');
      throw error;
    } finally {
      clearTimeout(timeout);
      requests.current.delete(controller);
    }
  }, [db]);

  const load = useCallback(async () => {
    loadRequest.current?.abort();
    const controller = new AbortController();
    loadRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const data = await request('/api/admin/rankings', undefined, controller);
      if (!mounted.current || loadRequest.current !== controller) return;
      if (!Array.isArray(data.indicators)) throw Error('قائمة المؤشرات الواردة غير صالحة. لم تتغير مسودة التحرير.');
      setIndicators(sortIndicators(data.indicators));
      setLibrary(Array.isArray(data.library) ? data.library : defaultRankingIndicators);
      setSetupRequired(Boolean(data.setupRequired));
    } catch (error) {
      if (mounted.current && loadRequest.current === controller) setLoadError(error.message);
    } finally {
      if (mounted.current && loadRequest.current === controller) setLoading(false);
    }
  }, [request]);

  useEffect(() => {load();}, [load]);
  useAdminItemTarget({item:initialItem,rows:indicators,loading,onSelect:openEditor,onMissing:()=>setNotice({type:'error',text:'لم يتم العثور على مؤشر الترتيب المطلوب. لم يتغير أي محتوى.'})});

  const filtered = useMemo(() => indicators.filter(row => {
    const needle = query.trim().toLocaleLowerCase('ar');
    return (!needle || [row.name, row.slug, row.code, row.unit, categoryName(row.category)].join(' ').toLocaleLowerCase('ar').includes(needle))
      && (category === 'all' || row.category === category)
      && (publication === 'all' || Boolean(row.is_published) === (publication === 'published'));
  }), [indicators, query, category, publication]);
  const filteredLibrary = useMemo(() => library.filter(row => {
    const needle = libraryQuery.trim().toLocaleLowerCase('ar');
    return !needle || [row.name, row.code, row.description, categoryName(row.category)].join(' ').toLocaleLowerCase('ar').includes(needle);
  }), [library, libraryQuery]);
  const busy = Boolean(action) || queue.running;
  const writesDisabled = busy || loading || Boolean(loadError) || setupRequired;
  const selectedRow = indicators.find(row => row.id === draft.id);

  function markClean() {dirtyRef.current = false; setDirty(false); setConflict(false);}
  function setField(key, value) {
    setDraft(current => ({...current, [key]:value}));
    dirtyRef.current = true; setDirty(true);
  }
  function focusEditor() {requestAnimationFrame(() => editorHeading.current?.focus());}
  function openEditor(row, preset = false) {
    if (dirtyRef.current) {
      setNotice({type:'error', text:'لديك تعديلات غير محفوظة. احفظها أو اضغط «إلغاء التعديلات» قبل فتح مؤشر آخر.'});
      focusEditor(); return;
    }
    const next = preset ? {...blankDraft(), ...Object.fromEntries(Object.entries(row).filter(([key]) => !['id', 'updated_at', 'snapshot', 'expectedUpdatedAt'].includes(key))), is_published:false} : toDraft(row);
    setDraft(next); markClean(); setNotice(preset ? {type:'info', text:'أُضيفت بيانات المكتبة إلى مسودة التحرير فقط. راجعها ثم اضغط حفظ؛ لم تُكتب في قاعدة البيانات بعد.'} : null);
    if (preset) {dirtyRef.current = true; setDirty(true);}
    focusEditor();
  }
  function resetEditor() {setDraft(blankDraft()); markClean(); setNotice(null); focusEditor();}

  function mergeSaved(saved, snapshot, original) {
    const updated = {...original, ...saved};
    if (snapshot !== undefined) updated.snapshot = snapshot;
    else if (original && original.code !== saved.code) updated.snapshot = null;
    setIndicators(rows => sortIndicators(rows.some(row => row.id === updated.id) ? rows.map(row => row.id === updated.id ? updated : row) : [...rows, updated]));
    return updated;
  }

  function payloadFor(form) {
    const value = {
      ...(form.id ? {id:form.id} : {}), name:String(form.name || '').trim(), slug:String(form.slug || '').trim(),
      category:form.category, unit:String(form.unit || '').trim(), code:String(form.code || '').trim().toUpperCase(),
      direction:form.direction, better:form.better, description:String(form.description || '').trim(),
      display_order:Number(form.display_order), is_published:Boolean(form.is_published),
    };
    if (value.name.length < 2 || value.name.length > 160) throw Error('اكتب اسماً من حرفين إلى 160 حرفاً.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || value.slug.length > 100) throw Error('الرابط المختصر مطلوب: حروف إنجليزية صغيرة وأرقام وشرطات، حتى 100 حرف.');
    if (!/^[A-Z0-9][A-Z0-9_.]+$/.test(value.code) || value.code.length > 80) throw Error('أدخل رمز WDI صالحاً من حرفين إلى 80 حرفاً، مثل NY.GDP.PCAP.CD.');
    if (!rankingCategories.some(item => item.id === value.category)) throw Error('اختر مجال المؤشر من القائمة.');
    if (!value.unit || value.unit.length > 120) throw Error('الوحدة مطلوبة، بحد أقصى 120 حرفاً.');
    if (value.description.length > 3000) throw Error('اختصر التوضيح إلى 3000 حرف أو أقل.');
    if (!Number.isInteger(value.display_order) || value.display_order < 0 || value.display_order > 10000) throw Error('ترتيب العرض يجب أن يكون عدداً صحيحاً بين صفر و10000.');
    return value;
  }

  async function save(event) {
    event.preventDefault();
    if (writesDisabled) return;
    setAction('save'); setNotice(null); setConflict(false);
    try {
      const payload = payloadFor(draft);
      const response = await request('/api/admin/rankings', {indicator:payload, ...(draft.expectedUpdatedAt ? {expectedUpdatedAt:draft.expectedUpdatedAt} : {})});
      if (!response.indicator?.id) throw Error('لم يؤكد الخادم سجل المؤشر المحفوظ. أعد تحميل القائمة للتحقق؛ بقيت مسودتك كما هي.');
      if (!mounted.current) return;
      const saved = mergeSaved(response.indicator, response.indicator.snapshot, selectedRow);
      setDraft(toDraft(saved)); markClean();
      setNotice({type:'success', text:payload.is_published ? 'تم حفظ المؤشر منشوراً. القيم والترتيب يعتمدان على آخر لقطة صالحة من المصدر.' : 'تم حفظ المؤشر كمسودة؛ لا يظهر في القائمة العامة.'});
    } catch (error) {
      if (mounted.current) {
        setConflict(error.status === 409);
        setNotice({type:'error', text:error.status === 409 ? 'تغيّر هذا المؤشر في جلسة أخرى. لم تُستبدل بياناته ولم نفقد مسودتك. يمكنك تحميل النسخة المحفوظة أو مراجعة تعديلاتك.' : error.message});
      }
    } finally {if (mounted.current) setAction('');}
  }

  async function replaceWithSaved() {
    if (busy || !draft.id) return;
    setAction('replace');
    try {
      const response = await request('/api/admin/rankings');
      const row = response.indicators?.find(item => item.id === draft.id);
      if (!row) throw Error('لم نعثر على النسخة المحفوظة. بقيت مسودتك دون تغيير.');
      if (!mounted.current) return;
      setIndicators(sortIndicators(response.indicators)); setSetupRequired(Boolean(response.setupRequired));
      setDraft(toDraft(row)); markClean(); setNotice({type:'info', text:'حُمّلت النسخة المحفوظة واستُبدلت مسودة التحرير بناءً على اختيارك.'});
      focusEditor();
    } catch (error) {if (mounted.current) setNotice({type:'error', text:error.message});}
    finally {if (mounted.current) setAction('');}
  }

  async function toggle(row) {
    if (writesDisabled) return;
    setAction(`toggle:${row.id}`); setNotice(null);
    try {
      const response = await request('/api/admin/rankings', {indicator:payloadFor({...row, is_published:!row.is_published}), ...(row.updated_at ? {expectedUpdatedAt:row.updated_at} : {})});
      if (!response.indicator?.id) throw Error('لم يؤكد الخادم تغيير حالة النشر. أعد تحميل القائمة للتحقق.');
      if (!mounted.current) return;
      const updated = mergeSaved(response.indicator, response.indicator.snapshot, row);
      if (draft.id === row.id && !dirtyRef.current) setDraft(toDraft(updated));
      setNotice({type:'success', text:row.is_published ? 'أُخفي المؤشر من الصفحة العامة مع الاحتفاظ بلقطته.' : 'تم نشر المؤشر في القائمة العامة.'});
    } catch (error) {if (mounted.current) setNotice({type:'error', text:error.status === 409 ? 'تغيّرت بيانات المؤشر. أعد تحميل القائمة قبل تغيير حالة النشر.' : error.message});}
    finally {if (mounted.current) setAction('');}
  }

  async function refreshRow(row) {
    const response = await request('/api/admin/rankings/refresh', {id:row.id});
    if (!response.indicator?.id || !response.snapshot) throw Error('لم يؤكد الخادم حفظ لقطة المصدر. أعد تحميل القائمة للتحقق.');
    if (!mounted.current) return response;
    const updated = mergeSaved(response.indicator, response.snapshot, row);
    if (draft.id === row.id && !dirtyRef.current) setDraft(toDraft(updated));
    return response;
  }

  async function refreshSingle(row) {
    if (writesDisabled) return;
    setAction(`refresh:${row.id}`); setNotice(null);
    try {
      const response = await refreshRow(row);
      if (mounted.current) setNotice({type:'success', text:`حُفظت لقطة المصدر للمؤشر «${row.name}». ${present(response.snapshot.latestYemenYear) ? 'أحدث سنة متاحة لليمن: ' + formatNumber(response.snapshot.latestYemenYear) + '.' : 'لا توجد قيمة يمنية متاحة في هذه اللقطة.'}`});
    } catch (error) {if (mounted.current) setNotice({type:'error', text:`تعذر تحديث «${row.name}»: ${error.message} ما زالت الواجهة تعرض آخر لقطة معروفة؛ أعد تحميل القائمة للتحقق عند انقطاع الاتصال.`});}
    finally {if (mounted.current) setAction('');}
  }

  async function refreshQueue() {
    if (writesDisabled || !filtered.length) return;
    const rows = [...filtered];
    queueCancelled.current = false; setNotice(null);
    let progress = {running:true, total:rows.length, completed:0, succeeded:0, failed:0, current:'', cancelled:false, results:[]};
    setQueue(progress);
    for (const row of rows) {
      if (!mounted.current || queueCancelled.current) break;
      progress = {...progress, current:row.name}; setQueue(progress);
      try {
        await refreshRow(row);
        progress = {...progress, completed:progress.completed + 1, succeeded:progress.succeeded + 1, results:[...progress.results, {id:row.id, name:row.name, success:true}]};
      } catch (error) {
        progress = {...progress, completed:progress.completed + 1, failed:progress.failed + 1, results:[...progress.results, {id:row.id, name:row.name, success:false, message:error.message}]};
      }
      if (mounted.current) setQueue(progress);
    }
    if (mounted.current) setQueue({...progress, running:false, current:'', cancelled:queueCancelled.current && progress.completed < progress.total});
  }

  return <div className={styles.root}>
    <header className={styles.heading}><div><span className="eyebrow">تحرير ومراجعة</span><h2>إدارة ترتيب اليمن عالمياً</h2><p>اختر معايير المقارنة، راجع تفسيرها، وحدّث لقطات المصدر عند الحاجة. لا تبدأ الواجهة أي تحديث أو نشر تلقائي.</p></div><button type="button" className="btn btn-outline" disabled={busy || loading} onClick={load}><RefreshCw size={17} aria-hidden="true"/> إعادة تحميل القائمة</button></header>

    {setupRequired && <div className={styles.warning} role="status"><AlertTriangle size={22} aria-hidden="true"/><div><strong>تهيئة التخزين مطلوبة قبل الحفظ أو تحديث المصدر</strong><p>المعروض حالياً مكتبة المؤشرات المرفقة، وليس سجلات تحرير محفوظة. يُراجع المسؤول المخوّل ملف <code dir="ltr">supabase/yemen-ranking.sql</code> لإنشاء الجداول، ثم <code dir="ltr">supabase/yemen-ranking-seed.sql</code> لاستيراد المعايير الأساسية إذا كانت القائمة فارغة. هذه الواجهة لا تنفذ SQL تلقائياً، وجميع عمليات الكتابة معطلة حتى اكتمال التهيئة.</p></div></div>}
    {loadError && <div className={styles.warning} role="alert"><AlertTriangle size={22} aria-hidden="true"/><div><strong>تعذر تحميل بيانات الإدارة</strong><p>{loadError}</p><p>احتُفظ بمسودة التحرير. استخدم إعادة تحميل القائمة للتحقق من الاتصال والصلاحيات.</p></div></div>}
    {notice && <p className={`${styles.notice} ${notice.type === 'error' ? styles.error : notice.type === 'success' ? styles.success : ''}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'success' ? <Check size={18} aria-hidden="true"/> : notice.type === 'error' ? <AlertTriangle size={18} aria-hidden="true"/> : null}{notice.text}</p>}
    {loading && <p role="status" className="small-muted">جارٍ تحميل المؤشرات وصلاحية التخزين…</p>}

    <div className={styles.layout}>
      <section className="admin-panel" aria-labelledby={`${fieldId}-editor`}><h2 ref={editorHeading} tabIndex={-1} id={`${fieldId}-editor`}><Pencil size={21} aria-hidden="true"/>{draft.id ? 'تعديل المؤشر' : 'إضافة مؤشر'}{dirty && <span className={styles.badge}>تعديلات غير محفوظة</span>}</h2>
        <form className={`admin-form ${styles.form}`} onSubmit={save}>
          <fieldset className={styles.fields} disabled={busy || loading || setupRequired}>
            <label htmlFor={`${fieldId}-name`}>اسم المؤشر بالعربية<input id={`${fieldId}-name`} value={draft.name} onChange={event => setField('name', event.target.value)} required minLength={2} maxLength={160}/></label>
            <div className="form-row"><label htmlFor={`${fieldId}-slug`}>الرابط المختصر<input id={`${fieldId}-slug`} dir="ltr" autoCapitalize="none" spellCheck={false} value={draft.slug} onChange={event => setField('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))} required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="gdp-per-capita"/></label><label htmlFor={`${fieldId}-category`}>المجال<select id={`${fieldId}-category`} value={draft.category} onChange={event => setField('category', event.target.value)} required>{rankingCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
            <div className="form-row"><label htmlFor={`${fieldId}-code`}>رمز المؤشر في البنك الدولي WDI<input id={`${fieldId}-code`} dir="ltr" autoCapitalize="characters" spellCheck={false} value={draft.code} onChange={event => setField('code', event.target.value.toUpperCase())} required minLength={2} maxLength={80} pattern="[A-Z0-9][A-Z0-9_.]+" placeholder="NY.GDP.PCAP.CD"/></label><label htmlFor={`${fieldId}-unit`}>وحدة القياس<input id={`${fieldId}-unit`} value={draft.unit} onChange={event => setField('unit', event.target.value)} required maxLength={120} placeholder="دولار أمريكي للفرد"/></label></div>
            <label htmlFor={`${fieldId}-description`}>التوضيح وحدود المقارنة<textarea id={`${fieldId}-description`} rows={4} value={draft.description} onChange={event => setField('description', event.target.value)} maxLength={3000} placeholder="اشرح معنى المؤشر، وما الذي ينبغي مراعاته عند تفسير ترتيب اليمن."/></label>
            <div className="form-row"><label htmlFor={`${fieldId}-direction`}>ترتيب القيم — من يحتل المرتبة الأولى؟<select id={`${fieldId}-direction`} value={draft.direction} onChange={event => setField('direction', event.target.value)}><option value="desc">القيمة الأكبر أولاً</option><option value="asc">القيمة الأصغر أولاً</option></select></label><label htmlFor={`${fieldId}-better`}>دلالة القيمة<select id={`${fieldId}-better`} value={draft.better} onChange={event => setField('better', event.target.value)}><option value="higher">الأعلى أفضل لهذا المؤشر</option><option value="lower">الأقل أفضل لهذا المؤشر</option><option value="contextual">تحتاج إلى سياق؛ ليست حكماً على التحسن</option></select></label></div>
            <p className="field-hint">ترتيب الأرقام ودلالتها قراران منفصلان. ارتفاع عدد السكان مثلاً لا يعني أن البلد «أفضل». استخدم التوضيح لمنع قراءة الترتيب كتقييم شامل لليمن.</p>
            <div className="form-row"><label htmlFor={`${fieldId}-order`}>ترتيب العرض في المنصة<input id={`${fieldId}-order`} type="number" min={0} max={10000} step={1} value={draft.display_order} onChange={event => setField('display_order', event.target.value)} required/></label><label className="checkline" htmlFor={`${fieldId}-published`}><input id={`${fieldId}-published`} type="checkbox" checked={Boolean(draft.is_published)} onChange={event => setField('is_published', event.target.checked)}/>نشر المؤشر في الصفحة العامة</label></div>
          </fieldset>
          <div className={styles.actions}><button type="submit" className="btn btn-primary" disabled={writesDisabled}><Save size={17} aria-hidden="true"/>{action === 'save' ? 'جارٍ الحفظ…' : draft.is_published ? 'حفظ ونشر المؤشر' : 'حفظ المسودة'}</button><button type="button" className="btn btn-outline" disabled={busy} onClick={resetEditor}><X size={17} aria-hidden="true"/>{dirty ? 'إلغاء التعديلات' : 'مؤشر جديد'}</button></div>
          {conflict && <div className={styles.warning}><p>يمكنك الاحتفاظ بمسودتك للمراجعة، أو استبدالها صراحةً بالنسخة الأحدث على الخادم.</p><button type="button" className="btn btn-outline" disabled={busy} onClick={replaceWithSaved}>استبدال المسودة بالنسخة المحفوظة</button></div>}
        </form>
        {draft.id && <section className={styles.editorSnapshot}><h3>لقطة المصدر المحفوظة لهذا المؤشر</h3><SnapshotFacts snapshot={selectedRow?.snapshot}/><button type="button" className="btn btn-outline" disabled={writesDisabled || dirty || !selectedRow} onClick={() => selectedRow && refreshSingle(selectedRow)}><RefreshCw size={17} aria-hidden="true"/> تحديث لقطة المصدر</button>{dirty && <p className="small-muted">احفظ التعديلات أو ألغها قبل تحديث هذا المؤشر.</p>}</section>}
      </section>

      <section className={`admin-panel ${styles.list}`} aria-labelledby={`${fieldId}-list`}><h2 id={`${fieldId}-list`}>المؤشرات {setupRequired ? 'في المعاينة' : 'المحفوظة'} <span className={styles.badge}>{formatNumber(indicators.length)}</span></h2>
        <div className={styles.filters}><label htmlFor={`${fieldId}-search`}><Search size={17} aria-hidden="true"/>البحث<input id={`${fieldId}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="اسم، رمز، أو وحدة"/></label><label htmlFor={`${fieldId}-filter-category`}>المجال<select id={`${fieldId}-filter-category`} value={category} onChange={event => setCategory(event.target.value)}><option value="all">جميع المجالات</option>{rankingCategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label htmlFor={`${fieldId}-filter-publication`}>حالة النشر<select id={`${fieldId}-filter-publication`} value={publication} onChange={event => setPublication(event.target.value)}><option value="all">الكل</option><option value="published">منشور</option><option value="draft">مسودة</option></select></label></div>
        <div className={styles.bulk}><p className="small-muted">المعروض: {formatNumber(filtered.length)}. التحديث الجماعي يشمل هذه القائمة عند بدء الطابور، بطلب واحد في كل مرة.</p><button type="button" className="btn btn-outline" disabled={writesDisabled || !filtered.length} onClick={refreshQueue}><RefreshCw size={17} aria-hidden="true"/>تحديث المؤشرات المعروضة ({formatNumber(filtered.length)})</button></div>
        {(queue.running || queue.total > 0) && <div className={styles.queue}><div role="status" aria-live="polite"><strong>{queue.running ? queueCancelled.current ? 'سيتوقف الطابور بعد اكتمال الطلب الجاري.' : `جارٍ تحديث: ${queue.current}` : queue.cancelled ? 'توقف الطابور بناءً على طلبك.' : 'اكتمل الطابور.'}</strong><p>{formatNumber(queue.completed)} من {formatNumber(queue.total)} · نجح {formatNumber(queue.succeeded)} · تعذر {formatNumber(queue.failed)}</p></div><progress aria-label="تقدم تحديث المؤشرات" value={queue.completed} max={queue.total}/>{queue.running && <button type="button" className="btn btn-outline" onClick={() => {queueCancelled.current = true; setQueue(current => ({...current}));}} disabled={queueCancelled.current}><Square size={15} aria-hidden="true"/>إيقاف بعد الطلب الجاري</button>}{queue.results.some(item => !item.success) && <details><summary>تفاصيل التحديثات غير المكتملة</summary><ul>{queue.results.filter(item => !item.success).map(item => <li key={item.id}><strong>{item.name}</strong>: {item.message}</li>)}</ul></details>}</div>}
        {!loading && !filtered.length && <div className={styles.empty}><p>{indicators.length ? 'لا توجد مؤشرات تطابق البحث والفلاتر.' : 'لم يُحفظ أي مؤشر بعد. اختر معياراً من المكتبة أو أضف مؤشراً جديداً.'}</p>{indicators.length > 0 && <button type="button" className="btn btn-outline" onClick={() => {setQuery(''); setCategory('all'); setPublication('all');}}>مسح البحث والفلاتر</button>}</div>}
        <div className={styles.rows}>{filtered.map(row => <article className={styles.row} key={row.id || row.slug}><div className={styles.rowHeading}><h3>{row.name}</h3><span className={styles.badge}>{setupRequired ? 'معاينة غير محفوظة' : row.is_published ? 'منشور' : 'مسودة'}</span></div><p className="small-muted">{categoryName(row.category)} · {row.unit}</p><code dir="ltr">{row.code}</code><details><summary>بيانات آخر لقطة</summary><SnapshotFacts snapshot={row.snapshot}/></details><div className={styles.actions}><button type="button" className="btn btn-outline" disabled={busy || setupRequired} onClick={() => openEditor(row)} aria-label={`تعديل ${row.name}`}><Pencil size={16} aria-hidden="true"/>تعديل</button><button type="button" className="btn btn-outline" disabled={writesDisabled || (dirty && draft.id === row.id)} onClick={() => toggle(row)} aria-label={`${row.is_published ? 'إخفاء' : 'نشر'} ${row.name}`}>{row.is_published ? <EyeOff size={16} aria-hidden="true"/> : <Eye size={16} aria-hidden="true"/>}{row.is_published ? 'إخفاء' : 'نشر'}</button><button type="button" className="btn btn-outline" disabled={writesDisabled || (dirty && draft.id === row.id)} onClick={() => refreshSingle(row)} aria-label={`تحديث مصدر ${row.name}`}><RefreshCw size={16} aria-hidden="true"/>{action === `refresh:${row.id}` ? 'جارٍ الجلب…' : 'تحديث المصدر'}</button></div></article>)}</div>
      </section>
    </div>

    <details className={`admin-panel ${styles.library}`}><summary><Library size={21} aria-hidden="true"/>مكتبة معايير جاهزة للمراجعة ({formatNumber(library.length)})</summary><p className="small-muted">اختيار معيار يجهز مسودة قابلة للتعديل فقط. راجع العنوان والوحدة والتفسير قبل الحفظ أو النشر؛ لا تضيف الواجهة هذه المكتبة إلى قاعدة البيانات تلقائياً.</p><label htmlFor={`${fieldId}-library-search`}>البحث في المكتبة<input id={`${fieldId}-library-search`} type="search" value={libraryQuery} onChange={event => setLibraryQuery(event.target.value)} placeholder="مثلاً: التعليم أو الصحة أو الكهرباء"/></label><div className={styles.libraryGrid}>{filteredLibrary.map(row => {
      const added = !setupRequired && indicators.some(item => item.slug === row.slug || item.code === row.code);
      return <article key={row.slug}><span className="eyebrow">{categoryName(row.category)}</span><h3>{row.name}</h3><code dir="ltr">{row.code}</code><p>{row.description}</p><button type="button" className="btn btn-outline" disabled={busy || loading || setupRequired || added} onClick={() => openEditor(row, true)}><Plus size={16} aria-hidden="true"/>{added ? 'مضاف إلى القائمة' : 'استخدام في مسودة جديدة'}</button></article>;
    })}</div>{!filteredLibrary.length && <p role="status">لا يوجد معيار مطابق في المكتبة. يمكنك إنشاء معيار برمز WDI آخر من نموذج التحرير.</p>}</details>
  </div>;
}
