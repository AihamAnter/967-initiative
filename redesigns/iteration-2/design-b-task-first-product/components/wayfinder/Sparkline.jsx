import {formatYear} from '@/lib/format';

// A tiny, dependency-free trend line for home and list cards (inline SVG, no
// chart library). Missing years stay gaps; the line is decorative and the
// years it spans are given as text.
export default function Sparkline({values = [], className, width = 132, height = 40}) {
  const points = values.map(item => ({year: Number(item.year), value: Number(item.value)})).filter(item => Number.isFinite(item.year) && Number.isFinite(item.value)).sort((a, b) => a.year - b.year);
  if (points.length < 2) return null;
  const minYear = points[0].year, maxYear = points.at(-1).year;
  const min = Math.min(...points.map(p => p.value)), max = Math.max(...points.map(p => p.value));
  const x = year => 2 + (width - 4) * ((year - minYear) / Math.max(1, maxYear - minYear));
  const y = value => height - 4 - (height - 8) * (max === min ? .5 : (value - min) / (max - min));
  // Break the path at missing years so gaps stay visible.
  let d = '';
  points.forEach((point, index) => {
    const gap = index > 0 && point.year - points[index - 1].year > 1;
    d += (index === 0 || gap ? 'M' : 'L') + x(point.year).toFixed(1) + ' ' + y(point.value).toFixed(1) + ' ';
  });
  const last = points.at(-1);
  return <span className={className}>
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" focusable="false" style={{overflow: 'visible', direction: 'ltr'}}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      <circle cx={x(last.year)} cy={y(last.value)} r="3.5" fill="currentColor"/>
    </svg>
    <span className="sr-only">سلسلة منشورة من {formatYear(minYear)} إلى {formatYear(maxYear)}</span>
  </span>;
}
