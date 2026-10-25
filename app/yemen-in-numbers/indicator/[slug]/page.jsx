import ContentReadingAction from '@/components/reading/ContentReadingAction';
import Link from '@/components/SiteLink';
import nextDynamic from 'next/dynamic';
import {notFound} from 'next/navigation';
import {AlertTriangle, ArrowRight, CalendarDays, ExternalLink, Info, Ruler, ShieldCheck} from 'lucide-react';
import IndicatorActions from '@/components/IndicatorActions';
import InlineTarget from '@/components/inline/InlineTarget';
import {getStatIndicator} from '@/lib/data';
import {formatArabicDate, formatNumber, formatYear} from '@/lib/format';
import {directionLabels, statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';
import {detailPath, hasIndexableIndicator, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, indicatorSchema, JsonLd} from '@/lib/seo-schema';
import {dataStatusHelp,indicatorReading,sourceLabel} from '@/lib/indicatorPresentation';
const IndicatorChart=nextDynamic(()=>import('@/components/IndicatorChart'),{loading:()=><p role="status">جارٍ تجهيز الرسم…</p>});

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug} = await params;
  const indicator = await getStatIndicator(slug);
  if (!indicator) notFound();
  return pageMetadata({title:indicator.name, description:indicator.short_description || indicator.definition, path:detailPath('yemen-in-numbers/indicator', indicator.slug), noindex:!hasIndexableIndicator(indicator)});
}

