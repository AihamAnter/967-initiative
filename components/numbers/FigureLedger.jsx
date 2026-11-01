import NextLink from 'next/link';
import {formatNumber, formatYear} from '@/lib/format';
import {sourceLabel} from '@/lib/indicatorPresentation';
import {valueStatusLabels} from '@/lib/yemenNumbers';
import Resilient from '@/components/front/Resilient';
import Sparkline from './Sparkline';

// A number is never shown without its year, source and kind of value.
export function figureOf(indicator) {
  const value = indicator.latestValue;
  return {
    href: '/yemen-in-numbers/indicator/' + encodeURIComponent(indicator.slug),
    number: formatNumber(value.value, {maximumFractionDigits: 2}),
    year: formatYear(value.year),
    source: sourceLabel(value.source || indicator.adopted_source, indicator.name),
    kind: valueStatusLabels[value.value_status] || 'نوع القيمة غير محدد',
    estimated: value.value_status !== 'official',
  };
}

export function LedgerItem({indicator, headingLevel = 3}) {
  const f = figureOf(indicator);
  const Heading = 'h' + headingLevel;
  return <article className="ed-ledger-item">
    <p className="ed-figure" data-len={f.number.length > 10 ? 'long' : undefined}><bdi dir="ltr">{f.number}</bdi> <span>{indicator.unit}</span></p>
    <Heading className="ed-ledger-title"><NextLink href={f.href}>{indicator.name}</NextLink></Heading>
    <Sparkline points={indicator.spark} label={'اتجاه ' + indicator.name}/>
    <p className="ed-meta">{indicator.domain?.name && <span className="ed-chip-data"><span>{indicator.domain.name}</span></span>}<span className="ed-chip-data"><span>سنة القياس <bdi>{f.year}</bdi></span></span><span className="ed-status" data-tone={f.estimated ? 'caution' : 'neutral'}>{f.kind}</span></p>
    <p className="ed-meta"><span>المصدر: {f.source}</span></p>
  </article>;
}

export default function FigureLedger({indicators, headingLevel}) {
  return <ol className="ed-ledger">{indicators.map(indicator => <li key={indicator.id}><Resilient name="figure-ledger" quiet><LedgerItem indicator={indicator} headingLevel={headingLevel}/></Resilient></li>)}</ol>;
}
