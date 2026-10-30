'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,Lightbulb,PenLine} from 'lucide-react';
import CalligraphyPracticePad from './CalligraphyPracticePad';
import styles from '@/app/school/studio/studio.module.css';

// The assessment is unreachable from the first screen when lesson panels exist.
// Intro -> explanation panels with worked examples -> freehand practice -> quiz.
export default function SchoolGuidedLesson({slug,stage,busy,onStart,hasActiveAttempt=false}){
 const [step,setStep]=useState(0);
 const lessons=Array.isArray(stage.lessons)?stage.lessons:[];
 const hasPractice=Boolean(stage.practice);
 const total=1+lessons.length+(hasPractice?1:0);
 const isIntro=step===0,isPractice=hasPractice&&step===total-1;
 const lesson=!isIntro&&!isPractice?lessons[step-1]:null;
 const last=step===total-1;
 return <section className={styles.guidedLesson} aria-labelledby="guided-lesson-heading">
  <div className={styles.guidedTop}>
   <span className={styles.guidedEyebrow}><BookOpen size={16}/> تعلّم أولًا، ثم اختبر فهمك</span>
   <span className={styles.guidedCount}>الخطوة {step+1} من {total}</span>
  </div>
  <div className={styles.guidedTrack} role="progressbar" aria-label="تقدم شرح المحطة"
   aria-valuemin={0} aria-valuemax={total} aria-valuenow={step+1}>
   <span style={{width:((step+1)/total*100)+'%'}}/>
  </div>
  {isIntro&&<div className={styles.guidedPage} key="overview">
   <span className={styles.guidedLabel}>تمهيد المحطة</span>
   <h2 id="guided-lesson-heading">ماذا ستتعلم؟</h2>
   <p className={styles.guidedBody}>{stage.intro}</p>
   <div className={styles.guidedTips}><h3><Lightbulb size={18}/> تذكر أثناء التعلم</h3>
    <ul>{(stage.tips||[]).map((tip,i)=><li key={i}>{tip}</li>)}</ul>
   </div>
  </div>}
  {lesson&&<div className={styles.guidedPage} key={'lesson-'+step}>
   <span className={styles.guidedLabel}>الشرح {step} من {lessons.length}</span>
   <h2 id="guided-lesson-heading">{lesson.title}</h2>
   <p className={styles.guidedBody}>{lesson.body}</p>
   <div className={styles.guidedExample} aria-label="مثال مشروح">
    <span>مثال تطبيقي</span>
    <strong dir="rtl">{lesson.example}</strong>
    <p>{lesson.note}</p>
   </div>
  </div>}
  {isPractice&&<div className={styles.guidedPage} key="practice">
   <span className={styles.guidedLabel}><PenLine size={16}/> التطبيق العملي</span>
   <h2 id="guided-lesson-heading">جرّب الكتابة بنفسك</h2>
   <p className={styles.guidedBody}>بعد فهم القواعد والأمثلة، طبّق ما تعلمته في ورشة الكتابة. يمكنك مراجعة الخطوات السابقة في أي وقت. هذا تدريب حرّ، وليس اختبارًا لجمال الخط.</p>
   <CalligraphyPracticePad practice={stage.practice} stageKey={slug+'-'+(stage.index+1)}/>
  </div>}
  {last&&<p className={styles.guidedReady}><CheckCircle2 size={18}/> انتهى الشرح والتطبيق. الاختبار التالي يقيس المعلومات التي تعلمتها هنا، ويمكنك العودة إلى الشرح متى احتجت.</p>}
  <div className={styles.guidedActions}>
   <button type="button" className={styles.guidedSecondary} disabled={step===0||busy} onClick={()=>setStep(n=>Math.max(0,n-1))}>
    <ArrowRight size={17}/> السابق
   </button>
   {last?<button type="button" className={styles.guidedPrimary} disabled={busy} onClick={onStart}>
    {busy?'جارٍ بدء المحاولة…':hasActiveAttempt?'العودة إلى أسئلة المحاولة':'ابدأ الاختبار بعد الشرح'} <ArrowLeft size={17}/>
   </button>:<button type="button" className={styles.guidedPrimary} disabled={busy}
    onClick={()=>setStep(n=>Math.min(total-1,n+1))}>
    {isIntro?'ابدأ شرح الدرس':'الشرح التالي'} <ArrowLeft size={17}/>
   </button>}
  </div>
 </section>;
}