export default async function IndicatorPage({params}) {
  const {slug} = await params;
  const indicator = await getStatIndicator(slug);
  if (!indicator) notFound();
  const latest = indicator.latestValue;
  const sourceIds = new Set(indicator.allValues.map(value => value.source_id));
  const yearCount=new Set(indicator.values.map(value=>value.year)).size;
  return <>
    <InlineTarget kind="statistic" id={indicator.id} slug={indicator.slug} title={indicator.name} href={detailPath('yemen-in-numbers/indicator',indicator.slug)}/>
    <JsonLd data={indicatorSchema(indicator)}/>
    <JsonLd data={breadcrumbSchema([{name:'اليمن بالأرقام', path:'/yemen-in-numbers'}, {name:indicator.domain.name, path:detailPath('yemen-in-numbers', indicator.domain.slug)}, {name:indicator.name, path:detailPath('yemen-in-numbers/indicator', indicator.slug)}])}/>
    <section className="stat-indicator-head"><div className="container">
      <Link className="back-link" href={'/yemen-in-numbers/' + indicator.domain.slug}><ArrowRight size={17}/> {indicator.domain.name}</Link>
      <span className="eyebrow">{indicator.domain.section?.name} / مؤشر وطني</span>
      <div className="stat-indicator-title"><div><h1>{indicator.name}</h1><p>{indicator.short_description || indicator.definition}</p></div>{latest ? <div className="stat-latest"><span>أحدث قيمة منشورة</span><strong dir="ltr">{formatNumber(latest.value, {maximumFractionDigits: 3})}</strong><b>{indicator.unit}</b><small>{formatYear(latest.year)}</small></div> : <div className="stat-latest stat-no-latest"><span>لا توجد قيمة منشورة</span></div>}</div>
      <IndicatorActions indicator={indicator}/>
      {indicator.updated_at && <p className="record-update">آخر تحديث للسجل: {formatArabicDate(indicator.updated_at)} · سنة القياس موضحة بجانب القيمة.</p>}
    </div></section>
    <section className="section stat-indicator-body"><div className="container">
      <ContentReadingAction kind="indicator" href={detailPath('yemen-in-numbers/indicator',indicator.slug)} title={indicator.name}/>
      <p className="indicator-reading-note">{indicatorReading(indicator)}</p>
      <div className="stat-detail-layout"><div className="stat-chart-panel"><div className="stat-panel-head"><div><span>السنوات المتاحة</span><h2>{yearCount>1?'القيم عبر السنوات':'قيمة سنة واحدة'}</h2></div><span>{indicator.unit}</span></div>{yearCount>1?<IndicatorChart values={indicator.values} unit={indicator.unit} type={indicator.chart_type}/>:<div className="single-year-note"><CalendarDays size={30}/><p>{latest?`تتوفر قيمة معتمدة لسنة ${formatYear(latest.year)} فقط. تظهر تفاصيلها في الجدول أدناه.`:'لا توجد سلسلة معتمدة للرسم حالياً.'}</p></div>}{sourceIds.size > 1 && !indicator.adopted_source_id && <p className="stat-warning"><AlertTriangle size={17}/> توجد مصادر متعددة دون سلسلة معتمدة؛ أوقف الرسم حتى المراجعة. القيم الأصلية متاحة في CSV.</p>}</div>
      <aside className="stat-facts"><h2>بطاقة المؤشر</h2><dl><div><dt><Ruler size={16}/> الوحدة</dt><dd>{indicator.unit}</dd></div><div><dt><ShieldCheck size={16}/> حالة البيانات</dt><dd>{statusLabels[indicator.data_status]}<small className="data-status-help">{dataStatusHelp[indicator.data_status]}</small></dd></div><div><dt><Info size={16}/> اتجاه التحسن</dt><dd>{directionLabels[indicator.improvement_direction]}</dd></div>{latest && <div><dt><CalendarDays size={16}/> طبيعة أحدث قيمة</dt><dd>{valueStatusLabels[latest.value_status]}</dd></div>}</dl></aside></div>
      {indicator.values.length > 0 && <section className="stat-series-section"><h2>البيانات المنشورة للسلسلة المعتمدة</h2><div className="stat-series-table-scroll" role="region" aria-label="الجدول الزمني للمؤشر" tabIndex={0}><table className="stat-series-table"><caption>{indicator.name} — النطاق الوطني: الجمهورية اليمنية؛ الوحدة: {indicator.unit}</caption><thead><tr><th scope="col">سنة القياس</th><th scope="col">القيمة</th><th scope="col">حالة القيمة</th><th scope="col">المصدر</th></tr></thead><tbody>{indicator.values.map((value, index) => <tr key={value.id || `${value.year}-${index}`}><th scope="row">{formatYear(value.year)}</th><td dir="ltr">{formatNumber(value.value, {maximumFractionDigits:3})}</td><td>{valueStatusLabels[value.value_status] || 'غير محددة'}</td><td>{value.source?.url ? <a href={value.source.url} target="_blank" rel="noopener noreferrer">{value.source.name || 'رابط المصدر'}</a> : value.source?.name || 'لم يُرفق مصدر'}</td></tr>)}</tbody></table></div></section>}
      <div className="indicator-notes"><details><summary>التعريف والمنهجية</summary><p>{indicator.definition || 'لم يُضف تعريف تفصيلي لهذا المؤشر بعد.'}</p><p>{indicator.measurement_method || 'راجع وثيقة المصدر لطريقة القياس وحدود المقارنة.'}</p></details></div>
      <section className="stat-sources"><div className="stat-panel-head"><div><span>التوثيق</span><h2>المصادر والوثائق</h2></div></div>{indicator.sources.length ? <div className="stat-source-list">{indicator.sources.map(item => <article key={item.source_id}><div><strong>{sourceLabel(item.source,indicator.name)}</strong>{item.is_adopted && <span>السلسلة المعتمدة</span>}<details><summary>تفاصيل المصدر</summary><p>{item.methodology || item.source?.description || 'مصدر مستخدم في توثيق هذا المؤشر.'}</p></details></div>{item.source?.url && <a href={item.source.url} target="_blank" rel="noopener noreferrer">زيارة المصدر <ExternalLink size={15}/></a>}</article>)}</div> : latest?.source ? <div className="stat-source-list"><article><div><strong>{sourceLabel(latest.source,indicator.name)}</strong><p>{latest.methodology_note || 'مصدر أحدث قيمة منشورة.'}</p></div>{latest.source.url && <a href={latest.source.url} target="_blank" rel="noopener noreferrer">زيارة المصدر <ExternalLink size={15}/></a>}</article></div> : <p className="small-muted">لم تُضف تفاصيل المصدر بعد.</p>}
      {latest?.document_url && <a className="stat-document-link" href={latest.document_url} target="_blank" rel="noopener noreferrer">وثيقة أحدث قيمة <ExternalLink size={16}/></a>}{latest?.publication_date && <small>تاريخ النشر: {formatArabicDate(latest.publication_date)}</small>}</section>
    </div></section>
  </>;
}
