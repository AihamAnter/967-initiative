'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,Delete,RefreshCw,RotateCcw,ShieldCheck,XCircle} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import useSchoolDraft from './useSchoolDraft';
import {ARUD_STAGES} from '@/lib/schoolArud';
import styles from '@/app/school/writing/arud/arud.module.css';

async function requestArud(body){
 const db=browserDb(),{data,error}=await db?.auth.getSession()||{};
 if(error||!data?.session?.access_token)throw Error('يرجى تسجيل الدخول لبدء المحطة وحفظ التقدم.');
 const res=await fetch('/api/school/arud',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body)});
 const value=await res.json();
 if(!res.ok)throw Error(value.error||'تعذر تنفيذ الطلب.');
 return value;
}
export default function ArudLesson({stage}){
 const [phase,setPhase]=useState('intro');
 const [attempt,setAttempt]=useState(null);
 const [index,setIndex]=useState(0);
 const [selection,setSelection]=useState(null);
 const [answers,setAnswers]=useState([]);
 const [result,setResult]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [submitFailed,setSubmitFailed]=useState(false);
 const outcomeTitle=useRef(null);
 const draft=useSchoolDraft({attempt,active:phase==='exercise',answers,selection,request:requestArud});
 useEffect(()=>{if(phase==='result')outcomeTitle.current?.focus();},[phase]);
 async function start(){
  if(busy)return;setBusy(true);setError('');setSubmitFailed(false);
  try{
   const data=await requestArud({action:'start',stage:stage.index});
   setAttempt(data.attempt);setPhase('exercise');setIndex(data.attempt.draft?.answers?.length||0);setSelection(data.attempt.draft?.selection??null);setAnswers(data.attempt.draft?.answers||[]);setResult(null);
  }catch(e){setError(e.message||'تعذر بدء المحطة.');}
  finally{setBusy(false);}
 }
 async function finish(all){
  setBusy(true);setError('');setSubmitFailed(false);
  try{
   const data=await requestArud({action:'submit',attemptId:attempt.id,answers:all});
   setResult(data);setPhase('result');
  }catch(e){setError(e.message||'تعذر حفظ النتيجة.');setSubmitFailed(true);}
  finally{setBusy(false);}
 }
 const task=phase==='exercise'?attempt?.questions?.[index]:null;
 const ready=task?.kind==='choice'?Number.isInteger(selection):task?.kind==='sequence'&&Array.isArray(selection)&&(task.steps?selection.length===task.steps:selection.length>0&&selection.length<=8);
 async function next(){
  if(!task||!ready||busy)return;
  const all=[...answers,{id:task.id,choice:selection}];
  setAnswers(all);
  if(index===attempt.questions.length-1){finish(all);return;}
  setBusy(true);
  try{await draft.save({answers:all,selection:null});setIndex(i=>i+1);setSelection(null);}
  catch(e){setError(e.message||'تعذر حفظ التقدم؛ أعد المحاولة.');}
  finally{setBusy(false);}
 }
 const isScansion=stage.index===1;
 const isRealVerse=(stage.index===4||stage.index===5||stage.index===6);
 const isFeet=stage.index===4||stage.index===6;
 const sequenceLimit=task?.steps||8;
 return <article className={styles.lessonLayout}>
  <div className={styles.lessonHeading}><div><span>مدرسة 967 · علم العروض · المحطة {String(stage.index+1).padStart(2,'0')}</span><h1>{stage.title}</h1><p>{stage.subtitle}</p></div><Link href="/school/writing/arud">خارطة المحطات <ArrowRight size={17}/></Link></div>
  {phase==='intro'&&<>
   <div className={styles.lessonIntro}><span>الفكرة الأساسية</span><h2>{stage.title}</h2><p>{stage.intro}</p></div>
   <div className={styles.lessonStudy}><section><h3>تذكّر قبل التمرين</h3><ul>{stage.tips.map(x=><li key={x}>{x}</li>)}</ul></section>
   <section><h3>ثلاثة أمثلة توضّح القاعدة</h3><div className={styles.examples}>{stage.examples.map(x=><div key={x.label}><strong>{x.label}</strong><small>{x.note}</small></div>)}</div></section></div>
   <div className={styles.lessonStart}><div><strong>اختبار إتقان المهارة</strong><p>6 أسئلة متنوعة؛ تحتاج إلى 5 صحيحة للانتقال، ويمكن إعادة المحاولة بأسئلة مختلفة.</p></div><button type="button" disabled={busy} onClick={start}>{busy?'جارٍ التحضير…':'ابدأ التدريب'} <ArrowLeft size={18}/></button></div>
  </>}
  {phase==='exercise'&&attempt&&<>
   <div className={styles.questionStatus}><span>السؤال {index+1} من {attempt.questions.length}</span><span>المحاولة {attempt.attemptNo}</span></div>
   <div className={styles.meterProgress} role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={index} aria-label="تقدّم التمارين"><span style={{width:(index/6*100)+'%'}}/></div>
   <p className={styles.draftStatus} role="status">حفظ التقدم: {draft.status||'تلقائي عند الإجابة والمتابعة'}</p>
   <section className={styles.question}>
    <span className={styles.questionKind}>{task.kind==='choice'?'تعرّف على القاعدة':'تمرين تقطيع تفاعلي'}</span>
    <h2>{task.prompt}</h2>
    {task.target&&<div className={task.target.includes('\n')?styles.fullVerseTarget:isRealVerse?styles.verseTarget:styles.wordTarget} dir={stage.index===3&&task.target.includes('—')?'ltr':'rtl'}>{task.target.includes('\n')?task.target.split('\n').map((line,i)=><p key={i}>{line}</p>):task.target}</div>}
    {task.attribution&&<p className={styles.poetAttribution}>الشاعر أو المرجع: {task.attribution}</p>}
    {task.example&&<aside className={styles.questionExample} aria-label="مثال توضيحي"><span><BookOpen size={17} aria-hidden="true"/> مثال يساعدك على الفهم</span><p>{task.example}</p></aside>}
    {task.kind==='choice'&&<div className={styles.answerList} role="group" aria-label="اختر إجابة واحدة">{task.options.map((option,i)=><button type="button" key={i} className={selection===i?styles.answerActive:styles.answer} aria-pressed={selection===i} onClick={()=>setSelection(i)}><span className={styles.optionIndex} dir="ltr">{String.fromCharCode(65+i)}</span><span>{option}</span>{selection===i&&<Check size={19}/>}</button>)}</div>}
    {task.kind==='sequence'&&<>
     <p className={styles.sequenceHint}>{isFeet?'رتّب التفعيلات بحسب النطق، من الصدر إلى العجز عند ظهور بيت كامل.':isScansion?'ابنِ سلسلة المتحرك والساكن من بداية الكلمة إلى نهايتها.':'اختر المقاطع القصيرة والطويلة بالترتيب الذي تنطق به الكلمة.'}</p>
     <div className={isFeet?styles.footBuilder:styles.patternBuilder} aria-live="polite">{Array.isArray(selection)&&selection.length?selection.map((x,i)=><span key={i}>{x}</span>):<small>ابدأ بإضافة أول رمز</small>}
      <button type="button" aria-label="حذف آخر رمز" disabled={!selection?.length} onClick={()=>setSelection(a=>a.slice(0,-1))}><Delete size={19}/></button></div>
     <div className={isFeet?styles.footKeys:styles.patternKeys}>{task.options.map(token=><button type="button" key={token} disabled={selection?.length>=sequenceLimit} onClick={()=>setSelection(a=>[...(a||[]),token])}><strong>{token}</strong><span>{isFeet?'تفعيلة':token==='/'?'متحرك':token==='0'?'ساكن':token==='ᴗ'?'قصير':'طويل'}</span></button>)}</div>
     <button className={styles.clearPattern} type="button" disabled={!selection?.length} onClick={()=>setSelection([])}>مسح السلسلة <RotateCcw size={15}/></button>
    </>}
    <footer className={styles.questionFooter}><p><ShieldCheck size={16}/> تظهر الإجابة المشروحة بعد إنهاء المحاولة، وليس أثناء الأسئلة.</p>
    {submitFailed?<button type="button" disabled={busy} onClick={()=>finish(answers)}>إعادة إرسال النتيجة <RefreshCw size={17}/></button>:<button type="button" disabled={!ready||busy} onClick={next}>{busy?'جارٍ التصحيح…':index===5?'إنهاء وتصحيح':'المتابعة'} <ArrowLeft size={18}/></button>}</footer>
   </section>
  </>}
  {phase==='result'&&result&&<section className={styles.outcome} aria-live="polite">
   <div className={result.passed?styles.outcomePassed:styles.outcomeRetry}>
    {result.passed?<CheckCircle2 size={35}/>:<RotateCcw size={35}/>}
    <h2 tabIndex={-1} ref={outcomeTitle}>{result.passed?'أتقنت هذه المحطة!':'أعد التدريب، اقتربت من الإتقان.'}</h2>
    <strong dir="ltr">{result.score} / {result.total}</strong>
    <p>{result.passed?'حُفظ تقدمك، وأصبحت المحطة التالية متاحة إذا لم تكن هذه آخر محطة.':'راجع تفسيرات الأسئلة، ثم جرّب مجموعة جديدة دون عقوبة.'}</p>
   </div>
   <h3>تعلم من إجاباتك</h3>
   <div className={styles.reviews}>{result.review.map((item,i)=><div key={item.id} className={item.correct?styles.reviewGood:styles.reviewBad}><strong>{item.correct?<CheckCircle2 size={18}/>:<XCircle size={18}/>} السؤال {i+1}: {item.correct?'صحيح':'يحتاج إلى مراجعة'}</strong><p>{item.explanation}</p></div>)}</div>
   <div className={styles.outcomeActions}>{result.passed?<Link className={styles.mainAction} href={stage.index<ARUD_STAGES.length-1?'/school/writing/arud/'+(stage.index+2):'/school/writing/arud'}>{stage.index<ARUD_STAGES.length-1?'المحطة التالية':'العودة إلى المسار'} <ArrowLeft size={17}/></Link>:<button type="button" disabled={busy} onClick={start}>إعادة المحاولة <RefreshCw size={17}/></button>}<Link href="/school/writing/arud">عودة للخارطة <ArrowRight size={17}/></Link></div>
  </section>}
  {error&&<p role="alert" className={styles.lessonError}>{error} {error.includes('الدخول')&&<Link href="/login">تسجيل الدخول</Link>}</p>}
 </article>;
}
