import Link from 'next/link';
import {ArrowUpLeft, CalendarDays, Database} from 'lucide-react';
import {formatNumber, formatYear} from '@/lib/format';
import {statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';
import {sourceLabel,dataStatusHelp} from '@/lib/indicatorPresentation';
import SaveForLater from './reading/SaveForLater';

export default function IndicatorCard({indicator}) {
  const latest = indicator.latestValue;
  return <article className="saveable-card"><Link className="stat-indicator-card" href={'/yemen-in-numbers/indicator/' + indicator.slug}>
    <div className="stat-card-top">
      <span>{indicator.domain?.name || 'مؤشر وطني'}</span>
      <span title={dataStatusHelp[indicator.data_status]} className={'stat-status stat-status-' + indicator.data_status}>{statusLabels[indicator.data_status] || indicator.data_status}</span>
    </div>
    <h3>{indicator.name}</h3>
    <p>{indicator.short_description || indicator.definition || 'بيانات وطنية موثقة على مستوى الجمهورية اليمنية.'}</p>
    {latest ? <div className="stat-card-value">
      <strong dir="ltr">{formatNumber(latest.value, {maximumFractionDigits: 2})}</strong>
      <span>{indicator.unit}</span>
      <div className="stat-value-context"><span><CalendarDays size={14} aria-hidden="true"/> سنة القياس: {formatYear(latest.year)}</span><span className={'stat-value-kind stat-value-kind-'+latest.value_status}>{valueStatusLabels[latest.value_status] || 'نوع القيمة غير محدد'}</span></div>
    </div> : <div className="stat-card-empty"><Database size={18}/><span>{indicator.hasSourceConflict ? 'يجب تحديد السلسلة المعتمدة' : 'لم تُنشر قيم لهذا المؤشر بعد'}</span></div>}
    <div className="stat-card-meta">
      <span>المصدر: {sourceLabel(latest?.source||indicator.adopted_source,indicator.name)}</span>
    </div>
    <span className="stat-card-open">عرض تفاصيل المؤشر <ArrowUpLeft size={16}/></span>
  </Link><div className="card-save-action"><SaveForLater item={{kind:'indicator',href:'/yemen-in-numbers/indicator/'+encodeURIComponent(indicator.slug),title:indicator.name}}/></div></article>;
}
