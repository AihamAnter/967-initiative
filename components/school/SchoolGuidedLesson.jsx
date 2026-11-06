'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,Compass,FlaskConical,Lightbulb,PenLine,Rocket,Route,BookmarkCheck,MessageCircleQuestion} from 'lucide-react';
import CalligraphyPracticePad from './CalligraphyPracticePad';
import CalligraphyExample from './CalligraphyExample';
import MorseLab from './MorseLab';
import LogicGatesLab from './LogicGatesLab';
import ScienceLab from './ScienceLab';
import CivicLab from './CivicLab';
import {schoolScriptForStage} from '@/lib/schoolCalligraphySamples';
import styles from '@/app/school/studio/studio.module.css';
import player from './LessonPlayer.module.css';
import {StepKicker,StepSegments,usePlayerTop} from './LessonParts';

function LessonIllustration({lesson,slug,script}){
 const example=String(lesson.example||'').trim();
 const steps=example.split(/\s*←\s*/).map(s=>s.trim()).filter(Boolean);
 const ordered=steps.length>=3&&steps.length<=7;
 const words=example.split(/\s+/).filter(Boolean);
 const isTerm=!ordered&&example.length<=32&&words.length<=2&&!/^(?:في|من|إلى|على|عند|إذا|ثم|ما)\s/.test(example)&&!/[.!؟]/.test(example);
 return <div className={styles.learningIllustration} aria-label="توضيح الدرس">
  {slug==='arabic-calligraphy'?<>
   <span className={styles.illustrationEyebrow}><PenLine size={15}/> شاهد شكل الحروف</span>
   <CalligraphyExample text={example} script={lesson.script||script}/>
  </>:ordered?<>
   <span className={styles.illustrationEyebrow}><Route size={15}/> خطوات عملية — اقرأها بالترتيب</span>
   <ol className={styles.learningSteps}>{steps.map((item,i)=><li key={i}><span>{i+1}</span><strong>{item}</strong></li>)}</ol>
  </>:isTerm?<>
   <span className={styles.illustrationEyebrow}><BookmarkCheck size={15}/> الكلمة التي تعلمتها</span>
   <strong className={styles.learningTerm} dir="auto">{example}</strong>
  </>:<>
   <span className={styles.illustrationEyebrow}><MessageCircleQuestion size={15}/> مثال يوضح الفكرة</span>
   <p className={styles.learningStory} dir="auto">{example}</p>
  </>}
  <div className={styles.learningHint}><Lightbulb size={16}/><p>{lesson.note}</p></div>
 </div>;
}
export default function SchoolGuidedLesson({slug,stage,busy,onStart,hasActiveAttempt=false}){
 const [step,setStep]=useState(0);
 const [labProof,setLabProof]=useState(null);
 const top=usePlayerTop(step);
 const labComplete=Boolean(labProof);
 const lessons=Array.isArray(stage.lessons)?stage.lessons:[];
 const hasPractice=Boolean(stage.practice||stage.lab);
 const script=stage.script||schoolScriptForStage(slug,stage.index);
 const total=1+lessons.length+(hasPractice?1:0);
 const isIntro=step===0,isPractice=hasPractice&&step===total-1;
 const lesson=!isIntro&&!isPractice?lessons[step-1]:null;
 const last=step===total-1;
 const requireExercise=['science','civic','morse','gates'].includes(stage.lab?.kind);
 return <section ref={top} className={player.player} aria-labelledby="guided-lesson-heading">
  <div className={player.progressRow}>
   <StepSegments total={total} current={step} label="تقدم شرح المحطة"/>
   <span className={player.count}>الخطوة {step+1} من {total}</span>
  </div>
  {isIntro&&<div className={player.card} key="overview">
   <StepKicker icon={Compass}>نبدأ من الصفر</StepKicker>
   <h2 id="guided-lesson-heading">ماذا سنفهم في هذه المحطة؟</h2>
   <p className={styles.guidedBody}>{stage.intro}</p>
   <h3 className={player.tipsTitle}><Lightbulb size={18}/> ما الذي ستتعلمه قبل الأسئلة؟</h3>
   <ol className={player.checklist}>{(stage.tips||[]).map((tip,i)=><li key={i}>{tip}</li>)}</ol>
  </div>}
  {lesson&&<div className={player.card} key={'lesson-'+step}>
   <StepKicker icon={Lightbulb} tone="gold">الشرح {step} من {lessons.length}</StepKicker>
   <h2 id="guided-lesson-heading">{lesson.title}</h2>
   <p className={styles.guidedBody}>{lesson.body}</p>
   <LessonIllustration lesson={lesson} slug={slug} script={script}/>
   {stage.source?.url&&<a className={styles.guidedScientificSource} href={stage.source.url}
    target="_blank" rel="noopener noreferrer">لمن يريد التوسع — {stage.lab?.kind==='civic'?'مرجع مؤسسي عام للمسار':'مرجع علمي للدرس'}: {stage.source.title}</a>}
  </div>}
  {isPractice&&<div className={player.card} key="practice">
   <StepKicker icon={stage.lab?FlaskConical:PenLine}>التطبيق العملي</StepKicker>
   <h2 id="guided-lesson-heading">{stage.lab?.kind==='civic'?'طبّق الفكرة على موقف من الحياة':stage.lab?.kind==='science'?'شاهد التجربة وغيّر شيئًا بنفسك':stage.lab?'تدرّب على ما تعلمته':'جرّب الكتابة بنفسك'}</h2>
   <p className={styles.guidedBody}>{stage.lab?.kind==='civic'?
    'اقرأ الموقف أولًا، ثم نفّذ النشاط المحدد له. بعض المحطات تطلب حسابًا، وبعضها ترتيب أحداث أو مقارنة اختيارات. سنشرح أثر ما تفعله قبل الانتقال إلى الاختبار.':
    stage.lab?.kind==='science'?'انظر إلى الرسم والنتيجة الأولى، ثم حرّك أحد المتغيرات وراقب ما تغير. كل محطة لها رسم أو حساب يشرح ظاهرة مختلفة، ولا تحتاج إلى تخمين نتيجة غير مفهومة.':
    stage.lab?'هذا تدريب يمكنك تكراره دون خصم نقاط. جرّب الفكرة بيدك، ثم راجع الشرح قبل الاختبار.':
    'بعد فهم القواعد والأمثلة، طبّق ما تعلمته في ورشة الكتابة. يمكنك مراجعة الخطوات السابقة في أي وقت. هذا تدريب حرّ، وليس اختبارًا لجمال الخط.'}</p>
   {stage.lab?.kind==='morse'&&<MorseLab sample={stage.lab.sample} onComplete={setLabProof}/>}
   {stage.lab?.kind==='gates'&&<LogicGatesLab gate={stage.lab.gate} onComplete={setLabProof}/>}
   {stage.lab?.kind==='science'&&<ScienceLab lab={stage.lab} source={stage.source} onComplete={setLabProof}/>}
   {stage.lab?.kind==='civic'&&<CivicLab lab={stage.lab} slug={slug} index={stage.index} onComplete={setLabProof}/>}
   {stage.practice&&<CalligraphyPracticePad practice={stage.practice} script={script} allowScriptChoice={slug==='arabic-calligraphy'&&stage.index===11} stageKey={slug+'-'+(stage.index+1)}/>}
  </div>}
  {last&&requireExercise&&!labComplete&&!hasActiveAttempt&&<p className={styles.guidedCaution}>أكمل النشاط أولًا: تأكد من تحليلك، واستكشف كل البدائل أو نتائج الحساب، أو أرسل رسالة مورس المطلوبة أو جرّب جميع حالات البوابة المنطقية.</p>}
  {last&&<div className={player.ready}><span className={player.readyIcon}><Rocket size={24} aria-hidden="true"/></span><div><strong>انتهى شرح الدرس، جاهز للتحدي؟</strong><p>الاختبار يقيس ما تعلمته وليس رأيك الشخصي، ويمكنك الرجوع إلى الشرح في أي وقت.</p><div className={player.facts}><span><CheckCircle2 size={14} aria-hidden="true"/> 6 أسئلة</span><span>5 إجابات صحيحة للنجاح</span></div></div></div>}
  <div className={player.bar}>
   <button type="button" className={player.prev} disabled={step===0||busy} onClick={()=>setStep(n=>Math.max(0,n-1))}>
    <ArrowRight size={17}/> السابق
   </button>
   {last?<button type="button" className={player.next} disabled={busy||(requireExercise&&!labComplete&&!hasActiveAttempt)} onClick={()=>onStart(labProof)}>
    {busy?'جارٍ بدء المحاولة…':hasActiveAttempt?'العودة إلى أسئلة المحاولة':'ابدأ الاختبار بعد الشرح'} <ArrowLeft size={17}/>
   </button>:<button type="button" className={player.next} disabled={busy}
    onClick={()=>setStep(n=>Math.min(total-1,n+1))}>
    {isIntro?'ابدأ شرح الدرس':'الشرح التالي'} <ArrowLeft size={17}/>
   </button>}
  </div>
 </section>;
}
