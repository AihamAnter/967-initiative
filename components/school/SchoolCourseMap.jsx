'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,CheckCircle2,LockKeyhole,BookOpen,ShieldCheck,LogIn,UserRoundPlus,Route,Flag,Compass,Sparkles} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import styles from './SchoolCourseMap.module.css';

export default function SchoolCourseMap({slug,stages}){
 const [state,setState]=useState({loading:true,error:'',data:null,authRequired:false});
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const db=browserDb();
    if(!db)throw Error('تعذر الاتصال بنظام الحسابات.');
    const {data:auth,error}=await db.auth.getSession();
    if(error)throw error;
    if(!auth?.session?.access_token){
     if(active)setState({loading:false,error:'',data:null,authRequired:true});
     return;
    }
    const resp=await fetch('/api/school/custom?slug='+encodeURIComponent(slug),{cache:'no-store',headers:{
     Authorization:'Bearer '+auth.session.access_token
    }});
    const result=await resp.json();
    if(!resp.ok)throw Error(result.error||'تعذر قراءة تقدم المسار.');
    if(active)setState({loading:false,error:'',data:result,authRequired:false});
   }catch(e){
    if(active)setState({loading:false,error:e?.message||'تعذر الاتصال.',data:null,authRequired:false});
   }
  }
  load();
  return()=>{active=false;};
 },[slug]);
 const summary=state.data;
 const done=summary?.stages.filter(s=>s.completed).length||0;
 const nextInfo=summary?.stages.find(item=>!item.completed&&!item.locked);
 const nextStage=stages.find(item=>item.index===nextInfo?.index);
 const isFinished=Boolean(summary?.stages.length&&done===summary.stages.length);
 const returnPath='/school/courses/'+slug;
 const loginHref='/login?next='+encodeURIComponent(returnPath);
 const registerHref='/register?next='+encodeURIComponent(returnPath);
 return <div className={styles.courseMap}>
  {summary&&<section className={styles.courseProgress} aria-label="تقدمك في مسار المدرسة">
   <div className={styles.progressHeading}><span className={styles.progressIcon}><Compass size={25}/></span><div className={styles.progressCopy}><span>سجل رحلتك</span><strong>{done} من {summary.stages.length} محطة متقنة</strong><p>{isFinished?'أكملت المحطات المنشورة في هذا المسار. يمكنك مراجعتها في أي وقت.':nextStage?'المحطة المتاحة التالية: '+nextStage.title:'تابع استكشاف المحطات المتاحة لك.'}</p>{summary.staffPreview&&<small><ShieldCheck size={14}/> الإدارة تستطيع معاينة المحطات، ولا يُحتسب ذلك تقدمًا.</small>}</div></div>
   {nextStage&&<Link className={styles.courseContinue} href={'/school/courses/'+slug+'/'+(nextStage.index+1)}>تابع الرحلة <ArrowLeft size={17}/></Link>}
   <div className={styles.courseTrack} role="progressbar" aria-valuenow={done}
    aria-valuemin={0} aria-valuemax={summary.stages.length} aria-label="تقدم المسار">
    <span style={{width:summary.stages.length?(done/summary.stages.length*100)+'%':'0%'}}/></div>
  </section>}
  {state.authRequired&&<section className={styles.courseAuthBox} aria-label="الدخول إلى المدرسة">
   <h3>ابدأ رحلتك التعليمية في مدرسة 967</h3>
   <p>قم بإنشاء حساب أو تسجيل الدخول للتعلّم، وفتح المحطات بالتدرّج وحفظ نتائجك ونقاطك.</p>
   <div className={styles.courseAuthActions}>
    <Link href={registerHref}><UserRoundPlus size={17}/> إنشاء حساب</Link>
    <Link href={loginHref}><LogIn size={17}/> تسجيل الدخول</Link>
   </div>
  </section>}
  {state.loading&&<p role="status" className={styles.muted}>جارٍ تحميل المحطات المتاحة من حسابك…</p>}
  {state.error&&<p role="alert" className={styles.error}>تعذر تحميل تقدمك: {state.error} — يُرجى إعادة تحميل الصفحة.</p>}
  <header className={styles.routeHead}><div><span><Route size={17}/> طريق المحطات</span><h3>تقدّم محطة بعد محطة</h3><p>المحطات الخضراء متاحة للتعلّم، والرمادية تُفتح عند إتقان ما قبلها.</p></div><div className={styles.routeHeadBadge}><Flag size={17}/>{stages.length} محطة</div></header>
  <ol className={styles.courseTimeline}>
   {stages.map(stage=>{
    const info=summary?.stages.find(s=>s.index===stage.index);
    const completed=Boolean(info?.completed);
    const guest=state.authRequired;
    const locked=!info||info.locked;
    const available=!state.loading&&!state.error&&!guest&&!locked;
    const label=completed?'مكتملة':guest?'قم بإنشاء حساب أو تسجيل الدخول للتعلم':
     state.loading?'جارٍ التحقق من حالة المحطة':
     state.error?'لم نتمكن من تحديد حالة المحطة':
     locked?'مقفلة — أكمل السابقة أولًا':'جاهزة للتعلم';
    const content=<>
     <span className={styles.timelineIndex}>{completed?<CheckCircle2 size={21}/>:available?<BookOpen size={20}/>:<LockKeyhole size={20}/>}</span>
     <span className={styles.timelineBody}><strong>المحطة {stage.index+1}: {stage.title}</strong>
      <small>{stage.subtitle}</small><em>{label}</em></span>
     {available&&<ArrowLeft size={19} aria-hidden="true"/>}
    </>;
    return <li key={stage.index} className={[styles.timelineStage,completed?styles.timelineDone:'',available?styles.timelineOpen:''].join(' ')}>
     <span className={styles.timelineNode} aria-hidden="true">{completed?<CheckCircle2 size={20}/>:available?<Sparkles size={19}/>:String(stage.index+1).padStart(2,'0')}</span>
     {available?<Link href={'/school/courses/'+slug+'/'+(stage.index+1)}>{content}</Link>:
      <div aria-label={guest?'يجب إنشاء حساب أو تسجيل الدخول':label}>{content}</div>}
    </li>;
   })}
  </ol>
  <div className={styles.courseLegend} aria-label="دليل ألوان المحطات"><span>متاحة</span><span>مكتملة</span><span>مقفلة</span></div>
 </div>;
}
