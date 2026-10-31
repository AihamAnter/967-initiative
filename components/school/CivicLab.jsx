'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,BookOpenCheck,CheckCircle2,Landmark,RefreshCw} from 'lucide-react';
import {getCivicActivity,civicNumbers} from '@/lib/schoolCivicActivities';
import {CIVIC_LABS,calculateCivicLab} from '@/lib/schoolCivicModels';
import {labObservationChoices} from '@/lib/schoolLabEvidence';
import styles from '@/app/school/civic/civic.module.css';

const nf=new Intl.NumberFormat('ar',{maximumFractionDigits:5});
function Metric({row,previous}){
 const [label,number,unit]=row;
 return <div className={styles.exerciseMetric}>
  <span>{label}</span>
  <strong>{typeof number==='number'?nf.format(number):number} <small>{unit}</small></strong>
  {previous!==undefined&&previous!==number&&<small className={styles.metricBefore}>قبل التعديل: {nf.format(previous)}</small>}
 </div>;
}
function Done({children}){return <p className={styles.exerciseExplanation} role="status"><CheckCircle2 size={18}/>{children}</p>;}
function NumberExercise({activity,onComplete}){
 const [x,setX]=useState(activity.x.initial),[y,setY]=useState(activity.y.initial);
 const [checked,setChecked]=useState(false);
 const result=useMemo(()=>civicNumbers(activity,x,y),[activity,x,y]);
 const initial=useMemo(()=>civicNumbers(activity,activity.x.initial,activity.y.initial),[activity]);
 const metricIndex=!result.error?result.metrics.findIndex((row,i)=>
   typeof row[1]==='number'&&typeof initial.metrics[i]?.[1]==='number'&&
   Math.abs(row[1]-initial.metrics[i][1])>0.000001):-1;
 const before=initial.metrics[metricIndex]?.[1],after=result.metrics?.[metricIndex]?.[1];
 const choices=metricIndex>=0?labObservationChoices(before,after):[];
 const change=(axis,next)=>{if(axis==='x')setX(next);else setY(next);setChecked(false);};
 const verify=value=>{
  if(value!==after||metricIndex<0)return;
  setChecked(true);
  onComplete?.({kind:'numbers',x,y,metricIndex,observed:after});
 };
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <div className={styles.numberFields}>{[['x',activity.x,x],['y',activity.y,y]].map(([key,axis,value])=>
   <label className={styles.numberField} key={key}>
    <span>{axis.label} <strong>{nf.format(value)} {axis.unit}</strong></span>
    <input type="range" min={axis.min} max={axis.max} step={axis.step} value={value}
     onChange={event=>change(key,Number(event.target.value))} aria-label={axis.label}/>
    <small>{nf.format(axis.min)} — {nf.format(axis.max)} {axis.unit}</small>
   </label>)}</div>
  {result.error?<p className={styles.warning} role="status">{result.error}</p>:
   <div className={styles.exerciseMetrics} aria-live="polite">
    {result.metrics.map((row,i)=><Metric row={row} key={i} previous={metricIndex>=0?initial.metrics[i]?.[1]:undefined}/>)}
   </div>}
  {metricIndex<0||result.error?<p className={styles.warning}>غيّر المدخلات حتى ترى نتيجة عددية مختلفة عن البداية، ثم تحقق مما لاحظته.</p>:
   <div className={styles.observationPanel}>
    <strong>تحقق من الملاحظة</strong>
    <p>بعد تغيير المدخلات، ما القيمة التي تظهر الآن أمام «{result.metrics[metricIndex][0]}»؟ اقرأ النتيجة بالأعلى أولًا.</p>
    <div className={styles.exerciseChoices}>{choices.map(value=>
     <button key={value} type="button" aria-pressed={checked&&value===after}
      onClick={()=>verify(value)}>{nf.format(value)} {result.metrics[metricIndex][2]}</button>)}</div>
    {!checked&&<small>اختر الرقم الذي تراه في النتيجة الجديدة. إذا أخطأت يمكنك المحاولة من جديد.</small>}
   </div>}
  {checked&&<Done>{activity.explain} قارنت نتيجة النموذج بالقيم الأصلية، ويمكنك بدء الاختبار.</Done>}
  <button className={styles.exerciseReset} type="button" onClick={()=>{setX(activity.x.initial);setY(activity.y.initial);setChecked(false);}}>
   <RefreshCw size={15}/> إعادة القيم الأصلية
  </button>
 </div>;
}
function CaseExercise({activity,onComplete}){
 const [selected,setSelected]=useState(null);
 const correct=selected===activity.correctIndex;
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <div className={styles.exerciseChoices}>{activity.choices.map((choice,i)=>
   <button type="button" aria-pressed={selected===i} key={choice}
    onClick={()=>{setSelected(i);if(i===activity.correctIndex)onComplete?.({kind:'case',selection:i});}}>
    <span className={styles.choiceIndex}>{i+1}</span>{choice}
   </button>)}</div>
  {selected!==null&&(correct?
   <Done><strong>تحليل الحالة:</strong> {activity.explain} فهمت العلاقة الصحيحة بين المعطيات والنتيجة.</Done>:
   <p className={styles.warning} role="status">هذا الخيار لا يجيب عن الموقف بدقة. اقرأ المعطيات من جديد، ثم جرّب إجابة أخرى؛ لا تخسر أي نقاط في المختبر.</p>)}
 </div>;
}
function PathsExercise({activity,onComplete}){
 const [visited,setVisited]=useState([]);
 const [selected,setSelected]=useState(null);
 const explore=i=>{
  setSelected(i);
  if(!visited.includes(i)){
   const next=[...visited,i];
   setVisited(next);
   if(next.length===activity.choices.length)onComplete?.({kind:'paths',visited:next});
  }
 };
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>{activity.question}</p>
  <p className={styles.exerciseProgress}>استكشفت {visited.length} من {activity.choices.length} جوانب. اقرأ أثر كل جانب لتفهم المقارنة كاملة.</p>
  <div className={styles.pathGrid}>{activity.choices.map(([title,description],i)=>
   <button type="button" aria-pressed={selected===i} key={title} onClick={()=>explore(i)}>
    <span>{visited.includes(i)?'✓ ':''}{title}</span>
    <small>{visited.includes(i)?description:'اضغط لقراءة أثر هذا الجانب'}</small>
   </button>)}</div>
  {visited.length===activity.choices.length&&<Done>{activity.explain} شاهدت آثار جميع البدائل؛ ليس هناك رأي سياسي يُحتسب صحيحًا أو خاطئًا هنا.</Done>}
 </div>;
}
function StepsExercise({activity,onComplete}){
 const [chosen,setChosen]=useState([]),[feedback,setFeedback]=useState('');
 const order=[...activity.steps.keys()].sort((a,b)=>((a+2)%activity.steps.length)-((b+2)%activity.steps.length));
 const addStep=i=>{
  if(chosen.includes(i))return;
  if(i!==chosen.length){setFeedback('هذا الإجراء ليس التالي في هذا المثال. ارجع إلى التسلسل واشرح لنفسك سبب ترتيب الخطوات.');return;}
  const next=[...chosen,i];
  setChosen(next);setFeedback('');
  if(next.length===activity.steps.length)onComplete?.({kind:'steps',order:next});
 };
 return <div className={styles.exerciseWork}>
  <p className={styles.exercisePrompt}>رتّب الإجراءات من البداية إلى النهاية. الخيارات مختلطة، وأنت تختار ترتيبها الصحيح.</p>
  <p className={styles.exerciseProgress}>أنجزت {chosen.length} من {activity.steps.length} خطوات.</p>
  <div className={styles.sequenceBoard}>{activity.steps.map((step,i)=>
   <span className={chosen.includes(i)?styles.sequenceDone:styles.sequencePending} key={step}>
    {i+1}. {chosen.includes(i)?step:'بانتظار اختيار الإجراء'}
   </span>)}</div>
  <div className={styles.exerciseChoices}>{order.map(i=>
   <button type="button" key={i} disabled={chosen.includes(i)} onClick={()=>addStep(i)}>{activity.steps[i]}</button>)}</div>
  {feedback&&<p className={styles.warning} role="status">{feedback}</p>}
  {chosen.length===activity.steps.length&&<Done>{activity.explain}</Done>}
  <button type="button" className={styles.exerciseReset} onClick={()=>{setChosen([]);setFeedback('');}}>
   <RefreshCw size={15}/> إعادة الترتيب
  </button>
 </div>;
}
function GenericCivicLab({lab,onComplete}){
 const config=CIVIC_LABS[lab?.model];
 const [x,setX]=useState(config?.x.initial??0),[y,setY]=useState(config?.y.initial??0),[confirmed,setConfirmed]=useState(false);
 const result=useMemo(()=>{
  if(!config)return null;
  try{return calculateCivicLab(lab.model,{x,y});}catch{return null;}
 },[config,lab.model,x,y]);
 const initial=useMemo(()=>config?calculateCivicLab(lab.model,{x:config.x.initial,y:config.y.initial}):null,[config,lab.model]);
 if(!config)return <p role="alert">المختبر غير متاح.</p>;
 const changed=Boolean(result&&initial&&JSON.stringify(result.rows)!==JSON.stringify(initial.rows));
 return <section className={styles.lab}>
  <h3>{lab.scenario||config.title}</h3><p>قارن القيم الأصلية بالنتائج، ثم أكد فهمك للفروق قبل الاختبار.</p>
  <div className={styles.numberFields}>{[['x',x,config.x],['y',y,config.y]].map(([axis,value,control])=>
   <label key={axis} className={styles.numberField}>
    <span>{control.label} <strong>{value}</strong></span>
    <input type="range" min={control.min} max={control.max} step={control.step} value={value}
     onChange={e=>{if(axis==='x')setX(Number(e.target.value));else setY(Number(e.target.value));setConfirmed(false);}}/>
   </label>)}</div>
  {result?<div className={styles.exerciseMetrics}>{result.rows.map(([name,val])=>
   <div key={name} className={styles.exerciseMetric}><span>{name}</span><strong>{val}</strong></div>)}</div>:
   <p className={styles.warning}>أعد توزيع القيم إلى نطاق صالح.</p>}
  {changed&&!confirmed&&<button type="button" className={styles.confirmButton}
   onClick={()=>{setConfirmed(true);onComplete?.({kind:'model',x,y});}}>
   قارنت النتيجتين وفهمت الفرق <CheckCircle2 size={17}/></button>}
  {confirmed&&result&&<Done>{result.conclusion}</Done>}
  <p className={styles.exerciseLimit}>{config.note}</p>
 </section>;
}
export default function CivicLab({lab,slug,index,onComplete}){
 const activity=lab?.activity||getCivicActivity(slug,index);
 if(!activity)return <GenericCivicLab lab={lab} onComplete={onComplete}/>;
 return <section className={styles.lab} aria-label={'نشاط عملي: '+activity.title}>
  <div className={styles.labTitle}><Landmark size={23}/><div>
   <span className={styles.activityEyebrow}>{activity.kind==='numbers'?'احسب وتحقق من النتيجة':activity.kind==='paths'?'استكشف جميع البدائل':activity.kind==='steps'?'رتّب الإجراءات':'حلّل الموقف'}</span>
   <h3>{activity.title}</h3>
  </div></div>
  <p className={styles.activityStory}>{activity.story}</p>
  {activity.kind==='numbers'&&<NumberExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='case'&&<CaseExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='paths'&&<PathsExercise activity={activity} onComplete={onComplete}/>}
  {activity.kind==='steps'&&<StepsExercise activity={activity} onComplete={onComplete}/>}
  <p className={styles.exerciseLimit}>هذه محاكاة تعليمية مبسطة، لا تحكم على الأشخاص أو الآراء السياسية ولا تمنح نقاطًا. المطلوب هو الفهم وتنفيذ النشاط كاملًا.</p>
  <span className={styles.exerciseContinue}><ArrowLeft size={16}/> بعد اكتمال النشاط يمكنك بدء أسئلة الفهم</span>
 </section>;
}
