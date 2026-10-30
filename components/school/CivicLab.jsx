'use client';
import {useMemo,useState} from 'react';
import {Landmark,Lightbulb,ShieldAlert} from 'lucide-react';
import {CIVIC_LABS,calculateCivicLab} from '@/lib/schoolCivicModels';
import styles from '@/app/school/civic/civic.module.css';

export default function CivicLab({lab,onComplete}){
 const config=CIVIC_LABS[lab?.model];
 const [x,setX]=useState(config?.x.initial??0);
 const [y,setY]=useState(config?.y.initial??0);
 const [prediction,setPrediction]=useState('');
 const [explored,setExplored]=useState(false);
 const canUse=config&&(!['institutions','elections','budget'].includes(lab.model)||x+y<=100);
 const result=useMemo(()=>canUse?calculateCivicLab(lab.model,{x,y}):null,[lab?.model,canUse,x,y]);
 if(!config)return <p role="alert">المختبر غير متاح.</p>;
 const update=(axis,value)=>{
  if(axis==='x')setX(value);else setY(value);
  const nextX=axis==='x'?value:x,nextY=axis==='y'?value:y;
  const valid=!['institutions','elections','budget'].includes(lab.model)||nextX+nextY<=100;
  if(prediction&&valid){setExplored(true);onComplete?.();}
 };
 return <section className={styles.lab} aria-label="مختبر القرار">
  <div className={styles.labTitle}><Landmark size={22}/><div><h3>{config.title}</h3><p>{lab.scenario}</p></div></div>
  <div className={styles.challenge}><Lightbulb size={18}/><p>قبل تغيير القيم، ماذا تتوقع أن يحدث لمؤشر «{result?.metric||'النتيجة'}» عند زيادة المتغير الأول مع ثبات الثاني؟</p></div>
  <div className={styles.predictions}>
   {['يزداد','ينخفض','لا يتغير'].map(v=><button key={v} type="button" aria-pressed={prediction===v} onClick={()=>setPrediction(v)}>{v}</button>)}
  </div>
  {prediction?<div className={styles.controls}>
   {['x','y'].map(axis=><label key={axis} className={styles.control}>
    <span>{config[axis].label}<strong dir="ltr">{axis==='x'?x:y}</strong></span>
    <input type="range" min={config[axis].min} max={config[axis].max} step={config[axis].step}
     value={axis==='x'?x:y} onChange={e=>update(axis,Number(e.target.value))}/>
   </label>)}
   {!canUse?<p className={styles.warning} role="status">المجموع يتجاوز 100%. خفّض أحد الخيارين حتى تصبح القسمة ممكنة.</p>:<>
    <h4>{result.metric}: <span>{typeof result.primary==='number'?Number(result.primary.toFixed(2)):result.primary}{result.unit}</span></h4>
    <div className={styles.results}>{result.rows.map(([name,value])=><div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div>
    {explored&&<p className={styles.explanation}>{result.conclusion} توقّعك كان «{prediction}»؛ قارن النتائج بتغيير متغير واحد فقط في كل مرة.</p>}
   </>}
  </div>:<p className={styles.hint}>اختر توقعك أولًا، ثم تظهر لك المتغيرات.</p>}
  <p className={styles.disclaimer}><ShieldAlert size={17}/>{config.note}</p>
  {explored&&canUse&&<p className={styles.complete}>أكملت تجربة تغيير المعطيات. يمكنك الآن متابعة اختبار المحطة.</p>}
 </section>;
}
