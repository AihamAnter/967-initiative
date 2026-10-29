'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,RotateCcw,XCircle} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import useSchoolDraft from './useSchoolDraft';
import styles from '@/app/school/studio/studio.module.css';
async function requestGeneric(body){
 const db=browserDb(),{data,error}=await db?.auth.getSession()||{};
 if(error||!data?.session?.access_token)throw Error('سجّل الدخول لبدء المحطة وحفظ تقدمك.');
 const res=await fetch('/api/school/custom',{method:'POST',cache:'no-store',headers:{
  Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'
 },body:JSON.stringify(body)});
 const result=await res.json();
 if(!res.ok)throw Error(result.error||'تعذر إجراء المحاولة.');
 return result;
}
export default function GenericSchoolLesson({slug,stage,hasNext}){
 const [phase,setPhase]=useState('intro'),[attempt,setAttempt]=useState(null),
  [index,setIndex]=useState(0),[answers,setAnswers]=useState([]),[selection,setSelection]=useState(null),
  [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const resultTitle=useRef(null);
 const draft=useSchoolDraft({attempt,active:phase==='play',answers,selection,
  request:body=>requestGeneric({...body,slug})});
 useEffect(()=>{if(phase==='done')resultTitle.current?.focus();},[phase]);
 async function start(){
  setBusy(true);setError('');
  try{
   const data=await requestGeneric({action:'start',slug,stage:stage.index});
   setAttempt(data.attempt);setAnswers(data.attempt.draft?.answers||[]);
   setIndex(data.attempt.draft?.answers?.length||0);
   setSelection(data.attempt.draft?.selection??null);setResult(null);setPhase('play');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function next(){
  const task=attempt?.questions?.[index];
  if(!task||!Number.isInteger(selection)||busy)return;
  const all=[...answers,{id:task.id,choice:selection}];
  setBusy(true);setError('');
  try{
   if(index===5){
    const result=await requestGeneric({action:'submit',slug,attemptId:attempt.id,answers:all});
    setResult(result);setPhase('done');
   }else{
    await draft.save({answers:all,selection:null});
    setAnswers(all);setIndex(index+1);setSelection(null);
   }
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const task=attempt?.questions?.[index];
 return <div className={styles.genericLesson}>
  <Link className={styles.back} href={'/school/courses/'+slug}><ArrowRight size={16}/> العودة إلى المسار</Link>
  <h1>{stage.title}</h1><p>{stage.subtitle}</p>
  {phase==='intro'&&<section className={styles.lessonCard}>
   <h2><BookOpen size={21}/> قبل أن تبدأ</h2><p>{stage.intro}</p>
   <ul>{stage.tips.map((t,i)=><li key={i}>{t}</li>)}</ul>
   <p>ستة أسئلة اختيار من متعدد، تحتاج إلى خمس إجابات صحيحة لاجتياز المحطة.</p>
   <button type="button" disabled={busy} onClick={start}>ابدأ اختبار المحطة <ArrowLeft size={17}/></button>
  </section>}
  {phase==='play'&&task&&<section className={styles.lessonCard}>
   <div className={styles.questionMeta}>السؤال {index+1} من 6 · {draft.status||'حفظ تلقائي'}</div>
   <h2>{task.prompt}</h2>{task.target&&<p className={styles.target}>{task.target}</p>}
   <div className={styles.genericChoices}>{task.options.map((o,i)=><button type="button"
    key={i} aria-pressed={selection===i} disabled={busy} onClick={()=>setSelection(i)}>{o}</button>)}</div>
   <button type="button" disabled={busy||!Number.isInteger(selection)} onClick={next}>
    {index===5?'إنهاء وتصحيح':'السؤال التالي'} <ArrowLeft size={17}/></button>
  </section>}
  {phase==='done'&&result&&<section className={styles.lessonCard}>
   <h2 ref={resultTitle} tabIndex={-1}><CheckCircle2 size={25}/>{result.passed?'أحسنت، اجتزت المحطة!':'يمكنك التدريب مجددًا'}</h2>
   <strong>{result.score} من {result.total}</strong>
   {result.review.map((r,i)=><div className={styles.answerReview} key={r.id}>
    <strong>{r.correct?<CheckCircle2 size={16}/>:<XCircle size={16}/>} سؤال {i+1}: {r.correct?'صحيح':'يحتاج إلى مراجعة'}</strong>
    <p>الإجابة: {r.answer}</p><p>{r.explanation}</p>
   </div>)}
   <div className={styles.lessonActions}><button type="button" onClick={start}><RotateCcw size={17}/> إعادة المحاولة</button>
    {result.passed&&hasNext&&<Link href={'/school/courses/'+slug+'/'+(stage.index+2)}>المحطة التالية <ArrowLeft size={17}/></Link>}
   </div>
  </section>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </div>;
}
