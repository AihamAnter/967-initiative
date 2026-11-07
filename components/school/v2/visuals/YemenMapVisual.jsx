'use client';
// خريطة اليمن للدروس: محافظات مبسطة (scripts/build-school-v2-map.mjs) تُحمَّل مرة واحدة وتُشارك بين البطاقات.
import {useEffect, useState} from 'react';
import {compactNumber, choroplethSteps} from '@/lib/schoolCardVisuals';
import styles from './Visuals.module.css';

const URL = '/data/school-v2/yemen-governorates.json';
let loaded = null, pending = null;
const load = () => loaded ? Promise.resolve(loaded) : (pending ||= fetch(URL).then(r => { if (!r.ok) throw Error('map'); return r.json(); })
  .then(d => (loaded = d)).catch(e => { pending = null; throw e; }));

export default function YemenMapVisual({visual}) {
  const [data, setData] = useState(loaded);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let alive = true; load().then(d => alive && setData(d)).catch(() => alive && setFailed(true)); return () => { alive = false; }; }, []);
  const highlight = new Set(visual.highlight || []);
  const values = visual.values || null;
  const scale = choroplethSteps(values);
  if (!data) return <div className={styles.canvas}>{!failed && <span className={styles.skeleton}/>}</div>;
  return <>
    <div className={styles.canvas}>
      <svg viewBox={data.viewBox} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
        {data.governorates.map(g => <path key={g.id} className={styles.gov} d={g.d}
          data-hi={!values && highlight.has(g.id) || undefined} data-step={values ? scale.step(values[g.id]) : undefined}/>)}
        {visual.labels !== false && data.governorates.filter(g => highlight.has(g.id)).map(g =>
          <g key={g.id}><circle className={styles.mapDot} cx={g.cx} cy={g.cy} r="5"/>
            <text className={styles.mapLabel} x={g.cx} y={g.cy + 24} textAnchor="middle">{visual.names?.[g.id] || g.nameAr}</text></g>)}
      </svg>
    </div>
    {values && <div className={styles.scale} aria-hidden="true">
      <span>{compactNumber(scale.min)}</span>{[1, 2, 3, 4].map(s => <i key={s} data-step={s}/>)}<span>{compactNumber(scale.max)}</span>
      {visual.unit && <span>({visual.unit})</span>}
    </div>}
  </>;
}
