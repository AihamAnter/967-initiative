'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import useAudience from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import {REPORT_REASONS} from '@/lib/privateMessaging';
import styles from './MessageReports.module.css';

export default function MessageReports(){
 const {user,ready}=useAudience();
 const [filter,setFilter]=useState('open'),[page,setPage]=useState(1);
 const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const request=useCallback(async(body)=>{
  const db=browserDb();
  if(!db)throw Error('خدمة الحسابات غير متاحة.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw Error('انتهت الجلسة.');
  const res=await fetch('/api/admin/message-reports'+(body?'':'?status='+filter+'&page='+page),{
   method:body?'POST':'GET',
   headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,cache:'no-store'
  });
  const value=await res.json();
  if(!res.ok)throw Error(value.error||'تعذر تحميل البلاغات.');
  return value;
 },[filter,page]);
 const load=useCallback(async()=>{
  if(!user)return;
  try{setError('');setResult(await request());}catch(e){setResult(null);setError(e.message);}
 },[request,user?.id]);
 useEffect(()=>{if(!ready||!user){setResult(null);return;}load();},[ready,user?.id,load]);
 const update=async(id,status)=>{
  if(!window.confirm('تأكيد تسجيل قرار البلاغ؟'))return;
  setBusy(true);setError('');
  try{await request({id,status});await load();}catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 return <section className={styles.page} dir="rtl"><div className={styles.wrap}>
  <header className={styles.heading}><div><p>967 / الإدارة فقط</p><h1>بلاغات الرسائل الخاصة</h1><p>تُعرض الأدلة التي أبلغ عنها المستخدمون فقط، وليس جميع المحادثات.</p></div><Link href="/admin">العودة إلى لوحة الإدارة</Link></header>
  {!ready?<p>جارٍ التحقق من الحساب…</p>:!user?<p>سجّل الدخول بحساب الإدارة للمتابعة.</p>:<>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   <div className={styles.tools}><label>حالة البلاغ <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="open">قيد المراجعة</option><option value="reviewed">تمت المراجعة</option><option value="dismissed">مرفوضة</option></select></label><button onClick={load}>تحديث</button></div>
   {result&&<><div className={styles.cards}>{result.reports.map(report=><article key={report.id}>
    <div className={styles.summary}><strong>{REPORT_REASONS[report.reason]||report.reason}</strong><span>{new Date(report.created_at).toLocaleString('ar')}</span></div>
    <p className={styles.text}>{report.evidence}</p>
    {report.note&&<p className={styles.note}><strong>ملاحظة صاحب البلاغ:</strong> {report.note}</p>}
    <small>مرجع البلاغ: {report.id}</small>
    {report.status==='open'&&<div className={styles.actions}><button disabled={busy} onClick={()=>update(report.id,'reviewed')}>تمت المراجعة</button><button disabled={busy} onClick={()=>update(report.id,'dismissed')}>إغلاق البلاغ</button></div>}
   </article>)}</div>
   {!result.reports.length&&<p className={styles.empty}>لا توجد بلاغات بهذه الحالة.</p>}
   <footer className={styles.pages}><span>صفحة {result.page} · {result.total} بلاغ</span><div><button disabled={page<=1||busy} onClick={()=>setPage(n=>n-1)}>السابق</button><button disabled={page*25>=result.total||busy} onClick={()=>setPage(n=>n+1)}>التالي</button></div></footer></>}
  </>}
 </div></section>;
}
