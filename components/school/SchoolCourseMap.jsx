'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,CheckCircle2,LockKeyhole,BookOpen,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import styles from '@/app/school/studio/studio.module.css';
export default function SchoolCourseMap({slug,stages}){
 const [state,setState]=useState({loading:true,error:'',data:null});
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const db=browserDb(),{data:auth,error}=await db?.auth.getSession()||{};
    if(error||!auth?.session?.access_token)throw Error('سجّل الدخول إلى حسابك لعرض المحطات المتاحة والتقدم المحفوظ.');
    const resp=await fetch('/api/school/custom?slug='+encodeURIComponent(slug),{cache:'no-store',headers:{
     Authorization:'Bearer '+auth.session.access_token
    }});
    const result=await resp.json();
    if(!resp.ok)throw Error(result.error||'تعذر قراءة تقدم المسار.');
    if(active)setState({loading:false,error:'',data:result});
   }catch(e){if(active)setState({loading:false,error:e.message||'تعذر الاتصال.',data:null});}
  }
  load();return()=>{active=false;};
 },[slug]);
 const summary=state.data;
 const done=summary?.stages.filter(s=>s.completed).length||0;
 return <div className={styles.courseMap}>
  {summary&&<div className={styles.courseProgress} role="status">
   <strong>{done} / {summary.stages.length} محطة مُتقنة</strong>
   <div className={styles.courseTrack} role="progressbar" aria-valuenow={done}
    aria-valuemin={0} aria-valuemax={summary.stages.length} aria-label="تقدم المسار">
    <span style={{width:(done/summary.stages.length*100)+'%'}}/></div>
   {summary.staffPreview&&<small><ShieldCheck size={15}/> تستطيع الإدارة فتح جميع المحطات للمعاينة.</small>}
  </div>}
  {state.loading&&<p role="status" className={styles.muted}>جارٍ تحميل المحطات المتاحة من حسابك…</p>}
  {state.error&&<p role="status" className={styles.muted}>{state.error}</p>}
  <ol className={styles.courseTimeline}>
   {stages.map((stage,i)=>{
    const info=summary?.stages.find(s=>s.index===stage.index);
    const locked=!info||info.locked;
    const completed=Boolean(info?.completed);
    const content=<><span className={styles.timelineIndex}>{completed?<CheckCircle2 size={21}/>:locked?<LockKeyhole size={20}/>:<BookOpen size={20}/>}</span>
     <span className={styles.timelineBody}><strong>المحطة {stage.index+1}: {stage.title}</strong>
      <small>{stage.subtitle}</small><em>{completed?'مكتملة':locked?'مقفلة — أكمل السابقة أولًا':'جاهزة للتعلم'}</em></span>
     {!locked&&<ArrowLeft size={19} aria-hidden="true"/>}</>;
    return <li key={stage.index} className={[styles.timelineStage,completed?styles.timelineDone:'',!locked?styles.timelineOpen:''].join(' ')}>
     {!locked?<Link href={'/school/courses/'+slug+'/'+(stage.index+1)}>{content}</Link>:
      <div aria-label={'المحطة '+(stage.index+1)+' مقفلة'}>{content}</div>}
    </li>;
   })}
  </ol>
 </div>;
}
