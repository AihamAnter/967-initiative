'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,BookOpenCheck,CheckCircle2,Landmark,RefreshCw} from 'lucide-react';
import {getCivicActivity,civicNumbers} from '@/lib/schoolCivicActivities';
import {CIVIC_LABS,calculateCivicLab} from '@/lib/schoolCivicModels';
import styles from '@/app/school/civic/civic.module.css';

const nf=new Intl.NumberFormat('ar',{maximumFractionDigits:2});
function Metric({row,previous}){
 const [label,number,unit]=row;
 return <div className={styles.exerciseMetric}>
  <span>{label}</span>
  <strong>{typeof number==='number'?nf.format(number):number} <small>{unit}</small></strong>
  {previous!==undefined&&previous!==number&&<small className={styles.metricBefore}>كان {nf.format(previous)}</small>}
 </div>;
}
function NumberExercise({activity,onComplete}){
 const [x,setX]=useState(activity.x.initial),[y,setY]=useState(activity.y.initial);
 const [changed,setChanged]=useState(false);
 const result=useMemo(()=>civicNumbers(activity,x,y),[activity,x,y]);
 const initial=useMemo(()=>civicNumbers(activity,activity.x.initial,activity.y.initial),[activity]);
 const update=(axis,next)=>{
  if(axis==='x')setX(next);else setY(next);
  if(!changed&&next!==(axis==='x'?x:y)&&!civicNumbers(activity,axis==='x'?next:x,axis==='y'?next:y).error){setChanged(true);onComplete?.();}
 };
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <div className={styles.numberFields}>{[['x',activity.x,x],['y',activity.y,y]].map(([key,a,v])=>
   <label key={key} className={styles.numberField}>
    <span>{a.label} <strong>{nf.format(v)} {a.unit}</strong></span>
    <input type="range" min={a.min} max={a.max} step={a.step} value={v}
     onChange={event=>update(key,Number(event.target.value))} aria-label={a.label}/>
    <small>{nf.format(a.min)} — {nf.format(a.max)} {a.unit}</small>
   </label>)}</div>
  {result.error?<p role="status" className={styles.warning}>{result.error}</p>:
   <div className={styles.exerciseMetrics} aria-live="polite">
    {result.metrics.map((row,i)=><Metric key={i} row={row} previous={changed?initial.metrics[i]?.[1]:undefined}/>)}
   </div>}
  <button type="button" className={styles.exerciseReset} onClick={()=>{setX(activity.x.initial);setY(activity.y.initial);}}>
   <RefreshCw size={15}/> إعادة المثال إلى البداية
  </button>
  {changed&&!result.error&&<p className={styles.exerciseExplanation}><CheckCircle2 size={18}/> {activity.explain}</p>}
 </div>;
}
function CaseExercise({activity,onComplete}){
 const [selected,setSelected]=useState(null);
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <div className={styles.exerciseChoices}>{activity.choices.map((choice,i)=>
   <button type="button" aria-pressed={selected===i} key={choice} onClick={()=>{setSelected(i);onComplete?.();}}>
    <span className={styles.choiceIndex}>{i+1}</span>{choice}
   </button>)}</div>
  {selected!==null&&<div className={styles.exerciseExplanation} role="status"><BookOpenCheck size={19}/>
   <div><strong>لنحلل الموقف</strong><p>{activity.explain}</p><small>يمكنك اختيار إجابة أخرى ومقارنة الفكرة. هذا تدريب للفهم وليس امتحانًا.</small></div>
  </div>}
 </div>;
}
function PathsExercise({activity,onComplete}){
 const [selected,setSelected]=useState(null);
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <div className={styles.pathGrid}>{activity.choices.map(([title,description],i)=>
   <button type="button" aria-pressed={selected===i} key={title} onClick={()=>{setSelected(i);onComplete?.();}}>
    <span>{title}</span><small>{selected===i?description:'اضغط لفهم أثر هذا الجانب'}</small>
   </button>)}</div>
  {selected!==null&&<p className={styles.exerciseExplanation} role="status"><CheckCircle2 size={18}/>{activity.explain}</p>}
 </div>;
}
function StepsExercise({activity,onComplete}){
 const [chosen,setChosen]=useState([]),[feedback,setFeedback]=useState('');
 const order=[2,0,1].filter(i=>i<activity.steps.length);
 const addStep=i=>{
  if(chosen.includes(i))return;
  if(i!==chosen.length){setFeedback('ابدأ بالخطوة المنطقية الأولى، ثم أكمل ما يليها. جرّب مجددًا.');return;}
  setFeedback('');setChosen(v=>[...v,i]);
  if(chosen.length+1===activity.steps.length)onComplete?.();
 };
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>اضغط على الخطوات بالترتيب الذي تنفذها فيه. ابدأ بالأولى.</p>
  <div className={styles.sequenceBoard}>{activity.steps.map((step,i)=><span key={step} className={chosen.includes(i)?styles.sequenceDone:styles.sequencePending}>{chosen.includes(i)?'✓':i+1}. {chosen.includes(i)?step:'الخطوة '+(i+1)+' لم تختر بعد'}</span>)}</div>
  <div className={styles.exerciseChoices}>{order.map(i=><button key={i} type="button" disabled={chosen.includes(i)} onClick={()=>addStep(i)}>{activity.steps[i]}</button>)}</div>
  {feedback&&<p className={styles.warning} role="status">{feedback}</p>}
  {chosen.length===activity.steps.length&&<p role="status" className={styles.exerciseExplanation}><CheckCircle2 size={18}/>{activity.explain}</p>}
  <button type="button" className={styles.exerciseReset} onClick={()=>{setChosen([]);setFeedback('');}}><RefreshCw size={15}/> إعادة ترتيب الخطوات</button>
 </div>;
}
function GenericCivicLab({lab,onComplete}){
 const config=CIVIC_LABS[lab?.model], [x,setX]=useState(config?.x.initial??0),[y,setY]=useState(config?.y.initial??0);
 const [done,setDone]=useState(false);
 const result=useMemo(()=>{
  if(!config)return null;
  try{return calculateCivicLab(lab.model,{x,y});}catch{return null;}
 },[config,lab.model,x,y]);
 if(!config)return <p role="alert">المختبر غير متاح.</p>;
 return <section className={styles.lab}>
  <h3>{config.title}</h3><p>غيّر قيمة واحدة ولاحظ أثرها في النتائج. هذا نموذج افتراضي للتعلم.</p>
  <div className={styles.numberFields}>{[['x',x,config.x],['y',y,config.y]].map(([a,v,c])=><label key={a} className={styles.numberField}>
   <span>{c.label} <strong>{v}</strong></span><input type="range" min={c.min} max={c.max} step={c.step} value={v} onChange={e=>{
    if(a==='x')setX(Number(e.target.value));else setY(Number(e.target.value));
    setDone(true);onComplete?.();
   }}/></label>)}</div>
  {result?<div className={styles.exerciseMetrics}>{result.rows.map(([name,val])=><div className={styles.exerciseMetric} key={name}><span>{name}</span><strong>{val}</strong></div>)}</div>:<p className={styles.warning}>أعد توزيع القيم حتى لا يتجاوز مجموعها 100%.</p>}
  {done&&result&&<p className={styles.exerciseExplanation}>{result.conclusion}</p>}
  <p className={styles.exerciseLimit}>{config.note}</p>
 </section>;
}
export default function CivicLab({lab,slug,index,onComplete}){
 const activity=getCivicActivity(slug,index);
 if(!activity)return <GenericCivicLab lab={lab} onComplete={onComplete}/>;
 return <section className={styles.lab} aria-label={'نشاط عملي: '+activity.title}>
  <div className={styles.labTitle}><Landmark size={23}/><div>
   <span className={styles.activityEyebrow}>{activity.kind==='numbers'?'احسب وشاهد الأثر':activity.kind==='paths'?'استكشف النتائج':activity.kind==='steps'?'رتّب الإجراءات':'حلّل الموقف'}</span>
   <h3>{activity.title}</h3>
  </div></div>
  <p className={styles.activityStory}>{activity.story}</p>
  {activity.kind==='numbers'&&<NumberExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='case'&&<CaseExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='paths'&&<PathsExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='steps'&&<StepsExercise activity={activity} onComplete={onComplete}/>}
  <p className={styles.exerciseLimit}>تجربة مبسطة للتعلم، وليست حكمًا على شخص أو نظام سياسي أو توقعًا اقتصاديًا. لا توجد درجة على اختيارك هنا.</p>
  <span className={styles.exerciseContinue}><ArrowLeft size={16}/> بعد تنفيذ النشاط يمكنك متابعة الاختبار</span>
 </section>;
}
