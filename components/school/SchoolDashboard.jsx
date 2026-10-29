'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BookOpenCheck,CheckCircle2,GraduationCap,RefreshCw,ShieldCheck,Target} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import styles from '@/app/school/dashboard/dashboard.module.css';

export default function SchoolDashboard(){
 const [state,setState]=useState({kind:'loading',data:null,message:''});
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let alive=true;
  let latest=0;
  let timer;
  async function refresh(){
   const call=++latest;
   try{
    const db=browserDb();
    const {data,error}=await db?.auth.getSession()||{};
    if(!alive||call!==latest)return;
    if(error)throw new Error('تعذر التحقق من تسجيل الدخول.');
    const token=data?.session?.access_token;
    if(!token){setState({kind:'guest',data:null,message:''});return;}
    setState({kind:'loading',data:null,message:''});
    const response=await fetch('/api/school/dashboard',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const value=await response.json();
    if(!alive||call!==latest)return;
    if(response.status===401){setState({kind:'guest',data:null,message:''});return;}
    if(!response.ok)throw new Error(value.error||'تعذر قراءة التقدم التعليمي.');
    setState({kind:'ready',data:value,message:''});
   }catch(error){
    if(alive&&call===latest)setState({kind:'error',data:null,message:error.message||'تعذر الاتصال بالخادم.'});
   }
  }
  refresh();
  const db=browserDb();
  const sub=db?.auth.onAuthStateChange(()=>{
   clearTimeout(timer);
   timer=setTimeout(()=>{if(alive)refresh();},0);
  }).data.subscription;
  return()=>{alive=false;latest++;clearTimeout(timer);sub?.unsubscribe();};
 },[revision]);
 const {kind,data,message}=state;
 return <section className={styles.dashboard} aria-label="لوحة تقدم الطالب"><div className="container">
  {kind==='loading'&&<div className={styles.notice} role="status"><RefreshCw size={20} aria-hidden="true"/> جارٍ تحميل تقدمك التعليمي…</div>}
  {kind==='guest'&&<div className={styles.notice}>
   <GraduationCap size={27} aria-hidden="true"/><div><strong>سجّل الدخول لتظهر رحلتك</strong><p>تقدمك ونتائجك لا تظهر إلا في حسابك. يمكنك استكشاف المسارات قبل التسجيل.</p></div>
   <Link className={styles.action} href="/login">تسجيل الدخول <ArrowLeft size={17}/></Link>
  </div>}
  {kind==='error'&&<div className={styles.notice} role="alert"><p>{message}</p><button type="button" className={styles.action} onClick={()=>setRevision(x=>x+1)}>إعادة المحاولة <RefreshCw size={17}/></button></div>}
  {kind==='ready'&&data&&<>
   {data.staffPreview&&<div className={styles.staffNotice}><ShieldCheck size={21} aria-hidden="true"/><p>يمكن للإدارة معاينة المحطات بحرية. تظل الإحصاءات أدناه مبنية على نتائج حسابك الفعلية، ولا تُحتسب المعاينة تقدّمًا.</p></div>}
   <div className={styles.stats}>
    <div className={styles.stat}><span><CheckCircle2 size={17}/> محطات مكتملة</span><strong dir="ltr">{data.totals.completedStages} / {data.totals.stages}</strong></div>
    <div className={styles.stat}><span><BookOpenCheck size={17}/> مسارات مكتملة</span><strong dir="ltr">{data.totals.finishedCourses} / {data.totals.courses}</strong></div>
    <div className={styles.stat}><span><Target size={17}/> محاولات مصححة</span><strong dir="ltr">{data.totals.submittedAttempts}</strong></div>
   </div>
   {data.resume?<div className={styles.resume}>
    <div><span>أكمل من حيث توقفت</span><h2>{data.resume.course}</h2><p>{data.resume.stage?.title||'المحطة التالية'} — المحطة {(data.resume.stage?.index??0)+1}</p>
    {data.resume.hasActiveAttempt&&<small>لديك محاولة نشطة؛ ستُستعاد عند فتح المحطة.</small>}</div>
    <Link href={data.resume.stage?.href||'/school/writing'}>تابع التعلّم <ArrowLeft size={18}/></Link>
   </div>:<div className={styles.resume}><div><span>أنجزت المسارات المتاحة</span><h2>أكملت جميع المحطات!</h2><p>يمكنك الرجوع إلى أي مسار لإعادة التدريب.</p></div><Link href="/school/writing">استعرض المسارات <ArrowLeft size={18}/></Link></div>}
   <div className={styles.titleRow}><div><span>مساراتي</span><h2>تقدّمك في كل مسار</h2></div><p>النجاح في المحطة وحده هو الذي يحسبها مكتملة. الإعادة لا تمحو إنجازك.</p></div>
   <div className={styles.courses}>{data.courses.map(course=><article key={course.slug} className={styles.course}>
    <div className={styles.courseTop}><span>{course.category}</span><span>{course.finished?'مكتمل':'قيد التعلّم'}</span></div>
    <h3>{course.title}</h3><p>{course.description}</p>
    <div className={styles.progressLabel}><strong>{course.completed} من {course.total} محطة</strong><span dir="ltr">{course.percent}%</span></div>
    <div className={styles.track} role="progressbar" aria-label={'تقدم '+course.title} aria-valuemin={0} aria-valuemax={course.total} aria-valuenow={course.completed}><span style={{width:course.percent+'%'}}/></div>
    <div className={styles.courseFoot}><span>{course.attempts} محاولات مصححة</span>
     <Link href={course.nextStage?.href||course.href}>{course.finished?'راجع المسار':'المحطة '+((course.nextStage?.index??0)+1)} <ArrowLeft size={17}/></Link></div>
   </article>)}</div>
   <p className={styles.footnote}>تعرض هذه اللوحة تقدم الدروس الحالي. ستضاف النقاط والمستويات والمراجعات والإنجازات في المراحل التالية، دون شهادات إتمام.</p>
  </>}
 </div></section>;
}
