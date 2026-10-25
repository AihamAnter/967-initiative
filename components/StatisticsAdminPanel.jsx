'use client';
import ValidatedForm,{FormInput,FormTextarea,FormSelect,FormLabel} from './debates/ValidatedForm';
import {revealInvalidField,trackEditorFiles,publicationIntent} from './admin/formHelpers';
import useAdminEditor from './admin/useAdminEditor';
import EditorActions from './admin/EditorActions';
import AdminListTools,{useAdminList} from './admin/AdminListTools';


import {useCallback, useEffect, useMemo, useState} from 'react';
import Papa from 'papaparse';
import {
  AlertTriangle, BarChart3, Check, Database, Eye, EyeOff, FileSpreadsheet,
  Link2, Pencil, Plus, RefreshCw, Save, Search, Trash2, X,
} from 'lucide-react';
import {directionLabels, statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';
import {formatNumber, toLatinDigits, formatYear} from '@/lib/format';
import {fetchAllRows} from '@/lib/pagination';
import useAdminItemTarget from './inline/useAdminItemTarget';

const emptyIndicator = {
  name: '', slug: '', domain_id: '', short_description: '', definition: '', unit: '',
  improvement_direction: 'contextual', measurement_method: '', data_status: 'partial',
  chart_type: 'line', adopted_source_id: '', source_ids: [], is_published: false,
  hide_when_incomplete: true,
};
const emptySource = {name: '', publisher: '', url: '', description: '', is_active: true};
const newValueRow = () => ({clientId: crypto.randomUUID(), year: '', value: '', source_id: '', document_url: '', publication_date: '', methodology_note: '', value_status: 'official', is_published: false});
const slugify = value => String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

export default function StatisticsAdminPanel({db, canDelete = false,initialItem = ''}) {
  const [view, setView] = useState('indicators');
  const [sections, setSections] = useState([]);
  const [domains, setDomains] = useState([]);
  const [sources, setSources] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [links, setLinks] = useState([]);
  const [values, setValues] = useState([]);
  const [indicator, setIndicator] = useState(emptyIndicator);
  const [source, setSource] = useState(emptySource);
  const [valueRows, setValueRows] = useState([newValueRow()]);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('');
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [replaceDuplicates, setReplaceDuplicates] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const indicatorEditor=useAdminEditor({db,kind:'statistic',id:editingIndicator,value:indicator,onRestore:setIndicator,active:view==='indicators'});
  const sourceEditor=useAdminEditor({db,kind:'statistic_source',id:editingSource,value:source,onRestore:setSource,active:view==='sources'});
  const valueEditor=useAdminEditor({db,kind:'statistic_values',id:selectedIndicatorId,value:{rows:valueRows,csvRows,replaceDuplicates},onRestore:value=>{setValueRows(value.rows);setCsvRows(value.csvRows);setReplaceDuplicates(value.replaceDuplicates);},active:view==='values'});
  const loadAll = useCallback(async () => {
    setLoading(true); setSchemaMissing(false);
    const all=(table,select,order,ascending=true,unique='id')=>fetchAllRows(()=>db.from(table).select(select,{count:'exact'}).order(order,{ascending}).order(unique)).then(data=>({data}),error=>({error}));
    const [sectionResult, domainResult, sourceResult, indicatorResult, linkResult, valueResult] = await Promise.all([
      all('stat_sections','*','display_order'),
      all('stat_domains','*,section:stat_sections(*)','display_order'),
      all('stat_sources','*','name'),
      all('stat_indicators','*,domain:stat_domains(*),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)','updated_at',false),
      all('stat_indicator_sources','*','indicator_id',true,'source_id'),
      all('stat_values','*,source:stat_sources(*)','year',false),
    ]);
    const error = sectionResult.error || domainResult.error || sourceResult.error || indicatorResult.error || linkResult.error || valueResult.error;
    if (error) {
      setNotice('خطأ: ' + error.message);
      setSchemaMissing(error.code === '42P01' || error.code === 'PGRST205' || /could not find.*stat_/i.test(error.message || ''));
    } else {
      setSections(sectionResult.data || []); setDomains(domainResult.data || []); setSources(sourceResult.data || []);
      setIndicators(indicatorResult.data || []); setLinks(linkResult.data || []); setValues(valueResult.data || []);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useAdminItemTarget({item:initialItem,rows:indicators,loading,onSelect:item=>{editIndicator(item);setSelectedIndicatorId(item.id);setView('indicators');},onMissing:()=>setNotice('خطأ: لم يتم العثور على المؤشر المطلوب. لم يتغير أي محتوى.')});

  const filteredIndicators = useMemo(() => indicators.filter(item => {
    const needle = search.trim().toLocaleLowerCase('ar');
    return (!needle || [item.name, item.slug, item.unit, item.domain?.name].join(' ').toLocaleLowerCase('ar').includes(needle))
      && (domainFilter === 'all' || item.domain_id === domainFilter);
  }), [domainFilter, indicators, search]);
  const indicatorList=useAdminList(filteredIndicators,'statistic-indicators');
  const selectedIndicator = indicators.find(item => item.id === selectedIndicatorId);
  const selectedValues = values.filter(item => item.indicator_id === selectedIndicatorId);

  function resetIndicator() {if(!indicatorEditor.confirm())return;indicatorEditor.markClean(emptyIndicator); setIndicator(emptyIndicator); setEditingIndicator(null); setShowPreview(false); }
  function editIndicator(item) {if(!indicatorEditor.confirm())return;
    const sourceIds = links.filter(link => link.indicator_id === item.id).map(link => link.source_id);
    setIndicator({...emptyIndicator, ...item, adopted_source_id: item.adopted_source_id || '', source_ids: sourceIds});
    setEditingIndicator(item.id); setShowPreview(false); window.scrollTo({top: 0, behavior: 'smooth'});
  }
  async function saveIndicator(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const payload = {
        domain_id: indicator.domain_id, name: indicator.name.trim(), slug: slugify(indicator.slug),
        short_description: indicator.short_description.trim(), definition: indicator.definition.trim(), unit: indicator.unit.trim(),
        improvement_direction: indicator.improvement_direction, measurement_method: indicator.measurement_method.trim(),
        data_status: indicator.data_status, chart_type: indicator.chart_type,
        adopted_source_id: indicator.adopted_source_id || null, is_published: publicationIntent(event,indicator.is_published),
        hide_when_incomplete: indicator.hide_when_incomplete,
      };
      if (!payload.name || !payload.slug || !payload.domain_id || !payload.unit) throw Error('الاسم والرابط والمجال والوحدة حقول إلزامية.');
      if (payload.is_published && payload.hide_when_incomplete && payload.data_status !== 'complete') throw Error('المؤشر مخفي عند عدم اكتمال البيانات. غيّر الحالة إلى مكتملة أو ألغِ خيار الإخفاء قبل النشر.');
      const result = editingIndicator
        ? await db.from('stat_indicators').update(payload).eq('id', editingIndicator).select().single()
        : await db.from('stat_indicators').insert(payload).select().single();
      if (result.error) throw Error(result.error.message);
      const id = result.data.id;
      const sourceIds = [...new Set([...indicator.source_ids, indicator.adopted_source_id].filter(Boolean))];
      const deleted = await db.from('stat_indicator_sources').delete().eq('indicator_id', id);
      if (deleted.error) throw Error(deleted.error.message);
      if (sourceIds.length) {
        const linked = await db.from('stat_indicator_sources').insert(sourceIds.map(sourceId => ({indicator_id: id, source_id: sourceId, is_adopted: sourceId === indicator.adopted_source_id})));
        if (linked.error) throw Error(linked.error.message);
      }
      await indicatorEditor.clearDraft();setNotice('تم حفظ المؤشر ومصادره.');if(event.nativeEvent?.submitter?.value==='new'){setIndicator(emptyIndicator);setEditingIndicator(null);indicatorEditor.markClean(emptyIndicator);}else{const next={...indicator,is_published:payload.is_published};setIndicator(next);setEditingIndicator(id);indicatorEditor.markClean(next);}await loadAll();
    } catch (error) { setNotice('خطأ: ' + error.message); }
    setBusy(false);
  }
  async function toggleIndicator(item) {
    setBusy(true); const {error} = await db.from('stat_indicators').update({is_published: !item.is_published}).eq('id', item.id);
    setNotice(error ? 'خطأ: ' + error.message : item.is_published ? 'أُعيد المؤشر إلى المسودة.' : 'تم نشر المؤشر.'); await loadAll(); setBusy(false);
  }
  async function deleteIndicator(item) {
    if (!canDelete) { setNotice('خطأ: الحذف متاح لحساب الإدارة فقط.'); return; }
    if (!confirm(`حذف مؤشر «${item.name}» وكل قيمه نهائياً؟`)) return;
    setBusy(true); const {error} = await db.from('stat_indicators').delete().eq('id', item.id);
    setNotice(error ? 'خطأ: ' + error.message : 'تم حذف المؤشر.'); if (selectedIndicatorId === item.id) setSelectedIndicatorId(''); await loadAll(); setBusy(false);
  }

  function toggleSourceForIndicator(sourceId) {
    setIndicator(current => ({...current, source_ids: current.source_ids.includes(sourceId) ? current.source_ids.filter(id => id !== sourceId) : [...current.source_ids, sourceId]}));
  }
  async function saveSource(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const payload = {...source, name: source.name.trim(), publisher: source.publisher.trim(), url: source.url.trim() || null, description: source.description.trim()};
      if (!payload.name) throw Error('اسم المصدر مطلوب.');
      const result = editingSource ? await db.from('stat_sources').update(payload).eq('id', editingSource).select().single() : await db.from('stat_sources').insert(payload).select().single();
      if (result.error) throw Error(result.error.message);
      await sourceEditor.clearDraft();if(event.nativeEvent?.submitter?.value==='new'){setSource(emptySource);setEditingSource(null);sourceEditor.markClean(emptySource);}else{setEditingSource(result.data.id);sourceEditor.markClean(source);}setNotice('تم حفظ المصدر.');await loadAll();
    } catch (error) { setNotice('خطأ: ' + error.message); }
    setBusy(false);
  }
  function editSource(item) {if(!sourceEditor.confirm())return;const next={...item,url:item.url||''};setSource(next);sourceEditor.markClean(next); setEditingSource(item.id); }
  async function deleteSource(item) {
    if (!canDelete) { setNotice('خطأ: الحذف متاح لحساب الإدارة فقط.'); return; }
    if (!confirm(`حذف المصدر «${item.name}»؟ لن ينجح الحذف إذا كانت له قيم مرتبطة.`)) return;
    setBusy(true); const {error} = await db.from('stat_sources').delete().eq('id', item.id);
    setNotice(error ? 'خطأ: ' + error.message : 'تم حذف المصدر.'); await loadAll(); setBusy(false);
  }

  function updateValueRow(clientId, field, value) { setValueRows(rows => rows.map(row => row.clientId === clientId ? {...row, [field]: value} : row)); }
  async function saveValues(event) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      if (!selectedIndicatorId) throw Error('اختر المؤشر أولاً.');
      const payloads = valueRows.map(row => ({
        indicator_id: selectedIndicatorId, source_id: row.source_id, year: Number(toLatinDigits(row.year)), value: Number(toLatinDigits(row.value)),
        document_url: row.document_url.trim() || null, publication_date: row.publication_date || null,
        national_scope: true, methodology_note: row.methodology_note.trim(), value_status: row.value_status,
        is_published: row.is_published,
      }));
      for (const row of payloads) if (!row.source_id || !Number.isInteger(row.year) || row.year < 1990 || row.year > 2100 || !Number.isFinite(row.value)) throw Error('راجع السنة والقيمة والمصدر في جميع الصفوف.');
      const ownKeys = new Set();
      for (const row of payloads) { const key = `${row.year}:${row.source_id}`; if (ownKeys.has(key)) throw Error(`تكررت السنة والمصدر داخل النموذج: ${row.year}`); ownKeys.add(key); }
      const duplicate = payloads.find(row => selectedValues.some(old => old.year === row.year && old.source_id === row.source_id));
      if (duplicate && !replaceDuplicates) throw Error(`توجد قيمة محفوظة للسنة ${duplicate.year} والمصدر نفسه. فعّل الاستبدال للتحديث الصريح.`);
      const result = replaceDuplicates
        ? await db.from('stat_values').upsert(payloads, {onConflict: 'indicator_id,year,source_id'})
        : await db.from('stat_values').insert(payloads);
      if (result.error) throw Error(result.error.message);
      await valueEditor.clearDraft();setNotice(`تم حفظ ${payloads.length} قيمة وطنية.`); if(event.nativeEvent?.submitter?.value==='new'){const rows=[newValueRow()];setValueRows(rows);setReplaceDuplicates(false);valueEditor.markClean({rows,csvRows:[],replaceDuplicates:false});}else{setReplaceDuplicates(true);valueEditor.markClean({rows:valueRows,csvRows:[],replaceDuplicates:true});}await loadAll();
    } catch (error) { setNotice('خطأ: ' + error.message); }
    setBusy(false);
  }
  async function toggleValue(item) {
    setBusy(true); const {error} = await db.from('stat_values').update({is_published: !item.is_published}).eq('id', item.id);
    setNotice(error ? 'خطأ: ' + error.message : 'تم تحديث حالة القيمة.'); await loadAll(); setBusy(false);
  }
  async function deleteValue(item) {
    if (!canDelete) { setNotice('خطأ: الحذف متاح لحساب الإدارة فقط.'); return; }
    if (!confirm(`حذف قيمة سنة ${item.year}؟`)) return;
    setBusy(true); const {error} = await db.from('stat_values').delete().eq('id', item.id);
    setNotice(error ? 'خطأ: ' + error.message : 'تم حذف القيمة.'); await loadAll(); setBusy(false);
  }

  function parseCsv(file) {
    setCsvRows([]); setNotice('');
    if (!file) return;
    Papa.parse(file, {header: true, skipEmptyLines: true, transformHeader: header => header.trim().toLowerCase(), complete: result => {
      const seen = new Set();
      const rows = result.data.map((row, index) => {
        const sourceMatch = sources.find(item => item.id === row.source || item.name.trim().toLowerCase() === String(row.source || '').trim().toLowerCase()) || sources.find(item => item.id === row.source_id);
        const year = Number(toLatinDigits(row.year)); const value = Number(toLatinDigits(row.value));
        const errors = [];
        if (!Number.isInteger(year) || year < 1990 || year > 2100) errors.push('سنة غير صالحة');
        if (!String(row.value ?? '').trim() || !Number.isFinite(value)) errors.push('قيمة غير صالحة');
        if (!sourceMatch) errors.push('المصدر غير معروف');
        const key = `${year}:${sourceMatch?.id}`;
        if (seen.has(key)) errors.push('مكرر داخل الملف'); seen.add(key);
        const duplicate = selectedValues.some(old => old.year === year && old.source_id === sourceMatch?.id);
        if (duplicate && !replaceDuplicates) errors.push('موجود مسبقاً');
        const status = String(row.value_status || 'official').toLowerCase();
        if (!['official', 'estimated'].includes(status)) errors.push('حالة القيمة غير صالحة');
        return {rowNumber: index + 2, year, value, source_id: sourceMatch?.id || '', sourceName: sourceMatch?.name || row.source || '', document_url: row.document_url || '', publication_date: row.publication_date || '', methodology_note: row.methodology_note || '', value_status: status, is_published: ['true', '1', 'yes', 'نعم'].includes(String(row.is_published).toLowerCase()), errors};
      });
      if (result.errors.length) setNotice('خطأ: تعذر قراءة بعض صفوف CSV. راجع تنسيق الملف.');
      setCsvRows(rows);
    }});
  }
  async function importCsv() {
    setBusy(true); setNotice('');
    try {
      if (!selectedIndicatorId) throw Error('اختر المؤشر أولاً.');
      if (!csvRows.length || csvRows.some(row => row.errors.length)) throw Error('أصلح أخطاء المعاينة قبل الاستيراد.');
      const payload = csvRows.map(({rowNumber, sourceName, errors, ...row}) => ({...row, indicator_id: selectedIndicatorId, national_scope: true, document_url: row.document_url || null, publication_date: row.publication_date || null}));
      const result = replaceDuplicates ? await db.from('stat_values').upsert(payload, {onConflict: 'indicator_id,year,source_id'}) : await db.from('stat_values').insert(payload);
      if (result.error) throw Error(result.error.message);
      setNotice(`تم استيراد ${payload.length} صفاً بعد المعاينة.`); setCsvRows([]); await loadAll();
    } catch (error) { setNotice('خطأ: ' + error.message); }
    setBusy(false);
  }

  if (loading) return <div className="admin-panel"><p className="small-muted">جارٍ تحميل إدارة الإحصائيات...</p></div>;
  if (schemaMissing) return <div className="admin-panel stats-schema-message"><AlertTriangle size={28}/><h2>جداول اليمن بالأرقام غير موجودة</h2><p>شغّل الملف <code>supabase/yemen-in-numbers.sql</code> مرة واحدة في Supabase SQL Editor، ثم اضغط تحديث.</p><button className="btn btn-outline" onClick={loadAll}><RefreshCw size={17}/> تحديث</button></div>;

  return <div className="stats-admin">
    <div className="stats-admin-nav">{[
      ['indicators', 'المؤشرات والمجالات', BarChart3], ['values', 'القيم وCSV', FileSpreadsheet], ['sources', 'المصادر', Link2],
    ].map(([id, label, Icon]) => <button key={id} className={view === id ? 'selected' : ''} onClick={() => (view==='indicators'?indicatorEditor:view==='values'?valueEditor:sourceEditor).leave(()=>{setView(id);setNotice('');})}><Icon size={17}/>{label}</button>)}</div>
    {notice && <p className={'feedback ' + (notice.startsWith('خطأ') ? 'error' : 'success')} role="status">{notice}</p>}

    {view === 'indicators' && <div className="stats-admin-layout">
      <section className="admin-panel"><h2><Plus size={20}/> {editingIndicator ? 'تعديل المؤشر' : 'إضافة مؤشر وطني'}</h2>
        <ValidatedForm className="admin-form stats-indicator-form" onSubmit={saveIndicator} data-editor-key={indicatorEditor.key} onInvalidCapture={revealInvalidField} onChangeCapture={event=>trackEditorFiles(event,indicatorEditor)}><EditorActions editor={indicatorEditor} busy={busy} value={indicator} published={indicator.is_published}/><fieldset className="admin-editor-fields" disabled={busy}>
          <div className="form-row"><FormLabel>اسم المؤشر<FormInput required value={indicator.name} onChange={event => setIndicator({...indicator, name: event.target.value})}/></FormLabel><FormLabel>الرابط المختصر بالإنجليزية<FormInput required dir="ltr" placeholder="population-growth" value={indicator.slug} onChange={event => setIndicator({...indicator, slug: event.target.value})}/></FormLabel></div>
          <FormLabel>المجال<FormSelect required value={indicator.domain_id} onChange={event => setIndicator({...indicator, domain_id: event.target.value})}><option value="">اختر المجال</option>{sections.map(section => <optgroup key={section.id} label={section.name}>{domains.filter(domain => domain.section_id === section.id).map(domain => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</optgroup>)}</FormSelect></FormLabel>
          <FormLabel>وصف قصير<FormTextarea rows="2" value={indicator.short_description} onChange={event => setIndicator({...indicator, short_description: event.target.value})}/></FormLabel>
          <FormLabel>تعريف المؤشر<FormTextarea rows="3" value={indicator.definition} onChange={event => setIndicator({...indicator, definition: event.target.value})}/></FormLabel>
          <div className="form-row"><FormLabel>الوحدة<FormInput required placeholder="%، شخص، مليون دولار..." value={indicator.unit} onChange={event => setIndicator({...indicator, unit: event.target.value})}/></FormLabel><FormLabel>اتجاه التحسن<FormSelect value={indicator.improvement_direction} onChange={event => setIndicator({...indicator, improvement_direction: event.target.value})}>{Object.entries(directionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</FormSelect></FormLabel></div>
          <FormLabel>طريقة القياس والمنهجية<FormTextarea rows="3" value={indicator.measurement_method} onChange={event => setIndicator({...indicator, measurement_method: event.target.value})}/></FormLabel>
          <div className="form-row"><FormLabel>حالة البيانات<FormSelect value={indicator.data_status} onChange={event => setIndicator({...indicator, data_status: event.target.value})}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</FormSelect></FormLabel><FormLabel>نوع الرسم<FormSelect value={indicator.chart_type} onChange={event => setIndicator({...indicator, chart_type: event.target.value})}><option value="line">خطي</option><option value="bar">أعمدة</option><option value="area">مساحة</option></FormSelect></FormLabel></div>
          <fieldset className="stats-source-picker"><legend>مصادر المؤشر</legend>{sources.length ? sources.map(item => <FormLabel key={item.id}><FormInput type="checkbox" checked={indicator.source_ids.includes(item.id)} onChange={() => toggleSourceForIndicator(item.id)}/><span>{item.name}</span></FormLabel>) : <p className="small-muted">أضف مصدراً من تبويب المصادر أولاً.</p>}</fieldset>
          <FormLabel>السلسلة المعتمدة<FormSelect value={indicator.adopted_source_id} onChange={event => setIndicator({...indicator, adopted_source_id: event.target.value})}><option value="">لم تُحدد</option>{sources.filter(item => indicator.source_ids.includes(item.id)).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</FormSelect></FormLabel>
          <div className="stats-publish-options"><FormLabel className="checkline"><FormInput type="checkbox" checked={indicator.hide_when_incomplete} onChange={event => setIndicator({...indicator, hide_when_incomplete: event.target.checked})}/> إخفاء المؤشر إذا كانت بياناته غير مكتملة</FormLabel><FormLabel className="checkline"><FormInput type="checkbox" checked={indicator.is_published} onChange={event => setIndicator({...indicator, is_published: event.target.checked})}/> نشر المؤشر</FormLabel></div>

          {showPreview && <div className="stat-admin-preview"><span>{domains.find(item => item.id === indicator.domain_id)?.name || 'المجال'}</span><h3>{indicator.name || 'اسم المؤشر'}</h3><p>{indicator.short_description || 'سيظهر الوصف المختصر هنا.'}</p><strong>{indicator.unit || 'الوحدة'}</strong><small>{indicator.is_published ? 'جاهز للنشر' : 'مسودة'}</small></div>}
        </fieldset></ValidatedForm>
      </section>
      <section className="admin-panel"><h2>المؤشرات ({formatNumber(filteredIndicators.length)})</h2><AdminListTools list={indicatorList}/><div className="stats-admin-filters"><FormSelect aria-label="المجال" value={domainFilter} onChange={event => setDomainFilter(event.target.value)}><option value="all">كل المجالات</option>{domains.map(domain => <option value={domain.id} key={domain.id}>{domain.name}</option>)}</FormSelect></div>{indicatorList.items.map(item => <div className="admin-list-item" key={item.id}><div><strong>{item.name}</strong><small>{item.domain?.name} · {item.unit} · {item.is_published ? 'منشور' : 'مسودة'}</small></div><div><button title="تعديل" onClick={() => editIndicator(item)}><Pencil size={17}/></button><button title={item.is_published ? 'إلغاء النشر' : 'نشر'} onClick={() => toggleIndicator(item)}>{item.is_published ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{canDelete && <button title="حذف" onClick={() => deleteIndicator(item)}><Trash2 size={17}/></button>}</div></div>)}{!filteredIndicators.length && <p className="small-muted">لا توجد مؤشرات مطابقة.</p>}</section>
    </div>}

    {view === 'values' && <div className="stats-values-admin">
      <section className="admin-panel"><div className="stats-value-head"><div><h2><Database size={20}/> قيم المؤشر</h2><p>كل القيم وطنية على مستوى الجمهورية اليمنية حصراً.</p></div><FormLabel>المؤشر<FormSelect value={selectedIndicatorId} onChange={event => {const id=event.target.value;valueEditor.leave(()=>{const rows=[newValueRow()];setSelectedIndicatorId(id);setValueRows(rows);setCsvRows([]);setReplaceDuplicates(false);valueEditor.markClean({rows,csvRows:[],replaceDuplicates:false});});}}><option value="">اختر مؤشراً</option>{indicators.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</FormSelect></FormLabel></div>
        <ValidatedForm className="admin-form" onSubmit={saveValues} data-editor-key={valueEditor.key} onInvalidCapture={revealInvalidField} onChangeCapture={event=>trackEditorFiles(event,valueEditor)}><EditorActions editor={valueEditor} busy={busy} value={{title:selectedIndicator?.name,sections:valueRows.map(row=>({title:String(row.year),text:String(row.value)}))}} published={valueRows.some(row=>row.is_published)}/><fieldset className="admin-editor-fields" disabled={busy}><div className="stats-value-rows">{valueRows.map((row, index) => <div className="stats-value-row" key={row.clientId}><div className="stats-value-row-head"><strong>القيمة {formatNumber(index + 1)}</strong>{valueRows.length > 1 && <button type="button" title="حذف الصف" onClick={() => setValueRows(rows => rows.filter(item => item.clientId !== row.clientId))}><Trash2 size={16}/></button>}</div><div className="stats-value-grid"><FormLabel>السنة<FormInput required type="number" min="1990" max="2100" dir="ltr" value={row.year} onChange={event => updateValueRow(row.clientId, 'year', event.target.value)}/></FormLabel><FormLabel>القيمة<FormInput required inputMode="decimal" dir="ltr" value={row.value} onChange={event => updateValueRow(row.clientId, 'value', event.target.value)}/></FormLabel><FormLabel>المصدر<FormSelect required value={row.source_id} onChange={event => updateValueRow(row.clientId, 'source_id', event.target.value)}><option value="">اختر</option>{sources.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</FormSelect></FormLabel><FormLabel>نوع القيمة<FormSelect value={row.value_status} onChange={event => updateValueRow(row.clientId, 'value_status', event.target.value)}>{Object.entries(valueStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</FormSelect></FormLabel><FormLabel>تاريخ النشر<FormInput type="date" value={row.publication_date} onChange={event => updateValueRow(row.clientId, 'publication_date', event.target.value)}/></FormLabel><FormLabel>رابط الوثيقة<FormInput type="url" dir="ltr" placeholder="https://..." value={row.document_url} onChange={event => updateValueRow(row.clientId, 'document_url', event.target.value)}/></FormLabel></div><FormLabel>ملاحظة منهجية<FormInput value={row.methodology_note} onChange={event => updateValueRow(row.clientId, 'methodology_note', event.target.value)}/></FormLabel><FormLabel className="checkline"><FormInput type="checkbox" checked={row.is_published} onChange={event => updateValueRow(row.clientId, 'is_published', event.target.checked)}/> نشر هذه القيمة</FormLabel></div>)}</div><button type="button" className="btn btn-outline" onClick={()=>setValueRows(rows=>[...rows,newValueRow()])}>إضافة قيمة أخرى</button><FormLabel className="checkline stats-replace"><FormInput type="checkbox" checked={replaceDuplicates} onChange={event => {setReplaceDuplicates(event.target.checked); setCsvRows([]);}}/> استبدال القيم المتكررة صراحةً بدلاً من رفضها</FormLabel></fieldset></ValidatedForm>
      </section>
      <section className="admin-panel stats-csv-panel"><h2><FileSpreadsheet size={20}/> استيراد CSV</h2><p>الرؤوس المطلوبة: <code>year,value,source</code>. الاختيارية: <code>document_url,publication_date,methodology_note,value_status,is_published</code>.</p><FormInput type="file" accept=".csv,text/csv" onChange={event => parseCsv(event.target.files?.[0])} disabled={!selectedIndicatorId}/>{csvRows.length > 0 && <><div className="stats-csv-table"><table><thead><tr><th>الصف</th><th>السنة</th><th>القيمة</th><th>المصدر</th><th>الفحص</th></tr></thead><tbody>{csvRows.map(row => <tr className={row.errors.length ? 'has-error' : ''} key={row.rowNumber}><td>{formatNumber(row.rowNumber)}</td><td>{formatYear(row.year)}</td><td dir="ltr">{row.value}</td><td>{row.sourceName}</td><td>{row.errors.length ? row.errors.join('، ') : <span className="csv-valid"><Check size={15}/> صالح</span>}</td></tr>)}</tbody></table></div><button className="btn btn-red" disabled={busy || csvRows.some(row => row.errors.length)} onClick={importCsv}>استيراد بعد المعاينة <FileSpreadsheet size={17}/></button></>}</section>
      <section className="admin-panel"><h2>القيم المحفوظة {selectedIndicator && `· ${selectedIndicator.name}`}</h2>{selectedValues.map(item => <div className="admin-list-item" key={item.id}><div><strong>{formatYear(item.year)} · {formatNumber(item.value, {maximumFractionDigits: 4})} {selectedIndicator?.unit}</strong><small>{item.source?.name} · {valueStatusLabels[item.value_status]} · {item.is_published ? 'منشورة' : 'مسودة'}</small></div><div><button title={item.is_published ? 'إلغاء النشر' : 'نشر'} onClick={() => toggleValue(item)}>{item.is_published ? <EyeOff size={17}/> : <Eye size={17}/>}</button>{canDelete && <button title="حذف" onClick={() => deleteValue(item)}><Trash2 size={17}/></button>}</div></div>)}{selectedIndicatorId && !selectedValues.length && <p className="small-muted">لم تُحفظ قيم لهذا المؤشر بعد.</p>}{!selectedIndicatorId && <p className="small-muted">اختر مؤشراً لعرض قيمه.</p>}</section>
    </div>}

    {view === 'sources' && <div className="stats-admin-layout"><section className="admin-panel"><h2><Plus size={20}/> {editingSource ? 'تعديل المصدر' : 'إضافة مصدر'}</h2><ValidatedForm className="admin-form" onSubmit={saveSource} data-editor-key={sourceEditor.key} onInvalidCapture={revealInvalidField} onChangeCapture={event=>trackEditorFiles(event,sourceEditor)}><EditorActions editor={sourceEditor} busy={busy} value={source} saveLabel="حفظ المصدر" onCancel={()=>{if(sourceEditor.confirm()){setSource(emptySource);setEditingSource(null);sourceEditor.markClean(emptySource);}}}/><fieldset className="admin-editor-fields" disabled={busy}><FormLabel>اسم المصدر<FormInput required value={source.name} onChange={event => setSource({...source, name: event.target.value})}/></FormLabel><FormLabel>الجهة الناشرة<FormInput value={source.publisher} onChange={event => setSource({...source, publisher: event.target.value})}/></FormLabel><FormLabel>رابط المصدر<FormInput type="url" dir="ltr" placeholder="https://..." value={source.url} onChange={event => setSource({...source, url: event.target.value})}/></FormLabel><FormLabel>وصف وملاحظات<FormTextarea rows="4" value={source.description} onChange={event => setSource({...source, description: event.target.value})}/></FormLabel><FormLabel className="checkline"><FormInput type="checkbox" checked={source.is_active} onChange={event => setSource({...source, is_active: event.target.checked})}/> مصدر نشط</FormLabel></fieldset></ValidatedForm></section><section className="admin-panel"><h2>المصادر ({formatNumber(sources.length)})</h2>{sources.map(item => <div className="admin-list-item" key={item.id}><div><strong>{item.name}</strong><small>{item.publisher || 'دون جهة ناشرة'} · {item.is_active ? 'نشط' : 'مخفي'}</small></div><div><button title="تعديل" onClick={() => editSource(item)}><Pencil size={17}/></button>{canDelete && <button title="حذف" onClick={() => deleteSource(item)}><Trash2 size={17}/></button>}</div></div>)}{!sources.length && <p className="small-muted">لم تُضف مصادر بعد.</p>}</section></div>}
  </div>;
}
