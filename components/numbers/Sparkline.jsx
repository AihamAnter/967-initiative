import {formatYear} from '@/lib/format';

// Inline SVG trend line (no chart library). Time runs left → right like the
// full chart; gaps between years stay visible as straight segments. A single
// observation renders nothing: one point is not a trend.
export default function Sparkline({points = [], label, className = 'ed-spark'}) {
  const series = points.filter(point => Number.isFinite(point?.value) && Number.isFinite(point?.year));
  if (series.length < 2) return null;
  const years = series.map(point => point.year), values = series.map(point => point.value);
  const [x0, x1] = [Math.min(...years), Math.max(...years)];
  const [lo, hi] = [Math.min(...values), Math.max(...values)];
  const x = year => x1 === x0 ? 50 : ((year - x0) / (x1 - x0)) * 100;
  const y = value => hi === lo ? 20 : 36 - ((value - lo) / (hi - lo)) * 32;
  const line = series.map((point, index) => `${index ? 'L' : 'M'}${x(point.year).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
  const last = series.at(-1);
  return <svg className={className} viewBox="0 0 100 40" preserveAspectRatio="none" dir="ltr" role="img" aria-label={label || `اتجاه القيم من ${formatYear(x0)} إلى ${formatYear(x1)}`}>
    <path className="area" d={`${line} L${x(last.year).toFixed(2)},40 L${x(series[0].year).toFixed(2)},40 Z`}/>
    <path className="line" d={line}/>
  </svg>;
}
