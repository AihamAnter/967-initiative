'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BookOpenCheck,Check,CheckCircle2,ChevronLeft,GraduationCap,LockKeyhole,RefreshCw,Star,Trophy} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {MUSNAD_STAGES,MUSNAD_CHAPTERS} from '@/lib/schoolMusnad';
import styles from '@/app/school/school.module.css';

export default function SchoolJourney(){
 const [state,setState]=useState({kind:'loading',progress:null,error:''});
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  let alive=true;
  async function load(){
   try{
    const db=browserDb();
    const {data}=await db?.auth.getSession()||{};
    const token=data?.session?.access_token;
    if(!token){if(alive)setState({kind:'guest',progress:null,error:''});return;}
    const response=await fetch('/api/school/musnad',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const value=await response.json();
    if(!alive)return;
    if(response.status===401){setState({kind:'guest',progress:null,error:''});return;}
    if(!response.ok)throw Error(value.error||'تعذر تحميل التقدم');
    setState({kind:'ready',progress:value.progress,error:''});
   }catch(e){if(alive)setState({kind:'error',progress:null,error:e.message||'تعذر الاتصال'});}
  }
  load();
  const db=browserDb();
  let timeout=null;
  const subscription=db?.auth.onAuthStateChange(()=>{clearTimeout(timeout);timeout=setTimeout(()=>{if(alive)load();},0);}).data.subscription;
  return()=>{alive=false;clearTimeout(timeout);subscription?.unsubscribe();};
 },[version]);
 const progress=state.progress;
 return <section className={styles.journeySection} aria-labelledby="journey-title"><div className="container">
  <div className={styles.sectionTitle}><div><span>خارطة الإتقان / 967 SCHOOL</span><h2 id="journey-title">محطات رحلتك</h2></div><p>المرحلة التالية تُفتح بعد إجابة 5 أسئلة صحيحة على الأقل من أصل 6.</p></div>
  {state.kind==='guest'&&<div className={styles.schoolNotice}><GraduationCap size={25}/><div><strong>سجّل الدخول لتحفظ تقدّمك</strong><p>يمكنك تصفح المحطات، لكن بدء الاختبارات وفتح المراحل يحتاج حسابًا في 967.</p></div><Link href="/login">تسجيل الدخول <ArrowLeft size={16}/></Link></div>}
  {state.kind==='error'&&<div className={styles.schoolNotice} role="alert"><p>{state.error}</p><button type="button" onClick={()=>setVersion(v=>v+1)}>إعادة المحاولة <RefreshCw size={16}/></button></div>}
  <div className={styles.journeyMeta}><span><CheckCircle2 size={18}/> {progress?.completed?.length||0} / {MUSNAD_STAGES.length} مراحل مكتملة</span><span><Trophy size={18}/> {progress?.finished?'اكتمل المسار الأول!':'تعلّم حتى الإتقان'}</span></div>
  {MUSNAD_CHAPTERS.map(chapter=><section key={chapter.id} className={styles.journeyChapter} aria-label={'الفصل '+chapter.id+' '+chapter.title}>
   <div className={styles.chapterHeading}><div><span>الفصل {String(chapter.id).padStart(2,'0')}</span><h3>{chapter.title}</h3><p>{chapter.description}</p></div><span>{MUSNAD_STAGES.slice(chapter.start,chapter.end+1).filter(s=>progress?.completed?.includes(s.index)).length} / {chapter.end-chapter.start+1}</span></div>
   <div className={styles.pathGrid}>
   {MUSNAD_STAGES.slice(chapter.start,chapter.end+1).map(stage=>{
    const index=stage.index;
    const record=progress?.stages?.[index];
    const completed=Boolean(record?.completed);
    const locked=state.kind==='ready'&&Boolean(record?.locked);
    const available=state.kind!=='ready'||!locked;
    const Icon=completed?CheckCircle2:locked?LockKeyhole:BookOpenCheck;
    const content=<>
      <div className={styles.stationTop}><span>محطة {String(index+1).padStart(2,'0')}</span><span className={completed?styles.done:locked?styles.locked:styles.open}><Icon size={15}/>{completed?'مكتملة':locked?'مقفلة':'متاحة'}</span></div>
      <span className={styles.stationNumber} aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
      <div className={styles.stationCopy}><h3>{stage.title}</h3><p>{stage.summary}</p></div>
      <div className={styles.stationFoot}><span>{stage.duration}</span><span>{record?.attempts?record.attempts+' محاولات':''}</span>{available&&!locked?<ArrowLeft size={19}/>:<LockKeyhole size={16}/>}</div>
    </>;
    return locked?<article key={stage.id} className={styles.stationLocked} aria-label={stage.title+'، مقفلة'}>{content}</article>:<Link key={stage.id} href={'/school/writing/musnad/'+(index+1)} className={styles.station}>{content}</Link>;
   })}
   </div>
  </section>)}
  <div className={styles.pathEnd}><Star size={19}/> تنتقل من التعرّف على الحروف إلى إتقان الأبجدية كاملة، ثم ممارسة الكتابة والقراءة. للمراجعة يمكنك فتح دليل الحروف ولوحة التتبّع في أي وقت.</div>
 </div></section>;
}
