import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import {notFound} from 'next/navigation';
import {AlertTriangle, CalendarDays, ExternalLink} from 'lucide-react';
import ContextBackLink from '@/components/ContextBackLink';
import ContentReadingAction from '@/components/reading/ContentReadingAction';
import IndicatorActions from '@/components/IndicatorActions';
import IndicatorEditorial from '@/components/IndicatorEditorial';
import InlineTarget from '@/components/inline/InlineTarget';
import CorrectionLink from '@/components/CorrectionLink';
import {getStatIndicator} from '@/lib/data';
import {formatArabicDate, formatNumber, formatYear} from '@/lib/format';
import {directionLabels, statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';
import {detailPath, hasIndexableIndicator, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, indicatorSchema, JsonLd} from '@/lib/seo-schema';
import {dataStatusHelp,indicatorReading,sourceLabel} from '@/lib/indicatorPresentation';
import {indicatorMeasurementEvidence} from '@/lib/contentEvidence';
import styles from './indicator.module.css';
// The chart library loads only on this page, after the readable value, table and sources.
const IndicatorChart=nextDynamic(()=>import('@/components/IndicatorChart'),{loading:()=><p role="status" className={styles.chartLoading}>جارٍ تجهيز الرسم…</p>});

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
  const measurement=latest?indicatorMeasurementEvidence(latest.year):null;
  const latestDisplayValue = latest ? formatNumber(latest.value, {maximumFractionDigits: 3}) : null;
  const sourceIds = new Set(indicator.allValues.map(value => value.source_id));
  const yearCount=new Set(indicator.values.map(value=>value.year)).size;
  const path = detailPath('yemen-in-numbers/indicator',indicator.slug);
  const sourceList = indicator.sources.length ? indicator.sources.map(item => ({key: item.source_id, name: sourceLabel(item.source,indicator.name), adopted: item.is_adopted, note: item.methodology || item.source?.description || 'مصدر مستخدم في توثيق هذا المؤشر.', url: item.source?.url}))
    : latest?.source ? [{key: 'latest', name: sourceLabel(latest.source,indicator.name), note: latest.methodology_note || 'مصدر أحدث قيمة منشورة.', url: latest.source.url}] : [];

  return <div className="ui-page" data-tone="explore">
    <InlineTarget kind="statistic" id={indicator.id} slug={indicator.slug} title={indicator.name} href={path}/>
    <JsonLd data={indicatorSchema(indicator)}/>
    <JsonLd data={breadcrumbSchema([{name:'اليمن بالأرقام', path:'/yemen-in-numbers'}, {name:indicator.domain.name, path:detailPath('yemen-in-numbers', indicator.domain.slug)}, {name:indicator.name, path}])}/>
    <div className="ui-wrap">
      <ContextBackLink fallback={'/yemen-in-numbers/'+indicator.domain.slug} label={indicator.domain.name}/>
      <header className={styles.head}>
        <div className={styles.titleBlock}>
          <p className={styles.trail}><Link href="/yemen-in-numbers">اليمن بالأرقام</Link><span aria-hidden="true">/</span><Link href={'/yemen-in-numbers/'+indicator.domain.slug}>{indicator.domain.name}</Link><span aria-hidden="true">/</span><span>مؤشر وطني{indicator.domain.section?.name ? ' · ' + indicator.domain.section.name : ''}</span></p>
          <h1>{indicator.name}</h1>
          <p className={styles.summary}>{indicator.short_description || indicator.definition}</p>
          <div className={styles.actions}><ContentReadingAction kind="indicator" href={path} title={indicator.name}/><IndicatorActions indicator={indicator}/></div>
        </div>
        <section className={styles.figure} aria-label="أحدث قيمة منشورة">
          {latest ? <>
            <span className={styles.figureLabel}>أحدث قيمة منشورة</span>
            <strong className="ui-ltr">{latestDisplayValue}</strong>
            <span className={styles.unit}>{indicator.unit}</span>
            <dl className={styles.figureMeta}>
              <div><dt>سنة القياس</dt><dd className="ui-ltr">{formatYear(latest.year)}</dd></div>
              <div><dt>طبيعة القيمة</dt><dd>{valueStatusLabels[latest.value_status] || 'غير محددة'}</dd></div>
            </dl>
          </> : <span className={styles.figureLabel}>لا توجد قيمة منشورة</span>}
        </section>
      </header>
      {measurement&&measurement.kind!=='recent'&&<p className={styles.warning} role="note"><AlertTriangle size={18} aria-hidden="true"/>{measurement.message}</p>}

      <div className={styles.body}>
        <div className={styles.main}>
          <p className={styles.reading}>{indicatorReading(indicator)}</p>
          <section className={styles.panel} aria-labelledby="chart-title">
            <div className={styles.panelHead}><h2 id="chart-title">{yearCount>1?'القيم عبر السنوات':'قيمة سنة واحدة'}</h2><span>{indicator.unit}</span></div>
            {yearCount>1?<IndicatorChart values={indicator.values} unit={indicator.unit} type={indicator.chart_type}/>:<p className={styles.single}><CalendarDays size={22} aria-hidden="true"/>{latest?`تتوفر قيمة معتمدة لسنة ${formatYear(latest.year)} فقط. تظهر تفاصيلها في الجدول أدناه.`:'لا توجد سلسلة معتمدة للرسم حالياً.'}</p>}
            {sourceIds.size > 1 && !indicator.adopted_source_id && <p className={styles.warning}><AlertTriangle size={17} aria-hidden="true"/> توجد مصادر متعددة دون سلسلة معتمدة؛ أوقف الرسم حتى المراجعة. القيم الأصلية متاحة في CSV.</p>}
          </section>

          {indicator.values.length > 0 && <section className={styles.panel} aria-labelledby="series-title">
            <div className={styles.panelHead}><h2 id="series-title">البيانات المنشورة للسلسلة المعتمدة</h2></div>
            <p className="knowledge-table-hint">مرّر الجدول أفقيًا للاطلاع على بقية الأعمدة.</p>
            <div className={styles.tableScroll} role="region" aria-label="الجدول الزمني للمؤشر" tabIndex={0}><table className={styles.table}><caption>{indicator.name} — النطاق الوطني: الجمهورية اليمنية؛ الوحدة: {indicator.unit}</caption><thead><tr><th scope="col">سنة القياس</th><th scope="col">القيمة</th><th scope="col">حالة القيمة</th><th scope="col">المصدر</th></tr></thead><tbody>{indicator.values.map((value, index) => <tr key={value.id || `${value.year}-${index}`}><th scope="row" className="ui-ltr">{formatYear(value.year)}</th><td dir="ltr" className="ui-ltr">{formatNumber(value.value, {maximumFractionDigits:3})}</td><td>{valueStatusLabels[value.value_status] || 'غير محددة'}</td><td>{value.source?.url ? <a href={value.source.url} target="_blank" rel="noopener noreferrer">{value.source.name || 'رابط المصدر'}</a> : value.source?.name || 'لم يُرفق مصدر'}</td></tr>)}</tbody></table></div>
          </section>}

          {indicator.editorial?.is_published&&<IndicatorEditorial data={indicator.editorial} indicatorName={indicator.name}/>}

          <details className={styles.notes}><summary>التعريف والمنهجية</summary><p>{indicator.definition || 'لم يُضف تعريف تفصيلي لهذا المؤشر بعد.'}</p><p>{indicator.measurement_method || 'راجع وثيقة المصدر لطريقة القياس وحدود المقارنة.'}</p></details>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="facts-title">
            <h2 id="facts-title">بطاقة المؤشر</h2>
            <dl className={styles.facts}>
              <div><dt>الوحدة</dt><dd>{indicator.unit}</dd></div>
              <div><dt>حالة البيانات</dt><dd>{statusLabels[indicator.data_status] || 'غير محددة'}<small>{dataStatusHelp[indicator.data_status]}</small></dd></div>
              <div><dt>اتجاه التحسن</dt><dd>{directionLabels[indicator.improvement_direction] || 'غير محدد'}</dd></div>
              <div><dt>السنوات المنشورة</dt><dd><span className="ui-ltr">{formatNumber(yearCount)}</span></dd></div>
            </dl>
          </section>
          <section className={styles.card} aria-labelledby="sources-title">
            <h2 id="sources-title">المصادر والوثائق</h2>
            {sourceList.length ? <ul className={styles.sources}>{sourceList.map(item => <li key={item.key}>
              <strong>{item.name}</strong>{item.adopted && <span className={styles.adopted}>السلسلة المعتمدة</span>}
              <details><summary>تفاصيل المصدر</summary><p>{item.note}</p></details>
              {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer">زيارة المصدر <ExternalLink size={14} aria-hidden="true"/></a>}
            </li>)}</ul> : <p className={styles.muted}>لم تُضف تفاصيل المصدر بعد.</p>}
            {latest?.document_url && <a className={styles.doc} href={latest.document_url} target="_blank" rel="noopener noreferrer">وثيقة أحدث قيمة <ExternalLink size={14} aria-hidden="true"/></a>}
            {latest?.publication_date && <p className={styles.muted}>تاريخ النشر: {formatArabicDate(latest.publication_date)}</p>}
          </section>
          {indicator.updated_at && <p className={styles.muted}>آخر تحديث للسجل: {formatArabicDate(indicator.updated_at)} · سنة القياس موضحة بجانب القيمة.</p>}
          <CorrectionLink title={indicator.name} path={path} id={indicator.id} className={styles.correction}/>
        </aside>
      </div>
    </div>
  </div>;
}
