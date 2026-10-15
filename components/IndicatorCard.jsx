import Link from 'next/link';
import {ArrowUpLeft, CalendarDays, Database} from 'lucide-react';
import {formatNumber} from '@/lib/format';
import {statusLabels} from '@/lib/yemenNumbers';

export default function IndicatorCard({indicator}) {
  const latest = indicator.latestValue;
  return <article className="stat-indicator-card">
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
      {latest && <span><CalendarDays size={15}/> {formatNumber(latest.year)}</span>}
      <span>{latest?.source?.name || indicator.adopted_source?.name || 'المصدر قيد التوثيق'}</span>
    </div>
    <Link href={'/yemen-in-numbers/indicator/' + indicator.slug}>عرض تفاصيل المؤشر <ArrowUpLeft size={16}/></Link>
  </article>;
}
