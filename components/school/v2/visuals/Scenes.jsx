// مشاهد مبسطة للدروس بطابع يمني (بيوت صنعاء بقمرياتها، مدرجات زراعية، شبام): أشكال هندسية بألوان الموقع.
import styles from './Visuals.module.css';

const Sky = ({warm}) => <rect className={warm ? styles.sky2 : styles.sky} x="0" y="0" width="160" height="100"/>;
const Ground = ({y = 80}) => <rect className={styles.ground} x="0" y={y} width="160" height={100 - y}/>;
const Sun = ({x = 132, y = 18, r = 7}) => <circle className={styles.sun} cx={x} cy={y} r={r}/>;
const Person = ({x, y = 80, s = 1, tone = 'accent'}) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <circle className={styles.wall2} cx="0" cy="-15" r="2.6"/>
  <path className={styles[tone]} d="M-3.6 0 L-3 -9.5 Q0 -12.4 3 -9.5 L3.6 0 Z"/>
</g>;

// بيت برجي صنعاني: جدار، أشرطة جص بيضاء بين الطوابق، نوافذ تعلوها قمريات.
function TowerHouse({x, w, floors, tone = 'wall', ground = 80}) {
  const fh = 11, h = floors * fh + 4, top = ground - h;
  const cols = w > 18 ? 3 : 2;
  return <g>
    <rect className={styles[tone]} x={x} y={top} width={w} height={h}/>
    <rect className={styles.trim} x={x - 0.6} y={top - 1.4} width={w + 1.2} height="1.6"/>
    {Array.from({length: floors}, (_, f) => {
      const fy = top + 4 + f * fh;
      return <g key={f}>
        {f > 0 && <rect className={styles.trim} x={x} y={fy - 1.2} width={w} height="0.9"/>}
        {f < floors - 1 && Array.from({length: cols}, (_, c) => {
          const wx = x + (c + 1) * w / (cols + 1) - 1.6;
          return <g key={c}>
            <path className={styles.trim} d={`M${wx - 0.6} ${fy + 3} a2.2 2.2 0 0 1 4.4 0 Z`}/>
            <rect className={styles.ink} opacity=".72" x={wx} y={fy + 3.4} width="3.2" height="4.2"/>
            <rect className={styles.trimLine} x={wx - 0.4} y={fy + 3} width="4" height="5" fill="none"/>
          </g>;
        })}
      </g>;
    })}
    <path className={styles.wood} d={`M${x + w / 2 - 2.6} ${ground} v-6 a2.6 2.6 0 0 1 5.2 0 v6 Z`}/>
  </g>;
}

const Mountains = ({y = 80}) => <g>
  <path className={styles.ground2} d={`M0 ${y} L0 50 L22 34 L40 46 L62 26 L86 44 L104 30 L128 42 L146 30 L160 38 L160 ${y} Z`} opacity=".7"/>
</g>;

