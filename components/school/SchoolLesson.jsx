'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,Check,CheckCircle2,ChevronLeft,Delete,ExternalLink,LockKeyhole,RefreshCw,RotateCcw,Send,ShieldCheck,XCircle} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {MUSNAD_SOURCE} from '@/lib/schoolMusnad';
import styles from '@/app/school/school.module.css';

async function requestSchool(payload){
 const db=browserDb();
 const {data,error}=await db?.auth.getSession()||{};
 if(error||!data?.session?.access_token)throw Error('سجّل الدخول لحفظ تقدمك وبدء الاختبارات.');
 const response=await fetch('/api/school/musnad',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},
  body:JSON.stringify(payload),cache:'no-store'
 });
 const json=await response.json();
 if(!response.ok)throw Error(json.error||'تعذر إكمال العملية.');
 return json;
}
export default function SchoolLesson({stage}){
 const [phase,setPhase]=useState('intro');
 const [attempt,setAttempt]=useState(null);
 const [step,setStep]=useState(0);
 const [chosen,setChosen]=useState(null);
 const [responses,setResponses]=useState([]);
 const [result,setResult]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [submitFailed,setSubmitFailed]=useState(false);
 const resultTitle=useRef(null);
 useEffect(()=>{if(phase==='done')resultTitle.current?.focus();},[phase]);
 async function start(){
  if(busy)return;
  setBusy(true);setError('');setSubmitFailed(false);
  try{
   const data=await requestSchool({action:'start',stage:stage.index});
   setAttempt(data.attempt);setStep(0);setChosen(null);setResponses([]);setResult(null);setPhase('play');
  }catch(e){setError(e.message||'تعذر بدء التدريب.');}
  finally{setBusy(false);}
 }
 async function submit(all){
  setBusy(true);setError('');setSubmitFailed(false);
  try{
   const data=await requestSchool({action:'submit',attemptId:attempt.id,answers:all});
   setResult(data);setPhase('done');
  }catch(e){setError(e.message||'تعذر حفظ النتيجة.');setSubmitFailed(true);}
  finally{setBusy(false);}
 }
 function next(){
  const task=attempt?.questions?.[step];
  if(!task||busy)return;
  const complete=task.kind==='choice'?Number.isInteger(chosen):Array.isArray(chosen)&&chosen.length===task.target.split(' ← ').length;
  if(!complete)return;
  const all=[...responses,{id:task.id,choice:chosen}];
  setResponses(all);
  if(step===attempt.questions.length-1){submit(all);return;}
  setStep(v=>v+1);setChosen(null);setError('');
 }
 const task=phase==='play'?attempt?.questions?.[step]:null;
 const desired=task?.kind==='compose'?task.target.split(' ← ').length:0;
 const ready=task?.kind==='choice'?Number.isInteger(chosen):task?.kind==='compose'&&Array.isArray(chosen)&&chosen.length===desired;
 return <article className={styles.lessonShell}>
  <div className={styles.lessonTop}><div><span className={styles.lessonEyebrow}>مدرسة 967 / المسند / المحطة {String(stage.index+1).padStart(2,'0')}</span><h1>{stage.title}</h1><p>{stage.subtitle}</p></div>
  <Link href="/school/writing/musnad" className={styles.backCourse}>خارطة الرحلة <ArrowRight size={17}/></Link></div>
  {phase==='intro'&&<section className={styles.introLesson}>
   <div className={styles.lessonIntroBanner}><span>مقدمة المحطة</span><h2>{stage.title}</h2><p>{stage.intro}</p></div>
   <div className={styles.lessonLearning}><div><h3><BookOpen size={19}/> قبل أن تبدأ</h3><ul>{stage.tips.map(t=><li key={t}>{t}</li>)}</ul></div>
    {stage.letters.length>0&&<div><h3>حروف هذه المحطة</h3><div className={styles.letterTable}>{stage.letters.map(([glyph,name,latin])=><div key={glyph}><strong className={styles.glyph} lang="und">{glyph}</strong><span>{name}</span><small dir="ltr">{latin}</small></div>)}</div></div>}
    {stage.letters.length===0&&<div className={styles.exampleSequence}><span>مثال على ترتيب الحروف</span><strong className={styles.glyph} dir="rtl">𐩣𐩡</strong><small>ميم ← لام</small></div>}
   </div>
   <div className={styles.lessonLaunch}><div><strong>اختبار الإتقان</strong><p>6 تمارين؛ 5 إجابات صحيحة للنجاح. إن لم تنجح، يمكنك المحاولة بمجموعة أخرى من الأسئلة.</p></div><button type="button" onClick={start} disabled={busy}>{busy?'جارٍ تجهيز المحطة…':'ابدأ المحطة'} <ArrowLeft size={18}/></button></div>
   <a href={MUSNAD_SOURCE} target="_blank" rel="noopener noreferrer" className={styles.lessonSource}>المرجع العلمي للخط <ExternalLink size={15}/></a>
  </section>}
  {phase==='play'&&attempt&&<>
   <div className={styles.quizMeta}><span>السؤال {step+1} من {attempt.questions.length}</span><span>محاولة {attempt.attemptNo}</span></div>
   <div className={styles.quizProgress} role="progressbar" aria-label="تقدم أسئلة المحطة" aria-valuemin={0} aria-valuemax={attempt.questions.length} aria-valuenow={step}><span style={{width:(step/attempt.questions.length*100)+'%'}}/></div>
   <section className={styles.quizCard} aria-labelledby="school-question">
    <span className={styles.questionType}>{task.kind==='compose'?'تمرين تركيب الحروف':'تعرّف على الحرف'}</span>
    <h2 id="school-question">{task.prompt}</h2>
    {task.glyph&&<div className={styles.questionGlyph} lang="und">{task.glyph}</div>}
    {task.kind==='choice'&&<div className={styles.choiceGrid} role="group" aria-label="اختر إجابة واحدة">{task.options.map((value,index)=><button type="button" key={index} aria-pressed={chosen===index} className={chosen===index?styles.choiceSelected:styles.choice} onClick={()=>setChosen(index)}><span className={styles.choiceLetter} dir="ltr">{String.fromCharCode(65+index)}</span><span>{value}</span>{chosen===index&&<Check size={18}/>}</button>)}</div>}
    {task.kind==='compose'&&<>
     <div className={styles.targetText}><span>اكتب التسلسل:</span><strong>{task.target}</strong></div>
     <div className={styles.composeOutput}><div dir="rtl" className={styles.glyph}>{Array.isArray(chosen)&&chosen.length?chosen.map(id=>task.options.find(o=>o.id===id)?.glyph).join(''):'اختر الحروف بالترتيب'}</div><button type="button" aria-label="حذف آخر حرف" disabled={!Array.isArray(chosen)||!chosen.length} onClick={()=>setChosen(v=>v.slice(0,-1))}><Delete size={18}/></button></div>
     <div className={styles.glyphOptions}>{task.options.map(o=><button type="button" key={o.id} disabled={Array.isArray(chosen)&&chosen.length>=desired} onClick={()=>setChosen(v=>[...(Array.isArray(v)?v:[]),o.id])} aria-label={'إضافة حرف '+o.name}><strong className={styles.glyph}>{o.glyph}</strong><small>{o.name}</small></button>)}</div>
    </>}
    <div className={styles.quizFooter}><span><ShieldCheck size={16}/> تظهر الإجابات الصحيحة والتفسير بعد إكمال الأسئلة.</span>{submitFailed?<button type="button" disabled={busy} onClick={()=>submit(responses)}>{busy?'جارٍ الحفظ…':'إعادة إرسال النتيجة'} <RefreshCw size={18}/></button>:<button type="button" disabled={!ready||busy} onClick={next}>{busy?'جارٍ تصحيح المحطة…':step===attempt.questions.length-1?'إنهاء وتصحيح':'السؤال التالي'} <ArrowLeft size={18}/></button>}</div>
   </section>
  </>}
  {phase==='done'&&result&&<section className={styles.lessonResult} aria-live="polite">
   <div className={result.passed?styles.resultSuccess:styles.resultRetry}>
    {result.passed?<CheckCircle2 size={38}/>:<RotateCcw size={38}/>}
    <span>نتيجتك في المحطة {stage.index+1}</span>
    <h2 ref={resultTitle} tabIndex={-1}>{result.passed?'أحسنت! أتقنت هذه المحطة.':'قريب جدًا! لنتمرّن مرة أخرى.'}</h2>
    <strong>{result.score} / {result.total}</strong>
    <p>{result.passed?'تم حفظ نجاحك وفتح المحطة التالية، إن وُجدت.':'تحتاج إلى 5 إجابات صحيحة على الأقل. راجع الملاحظات ثم ابدأ محاولة بأسئلة مختلفة.'}</p>
   </div>
   <h3>مراجعة إجاباتك</h3><div className={styles.resultList}>{result.review.map((item,i)=><div key={item.id} className={item.correct?styles.reviewCorrect:styles.reviewWrong}><span>{item.correct?<CheckCircle2 size={19}/>:<XCircle size={19}/>} سؤال {i+1}: {item.correct?'صحيح':'يحتاج مراجعة'}</span><p>{item.explanation}</p></div>)}</div>
   <div className={styles.resultActions}>{result.passed?<Link className={styles.primaryLink} href={stage.index<2?'/school/writing/musnad/'+(stage.index+2):'/school/writing/musnad'}>{stage.index<2?'المرحلة التالية':'العودة إلى المسار'} <ArrowLeft size={18}/></Link>:<button type="button" disabled={busy} onClick={start}>أعد المحاولة بأسئلة جديدة <RefreshCw size={18}/></button>}<Link href="/school/writing/musnad">خارطة المراحل <ArrowRight size={17}/></Link></div>
  </section>}
  {error&&<p className={styles.lessonError} role="alert">{error} {error.includes('الدخول')&&<Link href="/login">تسجيل الدخول</Link>}</p>}
 </article>;
}
