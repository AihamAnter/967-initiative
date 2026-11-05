'use client';
import {BookMarked,CalendarRange,ExternalLink,Info} from 'lucide-react';
import {HISTORY_COMPARISON_GROUPS,HISTORY_COMPARISON_FIELDS} from '@/lib/historyComparisons';
import styles from './HistoryComparisonEditor.module.css';

export default function HistoryComparisonEditor({value,sources=[],onChange}){
 const data=value||{facts:{}};
 const facts=data.facts||{};
 const timeline=data.timeline||{};
 const available=sources.filter(source=>source.title&&/^https?:\/\/[^ ]+$/.test(source.url||''));
 const count=HISTORY_COMPARISON_FIELDS.filter(field=>facts[field.key]?.text?.trim()&&facts[field.key]?.sourceUrl).length;
 const changeFact=(key,part,next)=>{
  onChange({...data,facts:{...facts,[key]:{...(facts[key]||{}),[part]:next}}});
 };
 const changeTime=(part,next)=>{
  onChange({...data,timeline:{...timeline,[part]:next}});
 };
 const sourceSelect=(id,sourceUrl,onEdit,required=false)=><label className={styles.sourceLabel} htmlFor={id}>
  مصدر المعلومة
  <select id={id} value={sourceUrl||''} onChange={event=>onEdit(event.target.value)} required={required}>
   <option value="">اختر مرجعًا من مصادر المادة أعلاه</option>
   {available.map(source=><option value={source.url} key={source.url}>{source.title}</option>)}
  </select>
 </label>;
 return <section className={styles.editor} aria-label="بيانات مقارنة الدول التاريخية">
  <header className={styles.header}>
   <div><span><BookMarked size={19}/> ملف مقارنة الدولة</span><h4>13 معيارًا تاريخيًا قابلاً للتوثيق</h4><p>أضف معلومة دقيقة ومصدرًا من المراجع المسجلة أعلى الصفحة لكل معيار. ما لا يتوفر له دليل اتركه فارغًا؛ سيظهر للزائر أنه يحتاج توثيقًا.</p></div>
   <strong className={styles.count}>{count} / {HISTORY_COMPARISON_FIELDS.length}<small>معيار موثق</small></strong>
  </header>
  <div className={styles.notice}><Info size={18}/><p>لا تنقل العبارات العامة إلى حقول محددة مثل «المؤسس» أو «الحدود» دون دليل. يمكنك تعديل مصادر المادة أولًا، ثم اختيار أحدها لكل معلومة.</p></div>
  {HISTORY_COMPARISON_GROUPS.map((group,index)=><details key={group.id} className={styles.group} defaultOpen={index===0}>
   <summary><span><strong>{group.title}</strong><small>{group.description}</small></span><span className={styles.groupCount}>{group.fields.filter(field=>facts[field.key]?.text?.trim()&&facts[field.key]?.sourceUrl).length} من {group.fields.length}</span></summary>
   <div className={styles.fieldGrid}>{group.fields.map(field=>{
    const fact=facts[field.key]||{};
    const id='history-compare-source-'+field.key;
    return <div className={styles.field} key={field.key}>
     <label htmlFor={'history-compare-text-'+field.key}>{field.label}</label>
     <textarea id={'history-compare-text-'+field.key} rows={3} maxLength={500} value={fact.text||''} placeholder="اكتب المعلومة الموثقة أو اتركها فارغة" onChange={event=>changeFact(field.key,'text',event.target.value)}/>
     {sourceSelect(id,fact.sourceUrl,url=>changeFact(field.key,'sourceUrl',url),Boolean(fact.text?.trim()))}
     {fact.text?.trim()&&!fact.sourceUrl&&<small className={styles.hint}>اختر مرجعًا للمعلومة قبل الحفظ.</small>}
    </div>;
   })}</div>
  </details>)}
  <details className={styles.group}>
   <summary><span><strong><CalendarRange size={18}/> الفترة المستخدمة في الخط الزمني</strong><small>فترة نفوذ أو شواهد زمنية موثقة، وليست بالضرورة مدة وجود الدولة</small></span></summary>
   <div className={styles.timeline}>
    <p>أدخل نطاقًا رقميًا فقط إذا كان موثقًا في أحد المراجع. السنوات قبل الميلاد سالبة. إن لم تعرف البداية والنهاية، اتركهما فارغتين وسيظهر المرجع الزمني العام بدل حساب مدة غير مؤكدة.</p>
    <div className={styles.years}>
     <label>من سنة<input type="number" min={-30000} max={2100} value={timeline.from??''} onChange={e=>changeTime('from',e.target.value===''?'':Number(e.target.value))}/></label>
     <label>إلى سنة<input type="number" min={-30000} max={2100} value={timeline.to??''} onChange={e=>changeTime('to',e.target.value===''?'':Number(e.target.value))}/></label>
    </div>
    <label>وصف دقيق للنطاق<input maxLength={180} value={timeline.label||''} placeholder="مثلاً: فترة نفوذ تقريبية لا تشمل كامل عمر الدولة" onChange={e=>changeTime('label',e.target.value)}/></label>
    {sourceSelect('history-compare-timeline-source',timeline.sourceUrl,url=>changeTime('sourceUrl',url),timeline.from!==''&&timeline.from!=null&&timeline.to!==''&&timeline.to!=null)}
    {timeline.sourceUrl&&<a href={timeline.sourceUrl} target="_blank" rel="noopener noreferrer">راجع مصدر الفترة <ExternalLink size={14}/></a>}
   </div>
  </details>
 </section>;
}
