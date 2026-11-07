// منحنيات وأعمدة الدروس: خطي، أعمدة، العرض والطلب (يتحرك مع مؤشر التفاعل)، ومؤشرات «اليمن بالأرقام».
import {compactNumber} from '@/lib/schoolCardVisuals';
import styles from './Visuals.module.css';

const LINE = [styles.lineA, styles.lineB, styles.lineC];

function niceTicks(min, max, count = 3) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const start = Math.floor(min / step) * step, ticks = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(10)));
  if (ticks.at(-1) < max) ticks.push(ticks.at(-1) + step);
  return ticks;
}

export function LineChart({series, highlight}) {
  const W = 320, H = 200, L = 64, R = 14, T = 22, B = 26;
  const all = series.flatMap(s => s.points);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const ticks = niceTicks(Math.min(0, ...ys) < 0 ? Math.min(...ys) : Math.min(...ys) * 0.9, Math.max(...ys));
  const yMin = ticks[0], yMax = ticks.at(-1);
  const x = v => L + (xMax === xMin ? 0.5 : (v - xMin) / (xMax - xMin)) * (W - L - R);
  const y = v => T + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const xTicks = xMax - xMin > 4 ? [xMin, Math.round((xMin + xMax) / 2), xMax] : [...new Set(xs)];
  return <svg viewBox={`0 0 ${W} ${H}`} dir="ltr" aria-hidden="true" focusable="false">
      {ticks.map(t => <g key={t}><line className={styles.grid} x1={L} x2={W - R} y1={y(t)} y2={y(t)}/><text className={styles.chartMuted} x={L - 6} y={y(t) + 4} direction="rtl" textAnchor="start">{compactNumber(t)}</text></g>)}
      {xTicks.map(t => <text key={t} className={styles.chartMuted} x={x(t)} y={H - 8} textAnchor="middle">{t}</text>)}
      {series.length === 1 && <path className={styles.area} d={`M${x(series[0].points[0][0])} ${y(yMin)}` + series[0].points.map(([a, b]) => `L${x(a)} ${y(b)}`).join('') + `L${x(series[0].points.at(-1)[0])} ${y(yMin)}Z`}/>}
      {series.map((s, i) => <path key={i} className={LINE[i % 3]} d={s.points.map(([a, b], j) => (j ? 'L' : 'M') + x(a) + ' ' + y(b)).join('')}/>)}
      {series.map((s, i) => { const [a, b] = s.points.at(-1); return <g key={i}><circle className={styles.dot} cx={x(a)} cy={y(b)} r={3.2}/><text className={styles.chartText} x={Math.min(x(a), W - R)} y={y(b) - 9} direction="rtl" textAnchor="start">{compactNumber(b)}</text></g>; })}
      {highlight !== undefined && series[0].points.filter(p => p[0] === highlight).map(([a, b]) => <g key={a}><line className={styles.axis} strokeDasharray="2 2" x1={x(a)} x2={x(a)} y1={T} y2={H - B}/><circle className={styles.eq} cx={x(a)} cy={y(b)} r={4}/><text className={styles.chartText} x={x(a)} y={T - 6} textAnchor="middle" direction="rtl">{a}: {compactNumber(b)}</text></g>)}
    </svg>;
}

export const Legend = ({series}) => series.length > 1 ? <div className={styles.legend}>{series.map((s, i) => <span key={i}><i data-s={i}/>{s.label}</span>)}</div> : null;

export function BarChart({bars, unit, highlight}) {
  const max = Math.max(...bars.map(b => Math.abs(b.value))) || 1;
  return <div className={styles.bars}>
    {bars.map((b, i) => <div key={i} className={styles.barRow} data-hi={highlight === i || undefined}>
      <span>{b.label}</span>
      <span className={styles.barTrack}><span className={styles.barFill} style={{width: Math.max(2, Math.abs(b.value) / max * 100) + '%', display: 'block'}}/></span>
      <span className={styles.barValue}>{compactNumber(b.value)}{unit ? ' ' + unit : ''}</span>
    </div>)}
  </div>;
}

// العرض والطلب: التوازن في منتصف الإطار تمامًا (50%، 47%) ليسهل وضع نقاط الضغط فوقه.
export function SupplyDemand({demandShift = 0, supplyShift = 0, labels = true}) {
  const W = 160, H = 100, cx = 80, cy = 49, dx = 50, dy = 31;
  const line = (sign, shift) => ({x1: cx - dx + shift, y1: cy - sign * dy, x2: cx + dx + shift, y2: cy + sign * dy});
  const d = line(1, demandShift), s = line(-1, supplyShift);
  // تقاطع المستقيمين بعد الإزاحة: y = cy + (x - cx - shift) * (dy/dx) للطلب، وعكس الإشارة للعرض.
  const k = dy / dx, ex = cx + (demandShift + supplyShift) / 2, ey = cy + (ex - cx - demandShift) * k;
  return <svg viewBox={`0 0 ${W} ${H}`} dir="ltr" aria-hidden="true" focusable="false">
    <line className={styles.axis} x1={19} y1={6} x2={19} y2={90}/><line className={styles.axis} x1={19} y1={90} x2={154} y2={90}/>
    <line className={styles.grid} strokeDasharray="2 2" x1={19} x2={ex} y1={ey} y2={ey}/><line className={styles.grid} strokeDasharray="2 2" x1={ex} x2={ex} y1={ey} y2={90}/>
    <g className={styles.shifted}><line className={styles.lineA} {...d}/></g>
    <g className={styles.shifted}><line className={styles.lineB} {...s}/></g>
    <circle className={styles.eq} cx={ex} cy={ey} r={3.4}/>
    {labels && <>
      <text className={styles.svgText} x={d.x1} y={d.y1 - 4} textAnchor="middle" fontWeight="700">الطلب</text>
      <text className={styles.svgText} x={s.x2} y={s.y2 - 4} textAnchor="middle" fontWeight="700">العرض</text>
      <text className={styles.svgMuted} x={17} y={7} direction="rtl" textAnchor="start">السعر</text>
      <text className={styles.svgMuted} x={154} y={98} direction="rtl" textAnchor="start">الكمية</text>
    </>}
  </svg>;
}
