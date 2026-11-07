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

// عمارة خرسانية حديثة كما في المدن اليمنية اليوم: خزان ماء أسود، وألواح شمسية، وصحن لاقط، ومكيّف.
function Block({x, w, floors, ground = 68, tone = 'concrete', tank, solar, dish, ac}) {
  const fh = 9, h = floors * fh + 3, top = ground - h, cols = Math.max(2, Math.round(w / 8));
  return <g>
    <rect className={styles[tone]} x={x} y={top} width={w} height={h}/>
    <rect className={styles.shade} x={x + w - 2.4} y={top} width="2.4" height={h}/>
    <rect className={styles.concrete2} x={x - .8} y={top - 1.4} width={w + 1.6} height="1.6"/>
    {Array.from({length: floors}, (_, f) => <g key={f}>
      {f > 0 && <rect className={styles.shade} x={x} y={top + f * fh + .6} width={w} height=".6"/>}
      {Array.from({length: cols}, (_, c) => <rect key={c} className={styles.glass} x={x + (c + .5) * w / cols - 2.1} y={top + 3 + f * fh} width="4.2" height="4.4"/>)}
    </g>)}
    {ac && <rect className={styles.trim} x={x + w / cols + 2.4} y={top + 4 + fh} width="3.6" height="2.6"/>}
    {tank && <g className={styles.hole} opacity=".85"><rect x={x + 2.5} y={top - 7.6} width="5.4" height="6.2" rx="1.4"/><rect x={x + 2} y={top - 8.2} width="6.4" height="1.2" rx=".6"/></g>}
    {solar && <path className={styles.blue} d={`M${x + w - 13} ${top - 1.4} l2.4 -5.2 h8.4 l-2.4 5.2 Z`}/>}
    {dish && <g><path className={styles.trim} d={`M${x + w - 6} ${top - 5} a3.2 3.2 0 0 0 5 4 Z`}/><rect className={styles.hole} x={x + w - 4} y={top - 2} width=".6" height="2"/></g>}
  </g>;
}

// مسجد بقبة ومئذنة يمنية نحيلة.
const Mosque = ({x, ground = 68}) => <g>
  <path className={styles.trim} d={`M${x + 12} ${ground - 14} a11 9.5 0 0 1 22 0 Z`}/>
  <rect className={styles.wall} x={x + 22.4} y={ground - 26.6} width="1.2" height="3.4"/>
  <rect className={styles.trim} x={x + 6} y={ground - 14} width="34" height="14"/>
  {[11, 19, 27, 35].map(dx => <path key={dx} className={styles.wall2} d={`M${x + dx - 2} ${ground - 2} v-6 a2 2 0 0 1 4 0 v6 Z`}/>)}
  <rect className={styles.trim} x={x} y={ground - 46} width="5.4" height="46"/>
  {[10, 22, 34].map(dy => <rect key={dy} className={styles.wall2} x={x} y={ground - dy} width="5.4" height="1.6"/>)}
  <rect className={styles.wall} x={x - 1.4} y={ground - 48} width="8.2" height="2"/>
  <rect className={styles.trim} x={x + .8} y={ground - 55} width="3.8" height="7"/>
  <path className={styles.wall2} d={`M${x + .8} ${ground - 55} a1.9 2.6 0 0 1 3.8 0 Z`}/>
</g>;

// حافلة صغيرة (دبّاب) بيضاء بخط أزرق.
const Minibus = ({x, y}) => <g>
  <path className={styles.bus} d={`M${x} ${y} v-10 q0 -4 4 -4 h28 q3.4 0 4.6 3.4 l2 5.6 v5 Z`}/>
  <rect className={styles.blue} x={x} y={y - 5.4} width="38.6" height="1.6"/>
  {[4, 11, 18, 25].map(dx => <rect key={dx} className={styles.hole} opacity=".72" x={x + dx} y={y - 12.4} width="5.6" height="4.2" rx=".6"/>)}
  <path className={styles.hole} opacity=".72" d={`M${x + 32} ${y - 12.4} h2.4 l2.2 5 h-4.6 Z`}/>
  {[7, 30].map(dx => <g key={dx}><circle className={styles.hole} cx={x + dx} cy={y} r="3.2"/><circle className={styles.trim} cx={x + dx} cy={y} r="1.1"/></g>)}
