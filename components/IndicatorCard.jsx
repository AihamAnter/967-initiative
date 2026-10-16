import Link from 'next/link';
import {ArrowUpLeft, CalendarDays, Database} from 'lucide-react';
import {formatNumber, formatYear} from '@/lib/format';
import {statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';

export default function IndicatorCard({indicator}) {
  const latest = indicator.latestValue;
  return <Link className="stat-indicator-card" href={'/yemen-in-numbers/indicator/' + indicator.slug} aria-label={'عرض تفاصيل مؤشر ' + indicator.name}>
    <div className="stat-card-top">
      <span>{indicator.domain?.name || 'مؤشر وطني'}</span>
      <span className={'stat-status stat-status-' + indicator.data_status}>{statusLabels[indicator.data_status] || indicator.data_status}</span>
    </div>
    <h3>{indicator.name}</h3>
    <p>{indicator.short_description || indicator.definition || 'بيانات وطنية موثقة على مستوى الجمهورية اليمنية.'}</p>
    {latest ? <div className="stat-card-value">
      <strong dir="ltr">{formatNumber(latest.value, {maximumFractionDigits: 2})}</strong>
      <span>{indicator.unit}</span>
    </div> : <div className="stat-card-empty"><Database size={18}/><span>{indicator.hasSourceConflict ? 'يجب تحديد السلسلة المعتمدة' : 'لم تُنشر قيم لهذا المؤشر بعد'}</span></div>}
    <div className="stat-card-meta">
      {latest && <span><CalendarDays size={15}/> {formatYear(latest.year)} · {valueStatusLabels[latest.value_status] || 'نوع القيمة غير محدد'}</span>}
      <span>{latest?.source?.name || indicator.adopted_source?.name || 'المصدر قيد التوثيق'}</span>
    </div>
    <span className="stat-card-open">عرض تفاصيل المؤشر <ArrowUpLeft size={16}/></span>
  </Link>;
}