const draw = {
  city: () => <>
    <Sky/><Sun/><Mountains/><Ground/>
    <TowerHouse x={10} w={20} floors={5}/><TowerHouse x={34} w={16} floors={4} tone="wall2"/>
    <TowerHouse x={56} w={22} floors={6}/><TowerHouse x={84} w={18} floors={4} tone="wall2"/>
    <TowerHouse x={108} w={20} floors={5}/><TowerHouse x={132} w={16} floors={3} tone="wall2"/>
  </>,
  shop: () => <>
    <Sky warm/><Ground y={82}/>
    <TowerHouse x={34} w={92} floors={2} ground={82}/>
    <rect className={styles.ink} opacity=".8" x="52" y="62" width="56" height="20" rx="1"/>
    <path className={styles.red} d="M48 60 h64 l-4 6 h-56 Z"/>
    <path className={styles.trim} d="M56 60 h8 l-1 6 h-8 Z M72 60 h8 l-.5 6 h-8 Z M88 60 h8 v6 h-8 Z M104 60 h4 l-1 6 h-4 Z" opacity=".85"/>
    <ellipse className={styles.ground2} cx="60" cy="80" rx="6" ry="4"/><ellipse className={styles.trim} cx="60" cy="77" rx="5" ry="1.4"/>
    <ellipse className={styles.ground2} cx="72" cy="80" rx="6" ry="4"/><ellipse className={styles.trim} cx="72" cy="77" rx="5" ry="1.4"/>
    <rect className={styles.wood} x="88" y="73" width="14" height="9"/><circle className={styles.red} cx="91" cy="72" r="2"/><circle className={styles.red} cx="95" cy="71.5" r="2"/><circle className={styles.plant} cx="99" cy="72" r="2"/>
    <Person x={120} y={88} s={1.1}/>
  </>,
  market: () => <>
    <Sky warm/><Sun x={24}/><Ground y={76}/>
    {[[10, 'red'], [60, 'blue'], [110, 'accent']].map(([x, tone]) => <g key={x}>
      <rect className={styles.wood} x={x + 2} y="50" width="2" height="30"/><rect className={styles.wood} x={x + 36} y="50" width="2" height="30"/>
      <path className={styles[tone]} d={`M${x} 52 L${x + 6} 40 H${x + 34} L${x + 40} 52 Z`}/>
      <path className={styles.trim} d={`M${x + 8} 40 h6 l-2 12 h-6 Z M${x + 22} 40 h6 l1 12 h-6 Z`} opacity=".8"/>
      <rect className={styles.wall2} x={x} y="66" width="40" height="10"/>
      {[6, 12, 18, 24, 30].map(dx => <circle key={dx} className={tone === 'accent' ? styles.plant2 : tone === 'blue' ? styles.sun : styles.red} cx={x + dx + 2} cy="64" r="2.6"/>)}
    </g>)}
    <Person x={30} y={92} s={1.1}/><Person x={78} y={93} s={1.15} tone="red"/><Person x={136} y={92} s={1.05} tone="blue"/>
  </>,
  school: () => <>
    <Sky/><Sun x={22}/><Ground/>
    <rect className={styles.wall} x="28" y="40" width="104" height="40"/>
    <path className={styles.red} d="M22 42 L80 22 L138 42 Z"/>
    <circle className={styles.trim} cx="80" cy="33" r="5"/><path className={styles.stroke} d="M80 30 v3 l2 1.5"/>
    {[38, 54, 98, 114].map(x => <g key={x}><path className={styles.trim} d={`M${x - .6} 52 a4 4 0 0 1 8.2 0 Z`}/><rect className={styles.ink} opacity=".7" x={x} y="52" width="7" height="9"/></g>)}
    <rect className={styles.wood} x="72" y="58" width="16" height="22"/>
    <Person x={56} y={92} s={1}/><Person x={64} y={92} s={.85} tone="blue"/><Person x={104} y={92} s={.9} tone="red"/>
  </>,
  parliament: () => <>
    <Sky/><Ground/>
    <rect className={styles.trim} x="30" y="46" width="100" height="30"/>
    <path className={styles.wall} d="M24 46 L80 30 L136 46 Z"/>
    <path className={styles.accent} d="M64 30 a16 14 0 0 1 32 0 Z"/><rect className={styles.wall2} x="78" y="10" width="4" height="8"/>
    {[38, 52, 66, 90, 104, 118].map(x => <rect key={x} className={styles.wall2} x={x} y="48" width="5" height="28"/>)}
    <rect className={styles.wall} x="24" y="76" width="112" height="2"/><rect className={styles.wall2} x="18" y="78" width="124" height="2"/>
  </>,
  farm: () => <>
    <Sky/><Sun/>
    <path className={styles.ground2} d="M0 100 L0 40 L40 22 L90 34 L130 18 L160 30 L160 100 Z"/>
    {[0, 1, 2, 3, 4].map(i => <path key={i} className={i % 2 ? styles.plant : styles.plant2} d={`M0 ${48 + i * 11} Q80 ${40 + i * 11} 160 ${46 + i * 11} L160 ${52 + i * 11} Q80 ${46 + i * 11} 0 ${54 + i * 11} Z`}/>)}
    {[20, 46, 72, 98, 124].map((x, i) => <circle key={x} className={styles.red} cx={x} cy={58 + (i % 2) * 11} r="1.6"/>)}
    <Person x={112} y={90} s={1.1}/>
  </>,
  port: () => <>
    <Sky/><Sun x={26}/>
    <rect className={styles.sea} x="0" y="62" width="160" height="38"/>
    <rect className={styles.wall2} x="0" y="58" width="56" height="8"/>
    <path className={styles.ink} d="M14 58 V22 h2 V58 Z M16 24 h22 v2 h-22 Z M36 26 v10" opacity=".8"/><path className={styles.stroke} d="M36 26 v10"/>
    <path className={styles.red} d="M70 70 h76 l-8 12 h-62 Z"/>
    {[[78, 'blue'], [92, 'accent'], [106, 'sun'], [120, 'blue'], [92, 'red'], [106, 'accent']].map(([x, t], i) => <rect key={i} className={styles[t]} x={x} y={i > 3 ? 54 : 61} width="13" height="8" rx=".5"/>)}
    <rect className={styles.trim} x="132" y="56" width="10" height="14"/>
  </>,
  'weather-station': () => <>
    <Sky/><Ground/>
    <g className={styles.trim}><circle cx="40" cy="22" r="8"/><circle cx="50" cy="20" r="10"/><circle cx="60" cy="23" r="7"/><rect x="34" y="22" width="30" height="8" rx="4"/></g>
    <rect className={styles.ink} x="100" y="24" width="2" height="56" opacity=".8"/>
    <path className={styles.stroke} d="M92 26 h18 M92 26 v3 M110 26 v3"/><circle className={styles.accent} cx="92" cy="30" r="2"/><circle className={styles.accent} cx="110" cy="30" r="2"/>
    <path className={styles.red} d="M102 36 l12 3 l-12 3 Z"/>
    <rect className={styles.trim} x="118" y="58" width="22" height="22"/><path className={styles.stroke} d="M118 64 h22 M118 70 h22"/>
    <rect className={styles.paper} x="28" y="54" width="6" height="26" rx="3"/><circle className={styles.red} cx="31" cy="77" r="4"/><rect className={styles.red} x="30" y="62" width="2" height="14"/>
  </>,
  lab: () => <>
    <rect className={styles.sky} x="0" y="0" width="160" height="100"/>
    <rect className={styles.wood} x="10" y="66" width="140" height="5"/><rect className={styles.wood} x="18" y="71" width="4" height="29"/><rect className={styles.wood} x="138" y="71" width="4" height="29"/>
    <path className={styles.trim} d="M34 40 h8 v8 l8 18 h-24 l8 -18 Z"/><path className={styles.accent} d="M30 58 h20 l4 8 h-28 Z"/>
    <rect className={styles.trim} x="62" y="36" width="7" height="30" rx="3"/><rect className={styles.red} x="62" y="52" width="7" height="14" rx="3"/>
    <rect className={styles.trim} x="74" y="42" width="7" height="24" rx="3"/><rect className={styles.blue} x="74" y="56" width="7" height="10" rx="3"/>
    <path className={styles.ink} opacity=".8" d="M108 66 h26 v-4 h-8 l-6 -18 l4 -4 l-3 -3 l-10 10 l3 3 l3 -3 l5 15 h-14 Z"/>
  </>,
  mountains: () => <>
    <Sky/><Sun/>
    <path className={styles.ground2} d="M0 100 L0 56 L30 30 L52 46 L80 14 L108 44 L130 32 L160 52 L160 100 Z"/>
    <path className={styles.plant} d="M0 100 L0 74 Q40 66 80 72 T160 70 L160 100 Z"/>
    <TowerHouse x={70} w={9} floors={2} ground={22}/><TowerHouse x={81} w={8} floors={3} ground={22} tone="wall2"/>
  </>,
  desert: () => <>
    <Sky warm/><Sun x={30} r={9}/>
    <path className={styles.ground} d="M0 100 L0 72 Q40 60 80 70 T160 66 L160 100 Z"/>
    <path className={styles.ground2} d="M0 100 L0 86 Q50 76 100 84 T160 82 L160 100 Z"/>
    {[[96, 22, 6], [114, 18, 7], [130, 20, 6]].map(([x, w, f]) => <g key={x}>
      <rect className={styles.wall2} x={x} y={70 - f * 7} width={w} height={f * 7}/>
      <rect className={styles.trim} x={x} y={70 - f * 7} width={w} height="2"/>
      {Array.from({length: f - 1}, (_, i) => <rect key={i} className={styles.ink} opacity=".6" x={x + w / 2 - 1.5} y={70 - f * 7 + 5 + i * 7} width="3" height="3.4"/>)}
    </g>)}
    <rect className={styles.wood} x="56" y="52" width="2.4" height="22"/>
    <path className={styles.plant} d="M57 52 q-10 -2 -14 4 q8 -6 14 -4 q-6 -8 -14 -6 q10 -2 14 6 q4 -10 12 -8 q-8 0 -12 8 q8 -4 14 2 q-8 -6 -14 -2 Z"/>
  </>,
};
draw.home = draw.city;

export default function Scene({scene}) {
  const Draw = draw[scene] || draw.city;
  return <svg viewBox="0 0 160 100" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><Draw/></svg>;
}