</g>;

const Wheel = ({x, y, r = 3.2}) => <g><circle className={styles.hole} cx={x} cy={y} r={r}/><circle className={styles.trim} cx={x} cy={y} r={r / 3}/></g>;

const draw = {
  // منظر عام لمدينة يمنية اليوم: بيوت قديمة وعمارات حديثة ومسجد وشارع.
  city: () => <>
    <Sky/>
    <g className={styles.trim} opacity=".85"><ellipse cx="26" cy="15" rx="9" ry="2.8"/><ellipse cx="33" cy="13" rx="6" ry="2.6"/><ellipse cx="118" cy="10" rx="8" ry="2.4"/></g>
    <path className={styles.ground2} opacity=".6" d="M0 62 L0 44 L14 37 L26 41 L44 25 L58 34 L70 30 L84 40 L100 28 L116 22 L132 34 L146 30 L160 37 L160 62 Z"/>
    <rect className={styles.concrete2} x="150" y="24" width="3" height="16"/><g className={styles.trim} opacity=".7"><circle cx="152" cy="20" r="2.6"/><circle cx="148" cy="15" r="3.2"/></g>
    <Block x={-2} w={24} floors={5} tank dish ac/>
    <TowerHouse x={24} w={17} floors={5} ground={68}/>
    <Block x={43} w={20} floors={3} tone="concrete2" tank solar/>
    <TowerHouse x={64} w={13} floors={3} ground={68} tone="wall2"/>
    <Mosque x={80}/>
    <TowerHouse x={123} w={15} floors={4} ground={68}/>
    <Block x={139} w={23} floors={4} tank solar ac/>
    <rect className={styles.hole} opacity=".75" x="78.2" y="44" width=".9" height="28"/>
    <path className={styles.wire} d="M0 50 Q40 58 78.6 45 M78.6 45 Q122 55 160 47 M0 53 Q42 61 78.6 47"/>
    <rect className={styles.ground} x="0" y="68" width="160" height="5"/><rect className={styles.road} x="0" y="73" width="160" height="27"/>
    <path className={styles.dash} d="M0 87 H160"/>
    <Minibus x={16} y={94}/>
    <path className={styles.red} d="M104 82 v-4.6 q0 -1.8 2 -1.8 h3 l4 -4.6 h10 l4.4 4.6 h2 q2 0 2 2 v4.4 Z"/>
    <path className={styles.glass} d="M111 75.4 l3 -3.4 h3.4 v3.4 Z M119 72 h3.6 l3 3.4 h-6.6 Z"/>
    <Wheel x={109} y={82} r={2.6}/><Wheel x={126} y={82} r={2.6}/>
    <Person x={68} y={72} s={.8} tone="red"/><Person x={133} y={72} s={.82} tone="blue"/><Person x={140} y={72} s={.66}/>
  </>,
  // شارع تجاري من قرب: دكاكين بأبواب صاج مرفوعة ولافتات، ودراجة نارية وعربية خضار.
  street: () => <>
    <Sky warm/>
    <path className={styles.ground2} opacity=".6" d="M0 22 L0 10 L18 4 L40 12 L64 2 L92 12 L118 5 L140 11 L160 6 L160 22 Z"/>
    {[[0, 40, 'concrete', 'accent', 2], [40, 40, 'wall', 'red', 0], [80, 40, 'concrete2', 'sun', 1], [120, 40, 'concrete', 'blue', 2]].map(([x, w, tone, sign, shut]) => <g key={x}>
      <rect className={styles[tone]} x={x} y="20" width={w} height="58"/>
      <rect className={styles.shade} x={x + w - 1.6} y="20" width="1.6" height="58"/>
      {tone === 'wall'
        ? [8, 20, 32].map(dx => <g key={dx}><path className={styles.trim} d={`M${x + dx - .6} 30 a2.6 2.6 0 0 1 5.2 0 Z`}/><rect className={styles.hole} opacity=".72" x={x + dx} y="30.4" width="4" height="5.4"/></g>)
        : [7, 19, 31].map(dx => <rect key={dx} className={styles.glass} x={x + dx - 1} y="27" width="5" height="7"/>)}
      <rect className={styles[sign]} x={x + 3} y="40" width={w - 6} height="8" rx="1"/>
      <rect className={styles.trim} opacity=".9" x={x + 9} y="42.6" width={w - 18} height="1.1" rx=".5"/><rect className={styles.trim} opacity=".9" x={x + 13} y="45" width={w - 26} height="1" rx=".5"/>
      <rect className={styles.hole} opacity=".78" x={x + 4} y="51" width={w - 8} height="27"/>
      <rect className={styles.blue} opacity=".9" x={x + 4} y="51" width={w - 8} height={shut === 0 ? 6 : shut === 1 ? 10 : 4}/>
      {[0, 1].map(r => <rect key={r} className={styles.wood} x={x + 7} y={64 + r * 7} width={w - 14} height="1.2"/>)}
      {[10, 15, 20, 25, 30].map((dx, i) => <circle key={dx} className={[styles.red, styles.sun, styles.plant, styles.trim][(i + x / 40) % 4]} cx={x + dx} cy="62" r="1.8"/>)}
      {[12, 18, 24, 30].map((dx, i) => <rect key={dx} className={[styles.sun, styles.trim, styles.red, styles.blue][(i + x / 40) % 4]} x={x + dx - 2} y="66.6" width="3.6" height="4.4" rx=".6"/>)}
    </g>)}
    <path className={styles.wire} d="M0 18 Q50 26 100 17 T160 19 M0 21 Q70 30 160 22"/>
    <rect className={styles.ground} x="0" y="78" width="160" height="6"/><rect className={styles.road} x="0" y="84" width="160" height="16"/>
    <rect className={styles.wood} x="46" y="72" width="12" height="7"/><g>{[48, 51.6, 55.2].map(cx => <circle key={cx} className={styles.red} cx={cx} cy="71.4" r="1.8"/>)}</g>
    <g><path className={styles.wood} d="M104 86 h20 l-2 -6 h-16 Z"/><path className={styles.hole} opacity=".8" d="M124 82 l6 -4" strokeWidth="1" stroke="currentColor"/>
      {[108, 112, 116, 120].map((cx, i) => <circle key={cx} className={i % 2 ? styles.plant2 : styles.sun} cx={cx} cy="78.6" r="2.2"/>)}<Wheel x={110} y={88} r={2.6}/></g>
    <Person x={133} y={90} s={1.05} tone="accent"/>
    <g><path className={styles.red} d="M26 92 l4 -6 h9 l3 3 h4 l2 3 Z"/><Wheel x={27} y={93} r={3}/><Wheel x={47} y={93} r={3}/><Person x={36} y={86} s={.95} tone="blue"/></g>
    <Person x={80} y={84} s={.95} tone="red"/><Person x={88} y={84} s={.7}/>
  </>,
  // مفرج بيت يمني: قمرية ملونة فوق النافذة، ومجلس أرضي بمساند، وصينية شاي.
  home: () => {
    const segs = [0, 1, 2, 3, 4].map(i => {
      const a0 = Math.PI + i * Math.PI / 5, a1 = a0 + Math.PI / 5, p = a => `${(80 + 14 * Math.cos(a)).toFixed(2)} ${(26 + 14 * Math.sin(a)).toFixed(2)}`;
      return <path key={i} className={[styles.red, styles.sun, styles.blue, styles.plant2, styles.red][i]} opacity=".9" d={`M80 26 L${p(a0)} A14 14 0 0 1 ${p(a1)} Z`}/>;
    });
    return <>
      <rect className={styles.plaster} x="0" y="0" width="160" height="70"/>
      <rect className={styles.trim} x="0" y="6" width="160" height="1.6"/><rect className={styles.wall2} opacity=".35" x="0" y="8.2" width="160" height=".7"/>
      <path className={styles.trim} d="M62 26 a18 18 0 0 1 36 0 Z"/>{segs}
      <path className={styles.trimLine} d="M66 26 a14 14 0 0 1 28 0" style={{strokeWidth: .9}}/>
      <rect className={styles.wood} x="62" y="26" width="36" height="25"/>
      <rect className={styles.sky} x="64.4" y="28.4" width="31.2" height="20.2"/>
      <path className={styles.ground2} d="M64.4 48.6 V40 l7 -5 l6 4 l8 -7 l10.2 8 v8.6 Z"/>
      <rect className={styles.wood} x="79.3" y="28" width="1.4" height="21"/>
      {[24, 136].map(x => <g key={x}>
        <path className={styles.wall2} opacity=".55" d={`M${x - 8} 48 v-16 a8 8 0 0 1 16 0 v16 Z`}/>
        <rect className={styles.wood} x={x - 8} y="40" width="16" height="1.2"/>
        <rect className={styles.red} x={x - 5} y="34" width="2.4" height="6"/><rect className={styles.blue} x={x - 2.4} y="35" width="2.2" height="5"/><rect className={styles.sun} x={x} y="33.6" width="2.4" height="6.4"/>
        <path className={styles.wall} d={`M${x - 3} 48 q0 -5 3 -5.4 q3 .4 3 5.4 Z`}/>
      </g>)}
      {[6, 30, 54, 106, 130, 154].map(x => <rect key={x} className={styles.red} x={x - 9} y="50" width="18" height="12" rx="3"/>)}
      {[6, 30, 54, 106, 130, 154].map(x => <rect key={x} className={styles.trim} opacity=".6" x={x - 6} y="53" width="12" height="1" rx=".5"/>)}
      <rect className={styles.blue} x="0" y="61" width="160" height="9"/>
      <rect className={styles.wood} x="0" y="70" width="160" height="30"/>
      <rect className={styles.red} x="12" y="74" width="136" height="26"/>
      <rect x="15" y="77" width="130" height="23" fill="none" className={styles.trimLine} style={{strokeWidth: .7, strokeDasharray: '3 2'}}/>
      {[18, 142].map(x => <ellipse key={x} className={styles.sun} cx={x} cy="66" rx="5" ry="3.4"/>)}
      <Person x={36} y={68} s={1} tone="accent"/><Person x={52} y={68} s={.95} tone="sun"/>
      <Person x={110} y={68} s={1} tone="blue"/><Person x={124} y={68} s={.72} tone="accent"/>
      <ellipse className={styles.sun} cx="80" cy="86" rx="15" ry="4.4"/><ellipse className={styles.wood} opacity=".35" cx="80" cy="86" rx="12" ry="3"/>
      <rect className={styles.red} x="73" y="73" width="6" height="12" rx="2.4"/><rect className={styles.hole} x="74" y="71.6" width="4" height="2" rx=".8"/>
      {[83, 87.4].map(x => <path key={x} className={styles.trim} d={`M${x} 82 h3.2 l-.5 3.4 h-2.2 Z`}/>)}
      <g transform="rotate(-8 106 90)"><rect className={styles.trim} x="98" y="86" width="15" height="10" rx=".8"/>
        {[88.4, 90.6, 92.8].map(y => <rect key={y} className={styles.hole} opacity=".35" x="100" y={y} width="11" height=".6"/>)}</g>
    </>;
  },
  // بئر قرية بين المدرجات: إطار خشبي وبكرة، ودباب ماء صفراء، ونساء يملأن الماء.
  well: () => <>
    <Sky/><Sun x={136} y={14} r={6}/>
    <path className={styles.ground2} d="M0 66 L0 30 L24 18 L52 26 L84 10 L116 24 L140 16 L160 22 L160 66 Z"/>
    {[0, 1, 2, 3].map(i => <path key={i} className={i % 2 ? styles.plant : styles.plant2} d={`M0 ${36 + i * 8} Q80 ${28 + i * 8} 160 ${33 + i * 8} L160 ${37 + i * 8} Q80 ${32 + i * 8} 0 ${40 + i * 8} Z`}/>)}
    {[[34, 20, 7, 9, 'wall2'], [42, 18, 8, 12, 'wall'], [51, 21, 6, 8, 'wall2'], [58, 19, 7, 11, 'wall']].map(([x, y, w, h, t]) => <g key={x}>
      <rect className={styles[t]} x={x} y={y} width={w} height={h}/><rect className={styles.trim} x={x - .4} y={y - .8} width={w + .8} height=".9"/>
      <rect className={styles.hole} opacity=".7" x={x + w / 2 - 1} y={y + 2.4} width="2" height="2.4"/>
    </g>)}
    <rect className={styles.ground} x="0" y="64" width="160" height="36"/>
    <path className={styles.sea} opacity=".7" d="M0 92 Q30 88 54 84 Q62 82 66 80 L68 81.6 Q60 85 56 86 Q32 91 0 95 Z"/>
    <rect className={styles.wood} x="65" y="44" width="2.2" height="24"/><rect className={styles.wood} x="92.8" y="44" width="2.2" height="24"/>
    <rect className={styles.wood} x="63" y="43" width="34" height="2.4"/>
    <circle className={styles.hole} cx="80" cy="47.6" r="2.4"/><circle className={styles.trim} cx="80" cy="47.6" r=".9"/>
    <rect className={styles.hole} opacity=".7" x="79.7" y="49" width=".6" height="10"/>
    <path className={styles.wall2} d="M77.2 59 h5.6 l-.8 4 h-4 Z"/>
    <rect className={styles.wall2} x="62" y="66" width="36" height="16"/>
    <path className={styles.trimLine} opacity=".45" style={{strokeWidth: .6}} d="M62 71.4 H98 M62 76.8 H98 M70 66 v5.4 M82 66 v5.4 M94 66 v5.4 M66 71.4 v5.4 M78 71.4 v5.4 M90 71.4 v5.4 M72 76.8 v5.2 M86 76.8 v5.2"/>
    <ellipse className={styles.trim} cx="80" cy="66" rx="18" ry="4.4"/><ellipse className={styles.hole} opacity=".65" cx="80" cy="66" rx="14.6" ry="3"/>
    {[[104, 'sun'], [111, 'sun'], [118, 'blue']].map(([x, t]) => <g key={x}>
      <rect className={styles[t]} x={x} y="78" width="6" height="8.4" rx="1"/><rect className={styles.hole} opacity=".7" x={x + 3.6} y="76.6" width="1.6" height="1.6"/>
      <path className={styles.shade} d={`M${x + 1} 79.4 h2.6 v1 h-2.6 Z`}/>
    </g>)}
    <g><Person x={42} y={88} s={1.1} tone="red"/><path className={styles.wall} d="M38.6 69.6 q3.4 -4.4 6.8 0 q-.4 1.6 -3.4 1.6 q-3 0 -3.4 -1.6 Z"/></g>
    <Person x={30} y={86} s={.8} tone="blue"/>
    <g><Person x={134} y={90} s={1.1} tone="accent"/><rect className={styles.sun} x="138" y="81" width="5.4" height="7" rx="1"/></g>
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


export default function Scene({scene}) {
  const Draw = draw[scene] || draw.city;
  return <svg viewBox="0 0 160 100" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"><Draw/></svg>;
}
