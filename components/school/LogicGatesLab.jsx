'use client';
import {useState} from 'react';
import {CircuitBoard,ToggleLeft} from 'lucide-react';
import {evaluateGate,gateTruthTable} from '@/lib/schoolThinkingLabs';
import styles from '@/app/school/studio/studio.module.css';
export default function LogicGatesLab({gate='AND'}){
 const [a,setA]=useState(0),[b,setB]=useState(0);
 const single=gate==='NOT'||gate==='BUFFER',dual=gate==='HALF_ADDER';
 const values=evaluateGate(gate,a,b),table=gateTruthTable(gate);
 return <div className={styles.thinkingLab} aria-labelledby="gate-lab-title">
  <div className={styles.labHeading}><CircuitBoard size={22}/><div><strong id="gate-lab-title">مختبر البوابات المنطقية</strong><small>غيّر المدخلات 0 و1 وشاهد المخرج وجدول الحقيقة مباشرة</small></div></div>
  <div className={styles.logicCircuit} dir="ltr">
   <div className={styles.logicInputs}>
    <button type="button" onClick={()=>setA(1-a)} aria-pressed={a===1} className={styles.logicToggle}>A <b>{a}</b></button>
    {!single&&<button type="button" onClick={()=>setB(1-b)} aria-pressed={b===1} className={styles.logicToggle}>B <b>{b}</b></button>}
   </div>
   <svg className={styles.logicWires} viewBox="0 0 160 120" role="img" aria-label="تمثيل بصري لأسلاك المداخل والمخرجات">
    <path d={single?'M0 60 H160':'M0 30 H60 V60 H160 M0 90 H60 V60'} fill="none" stroke="#619783" strokeWidth="4" strokeLinecap="round"/>
   </svg>
   <div className={styles.logicGateSymbol}>{gate==='HALF_ADDER'?'Σ + C':gate}</div>
   <div className={styles.logicOutput}><small>{dual?'Sum':'OUT'}</small><strong>{values.out}</strong>{dual&&<><small>Carry</small><strong>{values.carry}</strong></>}</div>
  </div>
  <p className={styles.labExplainer}>{dual?'الجامع النصفي يعرض المجموع والحمل معًا.':'المدخلات تتغير مباشرة؛ القيمة الناتجة تحسب من قاعدة البوابة، لا من التخمين.'}</p>
  <div className={styles.labTableWrap}><table className={styles.labTruthTable}><thead><tr><th>A</th>{!single&&<th>B</th>}<th>{dual?'Sum':'الناتج'}</th>{dual&&<th>Carry</th>}</tr></thead>
   <tbody>{table.map((row,i)=><tr key={i} className={row.a===a&&(single||row.b===b)?styles.logicCurrentRow:''}>
    <td>{row.a}</td>{!single&&<td>{row.b}</td>}<td>{row.out}</td>{dual&&<td>{row.carry}</td>}</tr>)}</tbody></table></div>
  <p className={styles.labHint}><ToggleLeft size={17}/> جرّب كل صف في الجدول، ثم تابع الاختبار بعد التأكد من القاعدة.</p>
 </div>;
}
