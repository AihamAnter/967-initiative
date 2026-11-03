'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,Flag,RefreshCcw} from 'lucide-react';
import useAudience from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import {accountScopedState} from '@/lib/accountScopedState';
import {MEMBER_REPORT_REASONS,memberProfilePath} from '@/lib/memberProfiles';
import {REPORT_STATUS_LABELS,REPORT_DECISION_LABELS,reportDecisionPrompt} from '@/lib/reportDecisionLabels';
import styles from './MessageReports.module.css';

const time=value=>new Date(value).toLocaleString('en-GB',{timeZone:'Europe/Malta'});
export default function MemberReports(){
 const {user,ready}=useAudience();
 const [filter,setFilter]=useState('open'),[page,setPage]=useState(1);
 const [saved,setSaved]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const ownerRef=useRef(null);ownerRef.current=user?.id||null;
 const result=accountScopedState(saved,user?.id)?.data??null;
 const request=useCallback(async(body=null)=>{
  const db=browserDb();if(!db)throw Error('خدمة الحسابات غير متاحة.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw Error('انتهت جلسة تسجيل الدخول.');
  const res=await fetch('/api/admin/member-reports'+(body?'':'?status='+filter+'&page='+page),{
   method:body?'POST':'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined
  });
  const value=await res.json();
  if(!res.ok)throw Error(value.error||'تعذر تحميل البلاغات.');
  return value;
 },[filter,page]);
 const load=useCallback(async()=>{
  const owner=ownerRef.current;if(!owner)return;
  try{setError('');const data=await request();if(ownerRef.current===owner)setSaved({owner,data});}
  catch(e){if(ownerRef.current===owner){setError(e.message);setSaved(null);}}
 },[request]);
 useEffect(()=>{if(!ready||!user){setSaved(null);return;}load();},[ready,user?.id,load]);
 const review=async(id,status,reference)=>{
  if(!window.confirm(reportDecisionPrompt(status,reference)))return;
  setBusy(true);setError('');
  try{await request({id,status});await load();}
  catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 return <section className={styles.page} dir="rtl"><div className={styles.wrap}>
  <header className={styles.heading}><div><p>967 / الإدارة فقط</p><h1>بلاغات حسابات المستخدمين</h1><p>بلاغات عن سلوك الحساب، دون الاطلاع على محادثاته الخاصة.</p></div><Link href="/admin/message-reports">بلاغات الرسائل الخاصة</Link></header>
  {!ready?<p>جارٍ التحقق من الحساب…</p>:!user?<p>سجّل الدخول بحساب الإدارة أولًا.</p>:<>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <div className={styles.tools}><label>حالة البلاغ<select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="open">{REPORT_STATUS_LABELS.open}</option><option value="reviewed">{REPORT_STATUS_LABELS.reviewed}</option><option value="dismissed">{REPORT_STATUS_LABELS.dismissed}</option></select></label><button type="button" onClick={load}><RefreshCcw size={15}/> تحديث</button></div>
   <p className={styles.decisionHelp}><strong>تسجيل اكتمال المراجعة:</strong> توثيق انتهاء مراجعة البلاغ فقط، دون حظر أو عقوبة تلقائية. <strong>إغلاق دون إجراء:</strong> إنهاء البلاغ لأنه لا يستدعي إجراءً حاليًا.</p>
   {result&&<><div className={styles.cards}>{result.reports.map(report=><article key={report.id}>
    <div className={styles.summary}><strong><Flag size={16}/> {report.reference} · {MEMBER_REPORT_REASONS[report.reason]||report.reason}</strong><span>{time(report.created_at)}</span></div>
    <div className={styles.parties}>
     <div><span>مقدّم البلاغ</span><Link href={memberProfilePath(report.reporter.id)}><strong>{report.reporter.name}</strong></Link></div>
     <div><span>المُبلّغ عنه</span><Link href={memberProfilePath(report.reported.id)}><strong>{report.reported.name}</strong></Link></div>
    </div>
    <p className={styles.detail}><strong>الحالة:</strong> {REPORT_STATUS_LABELS[report.status]||report.status}</p>
    <p className={styles.text}>{report.detail}</p>
    {report.status==='open'&&<div className={styles.actions}>
     <button disabled={busy} onClick={()=>review(report.id,'reviewed',report.reference)}><CheckCircle2 size={16}/> {REPORT_DECISION_LABELS.reviewed}</button>
     <button disabled={busy} onClick={()=>review(report.id,'dismissed',report.reference)}>{REPORT_DECISION_LABELS.dismissed}</button>
    </div>}
   </article>)}</div>
   {!result.reports.length&&<p className={styles.empty}>لا توجد بلاغات بهذه الحالة.</p>}
   <footer className={styles.pages}><span>صفحة {page} · {result.total} بلاغ</span><div><button disabled={page<=1||busy} onClick={()=>setPage(p=>p-1)}>السابق</button><button disabled={page*25>=result.total||busy} onClick={()=>setPage(p=>p+1)}>التالي</button></div></footer></>}
  </>}
 </div></section>;
}
