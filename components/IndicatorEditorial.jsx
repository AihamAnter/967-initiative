import {BookOpenText,ExternalLink,Info,CalendarDays,FileText} from 'lucide-react';
import {normalizeIndicatorEditorial,safeEditorialReference} from '@/lib/indicatorEditorial';
import styles from './IndicatorEditorial.module.css';

// Pure presentational component, reusable for guest pages and editor preview.
export default function IndicatorEditorial({data,indicatorName='',preview=false}) {
  const item=normalizeIndicatorEditorial(data);
  if(!preview&&!item.is_published)return null;
  if(!item.intro&&!item.why_it_matters&&!item.historical_context&&!item.limitations&&!item.source_notes)return null;
  const sections=[
    {key:'why_it_matters',title:'لماذا يهم هذا المؤشر؟',icon:BookOpenText},
    {key:'historical_context',title:'ماذا تقول السنوات المتاحة؟',icon:CalendarDays},
    {key:'limitations',title:'ما الذي لا تخبرنا به الأرقام؟',icon:Info},
  ];
  const refs=item.reference_links.map(safeEditorialReference).filter(Boolean);
  return <section className={styles.editorial} aria-label="قراءة موسّعة للمؤشر">
    <header className={styles.header}>
      <span className={styles.eyebrow}><FileText size={16} aria-hidden="true"/> قراءة معرفية موثقة</span>
      <h2>{indicatorName?'لفهم «'+indicatorName+'»':'لفهم المؤشر'}</h2>
      <p>شرح يساعد على قراءة الرقم في سياقه، ولا يحل محل الجدول والمصدر الأصلي.</p>
    </header>
    {item.intro&&<p className={styles.lead}>{item.intro}</p>}
    <div className={styles.sections}>
      {sections.filter(section=>item[section.key]).map(({key,title,icon:Icon})=><section key={key} className={styles.section}>
        <h3><Icon size={19} aria-hidden="true"/>{title}</h3><p>{item[key]}</p>
      </section>)}
    </div>
    {(item.source_notes||refs.length>0||item.reviewed_on)&&<footer className={styles.footer}>
      <h3>المصادر وملاحظات التحرير</h3>
      {item.source_notes&&<p>{item.source_notes}</p>}
      {refs.length>0&&<ul>{refs.map(ref=><li key={ref.url}><a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title} <ExternalLink size={14} aria-hidden="true"/></a></li>)}</ul>}
      {item.reviewed_on&&<small>آخر مراجعة تحريرية للمصادر: <time dateTime={item.reviewed_on}>{item.reviewed_on}</time></small>}
    </footer>}
  </section>;
}
