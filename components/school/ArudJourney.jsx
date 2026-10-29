'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BookOpen,CheckCircle2,GraduationCap,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {ARUD_STAGES} from '@/lib/schoolArud';
import styles from '@/app/school/writing/arud/arud.module.css';
export default function ArudJourney(){
 const [loadState,setLoadState]=useState({status:'loading',progress:null,message:''});
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;
  async function refresh(){
   try{
    const db=browserDb(),{data}=await db?.auth.getSession()||{};
    const token=data?.session?.access_token;
    if(!token){if(active)setLoadState({status:'guest',progress:null,message:''});return;}
    const res=await fetch('/api/school/arud',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const json=await res.json();
    if(!active)return;
    if(res.status===401){setLoadState({status:'guest',progress:null,message:''});return;}
    if(!res.ok)throw Error(json.error||'تعذر تحميل التقدم');
    setLoadState({status:'ready',progress:json.progress,message:''});
   }catch(error){if(active)setLoadState({status:'error',progress:null,message:error.message||'تعذر الاتصال بالخادم'});}
  }
  refresh();
  const db=browserDb();
  let queued;
  const sub=db?.auth.onAuthStateChange(()=>{clearTimeout(queued);queued=setTimeout(()=>{if(active)refresh();},0);}).data.subscription;
  return()=>{active=false;clearTimeout(queued);sub?.unsubscribe();};
 },[revision]);
 const {progress,status,message}=loadState;
 return <section id="arud-stages" className={styles.journey} aria-labelledby="arud-stages-title"><div className="container">
  <div className={styles.sectionIntro}><div><span>خارطة الإتقان / ARUD 967</span><h2 id="arud-stages-title">ست محطات من الصوت إلى البحر</h2></div><p>لا تنتقل إلى المرحلة التالية إلا بعد إتقان السابقة. يمكنك الإعادة بلا خصم أو عقوبة.</p></div>
  {status==='guest'&&<div className={styles.notice}><GraduationCap size={24}/><div><strong>أكمل رحلتك بحسابك</strong><p>لتبدأ التمارين وتحفظ النتائج، سجّل الدخول إلى 967.</p></div><Link href="/login">تسجيل الدخول <ArrowLeft size={16}/></Link></div>}
  {status==='error'&&<div className={styles.notice} role="alert"><p>{message}</p><button type="button" onClick={()=>setRevision(n=>n+1)}>إعادة التحميل <RefreshCw size={16}/></button></div>}
  {status==='ready'&&progress?.staffPreview&&<div className={styles.staffNotice}><ShieldCheck size={23}/><div><strong>معاينة الإدارة متاحة</strong><p>يمكنك الدخول مباشرة إلى أي محطة للتجربة، دون تغيير شروط التقدّم للطلاب.</p></div></div>}
  <div className={styles.progressSummary}><span><CheckCircle2 size={17}/> {progress?.completed?.length??0} / {ARUD_STAGES.length} محطات مكتملة</span><span>{progress?.finished?'اكتمل مسار العروض':'الخطوة التالية تفتح بعد النجاح'}</span></div>
  <div className={styles.stationGrid}>{ARUD_STAGES.map((s,i)=>{
   const record=progress?.stages?.[i];
   const completed=Boolean(record?.completed),locked=status==='ready'&&Boolean(record?.locked);
   const staffOnly=Boolean(progress?.staffPreview)&&i>progress.unlocked&&!completed;
   const visual=<><span className={styles.stationIndex} dir="ltr">{String(i+1).padStart(2,'0')}</span><span className={styles.stationStatus}>{completed?<CheckCircle2 size={17}/>:locked?<LockKeyhole size={17}/>:staffOnly?<ShieldCheck size={17}/>:<BookOpen size={17}/>} {completed?'مكتملة':locked?'مقفلة':staffOnly?'معاينة إدارية':'جاهزة للتعلّم'}</span><h3>{s.title}</h3><p>{s.summary}</p><div className={styles.stationBottom}><span>{s.duration}</span><span>{record?.best?record.best+' / 6':''}</span>{!locked&&<ArrowLeft size={18}/>}</div></>;
   return locked?<article key={s.id} className={styles.stationLocked} aria-label={s.title+' مقفلة'}>{visual}</article>:<Link key={s.id} className={completed?styles.stationDone:styles.station} href={'/school/writing/arud/'+(i+1)}>{visual}</Link>;
  })}</div>
  <p className={styles.journeyNote}>المحطات الأربع الأولى تأسيسية، وتليها محطتان تطبيقيتان على أشطر شعرية موثقة وبحورها. سنوسّع المسار لاحقًا إلى الزحافات والعلل.</p>
 </div></section>;
}
