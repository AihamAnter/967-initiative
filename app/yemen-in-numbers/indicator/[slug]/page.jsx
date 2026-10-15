import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AlertTriangle, ArrowRight, CalendarDays, ExternalLink, Info, Ruler, ShieldCheck} from 'lucide-react';
import IndicatorActions from '@/components/IndicatorActions';
import IndicatorChart from '@/components/IndicatorChart';
import {getStatIndicator} from '@/lib/data';
import {formatArabicDate, formatNumber} from '@/lib/format';
import {directionLabels, statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug} = await params;
  const indicator = await getStatIndicator(slug);
  if (!indicator) return {title: 'المؤشر غير موجود'};
  return {title: indicator.name, description: indicator.short_description || indicator.definition, alternates: {canonical: `/yemen-in-numbers/indicator/${indicator.slug}`}};
}

export default async function IndicatorPage({params}) {
  const {slug} = await params;
  const indicator = await getStatIndicator(slug);
  if (!indicator) notFound();
  const latest = indicator.latestValue;
  const sourceIds = new Set(indicator.allValues.map(value => value.source_id));
  return <>
    <section className="stat-indicator-head"><div className="container">
      <Link className="back-link" href={'/yemen-in-numbers/' + indicator.domain.slug}><ArrowRight size={17}/> {indicator.domain.name}</Link>
      <span className="eyebrow">{indicator.domain.section?.name} / مؤشر وطني</span>
      <div className="stat-indicator-title"><div><h1>{indicator.name}</h1><p>{indicator.short_description || indicator.definition}</p></div>{latest ? <div className="stat-latest"><span>أحدث قيمة منشورة</span><strong dir="ltr">{formatNumber(latest.value, {maximumFractionDigits: 3})}</strong><b>{indicator.unit}</b><small>{formatNumber(latest.year)}</small></div> : <div className="stat-latest stat-no-latest"><span>لا توجد قيمة منشورة</span></div>}</div>
      <IndicatorActions indicator={indicator}/>
    </div></section>
    <section className="section stat-indicator-body"><div className="container">
      <div className="stat-detail-layout"><div className="stat-chart-panel"><div className="stat-panel-head"><div><span>السلسلة الزمنية</span><h2>التغير السنوي</h2></div><span>{indicator.unit}</span></div><IndicatorChart values={indicator.values} unit={indicator.unit} type={indicator.chart_type}/>{sourceIds.size > 1 && !indicator.adopted_source_id && <p className="stat-warning"><AlertTriangle size={17}/> توجد قيم من أكثر من مصدر ولم تُحدّد سلسلة معتمدة، لذلك أوقف الرسم حتى لا يخلط سلاسل غير متوافقة. القيم الأصلية متاحة في ملف CSV.</p>}</div>
      <aside className="stat-facts"><h2>بطاقة المؤشر</h2><dl><div><dt><Ruler size={16}/> الوحدة</dt><dd>{indicator.unit}</dd></div><div><dt><ShieldCheck size={16}/> حالة البيانات</dt><dd>{statusLabels[indicator.data_status]}</dd></div><div><dt><Info size={16}/> اتجاه التحسن</dt><dd>{directionLabels[indicator.improvement_direction]}</dd></div>{latest && <div><dt><CalendarDays size={16}/> طبيعة أحدث قيمة</dt><dd>{valueStatusLabels[latest.value_status]}</dd></div>}</dl></aside></div>
      <div className="stat-explanation-grid"><section><span className="eyebrow">ما الذي يقيسه؟</span><h2>التعريف</h2><p>{indicator.definition || 'لم يُضف تعريف تفصيلي لهذا المؤشر بعد.'}</p></section><section><span className="eyebrow">كيف نقرأه؟</span><h2>المعنى والمنهجية</h2><p>{indicator.measurement_method || 'راجع المصدر ووثيقة النشر لفهم طريقة القياس وحدود المقارنة.'}</p></section></div>
      <section className="stat-sources"><div className="stat-panel-head"><div><span>التوثيق</span><h2>المصادر والوثائق</h2></div></div>{indicator.sources.length ? <div className="stat-source-list">{indicator.sources.map(item => <article key={item.source_id}><div><strong>{item.source?.name}</strong>{item.is_adopted && <span>السلسلة المعتمدة</span>}<p>{item.methodology || item.source?.description || 'مصدر مستخدم في توثيق هذا المؤشر.'}</p></div>{item.source?.url && <a href={item.source.url} target="_blank" rel="noopener noreferrer">زيارة المصدر <ExternalLink size={15}/></a>}</article>)}</div> : latest?.source ? <div className="stat-source-list"><article><div><strong>{latest.source.name}</strong><p>{latest.methodology_note || 'مصدر أحدث قيمة منشورة.'}</p></div>{latest.source.url && <a href={latest.source.url} target="_blank" rel="noopener noreferrer">زيارة المصدر <ExternalLink size={15}/></a>}</article></div> : <p className="small-muted">لم تُضف تفاصيل المصدر بعد.</p>}
      {latest?.document_url && <a className="stat-document-link" href={latest.document_url} target="_blank" rel="noopener noreferrer">وثيقة أحدث قيمة <ExternalLink size={16}/></a>}{latest?.publication_date && <small>تاريخ النشر: {formatArabicDate(latest.publication_date)}</small>}</section>
    </div></section>
  </>;
}
