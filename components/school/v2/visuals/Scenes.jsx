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
  // بقالة من الداخل: رفوف بضاعة ملونة، وأكياس رز وطحين، وميزان على الطاولة، والبائع خلفها.
  shop: () => <>
    <rect className={styles.plaster} x="0" y="0" width="160" height="100"/>
    <rect className={styles.concrete2} opacity=".5" x="0" y="0" width="160" height="4"/>
    <path className={styles.hole} d="M80 4 v8"/><rect className={styles.hole} x="79.6" y="4" width=".8" height="8"/><circle className={styles.sun} cx="80" cy="14" r="2.6"/>
    {[22, 38, 54].map((y, r) => <g key={y}>
      <rect className={styles.wood} x="6" y={y} width="104" height="2"/>
      {Array.from({length: 13}, (_, i) => {
        const x = 9 + i * 7.8, tone = [styles.red, styles.sun, styles.blue, styles.plant2, styles.trim, styles.accent][(i * 3 + r * 2) % 6], h = 7 + ((i + r) % 3) * 2;
        return (i + r) % 4 === 1
          ? <g key={i}><rect className={tone} x={x} y={y - h} width="5.6" height={h} rx="1.4"/><rect className={styles.trim} opacity=".7" x={x} y={y - h + 2} width="5.6" height="1.2"/></g>
          : <g key={i}><rect className={tone} x={x} y={y - h} width="5.6" height={h} rx=".4"/><rect className={styles.shade} x={x + 4} y={y - h} width="1.6" height={h}/></g>;
      })}
    </g>)}
    {[[118, 'trim'], [132, 'ground2'], [146, 'trim'], [125, 'ground2'], [139, 'trim']].map(([x, t], i) => <g key={i}>
      <path className={styles[t]} d={`M${x - 6} ${i > 2 ? 72 : 86} q0 -12 3 -14 h6 q3 2 3 14 Z`}/>
      <rect className={styles.wood} x={x - 2} y={i > 2 ? 58.6 : 72.6} width="4" height="1.4"/>
      <rect className={i % 2 ? styles.red : styles.blue} opacity=".8" x={x - 4} y={i > 2 ? 64 : 78} width="8" height="2.4"/>
    </g>)}
    <rect className={styles.ground} x="0" y="86" width="160" height="14"/>
    <Person x={58} y={66} s={1.15} tone="accent"/><path className={styles.trim} d="M54.6 47.4 a3.4 2.6 0 0 1 6.8 0 Z"/>
    <rect className={styles.wood} x="18" y="66" width="84" height="22"/><rect className={styles.trim} x="16" y="64.6" width="88" height="2.4"/>
    <rect className={styles.shade} x="18" y="67" width="84" height="2"/>
    <g><rect className={styles.hole} x="76" y="60" width="12" height="4.6" rx="1"/><rect className={styles.glass} x="78" y="61" width="5" height="2.4"/>
      <ellipse className={styles.trim} cx="82" cy="58.6" rx="7" ry="1.6"/><circle className={styles.red} cx="80" cy="56.4" r="2"/><circle className={styles.sun} cx="84" cy="56.6" r="2"/></g>
    <Person x={128} y={100} s={1.35} tone="blue"/>
  </>,
  // سوق قديم: بوابة في العمق، ودكاكين بمظلات على الجانبين، وأكوام بهارات، وناس على مسافات مختلفة.
  market: () => <>
    <Sky warm/>
    <path className={styles.wall2} d="M0 0 H40 L66 26 V66 L0 96 Z"/><path className={styles.wall} d="M160 0 H120 L94 26 V66 L160 96 Z"/>
    <rect className={styles.wall} x="62" y="22" width="36" height="44"/>
    {[62, 70, 78, 86, 94].map(x => <rect key={x} className={styles.wall} x={x} y="18.6" width="4" height="3.6"/>)}
    <path className={styles.hole} opacity=".8" d="M72 66 V42 a8 8 0 0 1 16 0 V66 Z"/>
    <path className={styles.sky2} opacity=".9" d="M74.6 66 V43 a5.4 5.4 0 0 1 10.8 0 V66 Z"/>
    <rect className={styles.trim} opacity=".8" x="62" y="30" width="36" height="1.2"/>
    <path className={styles.ground} d="M66 66 H94 L160 96 V100 H0 V96 Z"/>
    <path className={styles.ground2} opacity=".5" d="M76 66 H84 L104 100 H56 Z"/>
    {[[0, 34, 40, 'red'], [22, 45, 33, 'sun'], [44, 55, 28, 'blue']].map(([x0, y0, d, t], i) => <g key={'l' + i}>
      <path className={styles[t]} d={`M${x0} ${y0} L${x0 + d * .62} ${y0 + d * .24} L${x0 + d * .62} ${y0 + d * .36} L${x0} ${y0 + d * .2} Z`}/>
      <path className={styles.wood} d={`M${x0} ${y0 + d * .62} L${x0 + d * .6} ${y0 + d * .52} V${y0 + d * .6} L${x0} ${y0 + d * .72} Z`}/>
      {[.12, .26, .4].map((f, j) => <path key={j} className={[styles.red, styles.sun, styles.plant][(i + j) % 3]} d={`M${x0 + d * f} ${y0 + d * (.6 - f * .17)} l${d * .05} -${d * .1} l${d * .05} ${d * .1} Z`}/>)}
    </g>)}
    {[[160, 34, 40, 'accent'], [138, 45, 33, 'red'], [116, 55, 28, 'sun']].map(([x0, y0, d, t], i) => <g key={'r' + i}>
      <path className={styles[t]} d={`M${x0} ${y0} L${x0 - d * .62} ${y0 + d * .24} L${x0 - d * .62} ${y0 + d * .36} L${x0} ${y0 + d * .2} Z`}/>
      <path className={styles.wood} d={`M${x0} ${y0 + d * .62} L${x0 - d * .6} ${y0 + d * .52} V${y0 + d * .6} L${x0} ${y0 + d * .72} Z`}/>
      {[.14, .3, .46].map((f, j) => <rect key={j} className={[styles.trim, styles.ground2, styles.sun][(i + j) % 3]} x={x0 - d * f - d * .06} y={y0 + d * (.5 - f * .17)} width={d * .1} height={d * .1} rx=".6"/>)}
    </g>)}
    <Person x={80} y={72} s={.5} tone="blue"/><Person x={86} y={73} s={.48} tone="red"/>
    <Person x={66} y={84} s={.82} tone="sun"/><Person x={98} y={86} s={.85}/>
    <Person x={46} y={100} s={1.25} tone="red"/><Person x={118} y={100} s={1.2} tone="blue"/>
  </>,
  // الفضاء: الشمس على الطرف، وكواكب على مداراتها، ونجوم. السماء داكنة في الوضعين.
  space: () => <>
    <rect className={styles.space} x="0" y="0" width="160" height="100"/>
    {[[12, 10], [40, 6], [70, 18], [96, 8], [126, 14], [150, 6], [22, 40], [58, 52], [140, 44], [108, 70], [30, 86], [150, 88], [84, 92], [6, 64], [118, 30]].map(([x, y], i) =>
      <circle key={i} className={styles.star} cx={x} cy={y} r={i % 3 ? .6 : 1}/>)}
    {[34, 58, 86].map(r => <ellipse key={r} className={styles.orbit} cx="-6" cy="50" rx={r + 20} ry={r}/>)}
    <circle className={styles.sun} cx="-6" cy="50" r="22"/>
    <circle className={styles.wall2} cx="45" cy="26" r="3"/>
    <circle className={styles.blue} cx="77" cy="66" r="6"/><path className={styles.plant} d="M73 63 q3 -1 4 2 q-1 3 -4 2 Z M79 67 q2 -1 3 1 q-1 2 -3 1 Z"/><circle className={styles.trim} cx="86" cy="60" r="1.6"/>
    <circle className={styles.red} cx="114" cy="84" r="4.4"/>
    <ellipse className={styles.orbit} style={{strokeWidth: 1.4, opacity: .9}} cx="134" cy="30" rx="16" ry="4"/>
    <circle className={styles.sun} cx="134" cy="30" r="9"/><rect className={styles.wall} opacity=".5" x="125" y="28" width="18" height="1.6"/>
    <path className={styles.orbitFront} d="M118 30 a16 4 0 0 0 32 0"/>
  </>,
  // بركان ثائر: حمم تسيل وسحابة رماد، وبيوت بعيدة عند السفح.
  volcano: () => <>
    <Sky warm/>
    <g className={styles.concrete2}><circle cx="70" cy="16" r="9"/><circle cx="82" cy="10" r="11"/><circle cx="96" cy="16" r="9"/><circle cx="88" cy="22" r="7"/></g>
    <path className={styles.ground2} d="M0 80 L46 50 L66 28 H96 L116 50 L160 78 V100 H0 Z"/>
    <path className={styles.wall2} opacity=".7" d="M66 28 H96 L104 40 Q81 36 58 40 Z"/>
    <path className={styles.red} d="M74 28 H88 L86 36 Q90 48 84 60 Q80 70 86 82 L78 82 Q72 66 77 54 Q81 44 76 36 Z"/>
    <path className={styles.sun} d="M78 28 h6 l-1 6 q2 10 -2 18 q-3 8 0 16 h-3 q-3 -8 0 -16 q3 -8 1 -18 Z"/>
    <path className={styles.red} d="M96 32 q10 8 12 22 l-4 1 q-2 -12 -10 -20 Z"/>
    {[[78, 24, 1.6], [86, 22, 1.2], [72, 20, 1]].map(([x, y, r], i) => <circle key={i} className={styles.sun} cx={x} cy={y} r={r}/>)}
    <rect className={styles.ground} x="0" y="88" width="160" height="12"/>
    {[[14, 9, 6], [26, 7, 8], [140, 8, 7]].map(([x, w, h], i) => <g key={i}><rect className={styles.wall} x={x} y={88 - h} width={w} height={h}/><rect className={styles.trim} x={x - .4} y={87.2 - h} width={w + .8} height=".9"/><rect className={styles.hole} opacity=".7" x={x + w / 2 - 1} y={90 - h} width="2" height="2.4"/></g>)}
  </>,
  // بنك: واجهة بأعمدة ودرج، وصراف آلي، وطابور قصير.
  bank: () => <>
    <Sky/><rect className={styles.ground} x="0" y="80" width="160" height="20"/>
    <rect className={styles.concrete} x="22" y="24" width="116" height="56"/>
    <path className={styles.concrete2} d="M18 24 L80 8 L142 24 Z"/><rect className={styles.trim} x="18" y="23" width="124" height="2"/>
    <rect className={styles.accent} x="60" y="28" width="40" height="7" rx="1"/><rect className={styles.trim} opacity=".9" x="66" y="30.8" width="28" height="1.4" rx=".6"/>
    {[30, 44, 104, 118].map(x => <g key={x}><rect className={styles.trim} x={x} y="38" width="6" height="38"/><rect className={styles.shade} x={x + 4.4} y="38" width="1.6" height="38"/><rect className={styles.concrete2} x={x - 1} y="36.6" width="8" height="2"/></g>)}
    <rect className={styles.glass} x="64" y="44" width="32" height="32"/><rect className={styles.concrete2} x="79.4" y="44" width="1.2" height="32"/>
    <rect className={styles.concrete2} x="16" y="76" width="128" height="2.4"/><rect className={styles.concrete} x="12" y="78.4" width="136" height="2.4"/>
    <g><rect className={styles.hole} x="146" y="52" width="12" height="28" rx="1"/><rect className={styles.glass} x="148" y="55" width="8" height="6"/>
      {[64, 67, 70].map(y => <rect key={y} className={styles.trim} opacity=".7" x="148.6" y={y} width="6.8" height="1.6"/>)}</g>
    <Person x={140} y={94} s={1.05} tone="blue"/><Person x={128} y={95} s={1.1} tone="red"/><Person x={116} y={95} s={1} tone="sun"/>
    <Person x={40} y={95} s={1.1} tone="accent"/>
  </>,
  // جهاز تلغراف على مكتب: مفتاح الإرسال وشريط ورقي عليه نقاط وشرطات، وأعمدة أسلاك من النافذة.
  telegraph: () => <>
    <rect className={styles.plaster} x="0" y="0" width="160" height="100"/>
    <rect className={styles.wood} x="96" y="8" width="54" height="40"/><rect className={styles.sky} x="99" y="11" width="48" height="34"/>
    <path className={styles.ground2} d="M99 45 V36 l12 -6 l14 5 l12 -7 l10 6 v11 Z"/>
    {[106, 126, 144].map((x, i) => <g key={x}><rect className={styles.hole} x={x} y={18 + i * 2} width="1" height="18"/><rect className={styles.hole} x={x - 3} y={19 + i * 2} width="7" height=".8"/></g>)}
    <path className={styles.wire} d="M99 20 Q116 26 126 21 T147 23"/>
    <rect className={styles.wood} x="0" y="62" width="160" height="38"/><rect className={styles.trim} opacity=".3" x="0" y="62" width="160" height="1.4"/>
    <rect className={styles.wood} x="30" y="52" width="40" height="10" rx="1.4"/><rect className={styles.shade} x="30" y="58" width="40" height="4"/>
    <rect className={styles.sun} x="36" y="47" width="28" height="4" rx="1"/>
    <path className={styles.hole} d="M38 46 L62 43 L62.6 45 L38.6 48 Z"/><circle className={styles.hole} cx="63" cy="43" r="3.4"/><circle className={styles.trim} cx="63" cy="42.4" r="1.4"/>
    <rect className={styles.sun} x="40" y="44" width="2.4" height="4"/>
    <path className={styles.trim} d="M78 72 h70 v8 h-70 Z"/><path className={styles.trim} d="M78 72 q-8 -4 -6 -12 h4 q-1 6 6 8 Z"/>
    {[[82, 'dot'], [88, 'dash'], [97, 'dot'], [103, 'dot'], [109, 'dash'], [119, 'dash'], [129, 'dot'], [135, 'dash']].map(([x, k], i) =>
      k === 'dot' ? <circle key={i} className={styles.hole} cx={x + 1.4} cy="76" r="1.4"/> : <rect key={i} className={styles.hole} x={x} y="75" width="7" height="2" rx="1"/>)}
    <Person x={20} y={74} s={1.2} tone="blue"/>
  </>,
  // لوحة دارة: مسارات نحاسية، وشرائح، ومصابيح، وبطارية ومفتاح.
  circuit: () => <>
    <rect className={styles.board} x="0" y="0" width="160" height="100"/>
    <g className={styles.trace}>
      <path d="M20 20 H60 V40 H90"/><path d="M20 50 H44 V70 H90"/><path d="M110 40 H130 V25"/><path d="M110 70 H136 V84 H20 V70"/><path d="M90 40 V70"/><path d="M60 40 V20"/>
    </g>
    {[[20, 20], [20, 50], [60, 40], [90, 40], [90, 70], [130, 25], [136, 84], [20, 84]].map(([x, y], i) => <circle key={i} className={styles.sun} cx={x} cy={y} r="1.8"/>)}
    <g><rect className={styles.hole} x="88" y="48" width="24" height="16" rx="1"/>
      {[0, 1, 2, 3].map(i => <g key={i}><rect className={styles.trim} opacity=".8" x={91 + i * 5.4} y="45.6" width="1.4" height="2.4"/><rect className={styles.trim} opacity=".8" x={91 + i * 5.4} y="64" width="1.4" height="2.4"/></g>)}
      <circle className={styles.trim} opacity=".5" cx="91.4" cy="51" r=".9"/></g>
    <g><rect className={styles.hole} x="36" y="26" width="16" height="10" rx="1"/><circle className={styles.trim} opacity=".5" cx="38.6" cy="28.4" r=".7"/></g>
    {[[130, 18, 'red'], [146, 40, 'sun'], [146, 58, 'plant2']].map(([x, y, t], i) => <g key={i}>
      <circle className={styles[t]} cx={x} cy={y} r="4.4"/><circle className={styles[t]} opacity=".25" cx={x} cy={y} r="7.4"/><circle className={styles.trim} opacity=".7" cx={x - 1.4} cy={y - 1.4} r="1.2"/></g>)}
    <g><rect className={styles.blue} x="8" y="60" width="10" height="30" rx="1.4"/><rect className={styles.hole} x="11" y="58" width="4" height="2.4"/><rect className={styles.trim} opacity=".8" x="10" y="64" width="6" height="1.2"/></g>
    <g><rect className={styles.hole} x="56" y="78" width="14" height="10" rx="1.4"/><rect className={styles.trim} x="58.4" y="81" width="5" height="4" rx="1"/></g>
  </>,
  // مكتب خطاط: ورقة عليها ضربات حبر، وأقلام قصب، ودواة، ومسطرة.
  desk: () => <>
    <rect className={styles.wood} x="0" y="0" width="160" height="100"/>
    <rect className={styles.shade} x="0" y="0" width="160" height="100" opacity=".08"/>
    <g transform="rotate(-4 76 52)"><rect className={styles.paperFixed} x="28" y="14" width="96" height="74" rx="1"/>
      {[30, 46, 62].map(y => <rect key={y} className={styles.trimLine} style={{stroke: 'var(--v-glass)', strokeWidth: .5}} x="36" y={y} width="80" height=".1"/>)}
      <path className={styles.inkStroke} d="M110 27 q-6 4 -14 1 q-6 -3 -10 2 M84 28 q-4 -8 -10 -3 q-4 5 2 6 M68 29 h-10 q-6 0 -6 -6 M46 28 q-4 3 -8 0"/>
      <path className={styles.inkStroke} d="M108 44 q-10 -1 -12 -8 M92 43 q-8 6 -16 1 q-4 -3 -2 -8 M70 44 h-14 q-4 0 -6 -5 M48 43 q-6 4 -10 -1"/>
      {[[100, 24], [78, 22], [92, 39], [60, 38]].map(([x, y], i) => <path key={i} className={styles.hole} d={`M${x} ${y} l1.4 -1.4 l1.4 1.4 l-1.4 1.4 Z`}/>)}
      <path className={styles.inkStroke} style={{opacity: .35}} d="M110 58 q-8 2 -14 -2 M88 58 q-6 4 -12 0"/>
    </g>
    <g><ellipse className={styles.hole} cx="140" cy="30" rx="9" ry="3"/><rect className={styles.hole} x="131" y="30" width="18" height="12"/><ellipse className={styles.hole} cx="140" cy="42" rx="9" ry="3"/><ellipse className={styles.trim} opacity=".25" cx="140" cy="30" rx="6" ry="1.6"/></g>
    {[0, 1, 2].map(i => <g key={i} transform={`rotate(${-62 + i * 7} 140 70)`}><rect className={[styles.sun, styles.wall, styles.wall2][i]} x="112" y="69" width="44" height="2.6" rx="1"/><path className={styles.hole} d="M112 69 l-4 1.3 l4 1.3 Z"/></g>)}
    <rect className={styles.trim} opacity=".85" x="10" y="90" width="80" height="4" rx=".6" transform="rotate(-4 50 92)"/>
  </>,
  // قاعة محكمة: منصة القاضي، ورمز الميزان على الجدار، ومقاعد الحضور.
  court: () => <>
    <rect className={styles.plaster} x="0" y="0" width="160" height="100"/>
    <rect className={styles.wood} opacity=".35" x="0" y="0" width="160" height="6"/>
    <g transform="translate(80 18)"><rect className={styles.sun} x="-.7" y="-8" width="1.4" height="14"/><rect className={styles.sun} x="-10" y="-7" width="20" height="1.2"/>
      <path className={styles.sun} d="M-10 -6 l-4 7 h8 Z M10 -6 l-4 7 h8 Z"/><rect className={styles.sun} x="-4" y="5.4" width="8" height="1.6"/></g>
    <Person x={80} y={52} s={1.2}/>
    <rect className={styles.wood} x="40" y="44" width="80" height="22"/><rect className={styles.trim} opacity=".3" x="38" y="42.6" width="84" height="2"/>
    {[52, 80, 108].map(x => <rect key={x} className={styles.shade} x={x - 8} y="49" width="16" height="12" rx="1"/>)}
    <rect className={styles.wood} x="8" y="52" width="24" height="14"/><Person x={20} y={56} s={.9} tone="red"/>
    <rect className={styles.wood} x="128" y="52" width="24" height="14"/><Person x={140} y={56} s={.9} tone="blue"/>
    <rect className={styles.ground} x="0" y="66" width="160" height="34"/>
    {[78, 92].map((y, r) => <g key={y}>
      {[22, 40, 58, 102, 120, 138].map((x, i) => <Person key={x} x={x} y={y - 2} s={.85} tone={['accent', 'blue', 'sun', 'red', 'accent', 'blue'][(i + r) % 6]}/>)}
      <rect className={styles.wood} x="10" y={y - 3} width="62" height="5"/><rect className={styles.wood} x="88" y={y - 3} width="62" height="5"/>
    </g>)}
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
