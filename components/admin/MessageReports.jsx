'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Eye,ShieldAlert,X} from 'lucide-react';
import useAudience from '@/components/debates/useAudience';
import {browserDb} from '@/lib/supabase';
import {REPORT_REASONS} from '@/lib/privateMessaging';
import {accountScopedState} from '@/lib/accountScopedState';
import styles from './MessageReports.module.css';

const displayDate=value=>value?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
const states={open:'قيد المراجعة',reviewed:'تمت المراجعة',dismissed:'مغلق'};

export default function MessageReports(){
 const {user,ready}=useAudience();
 const [filter,setFilter]=useState('open'),[page,setPage]=useState(1);
 const [resultState,setResultState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [opened,setOpened]=useState(null);
 const ownerRef=useRef(null);
 ownerRef.current=user?.id||null;
 const result=accountScopedState(resultState,user?.id)?.data??null;
 const visibleThread=accountScopedState(opened,user?.id);

 const request=useCallback(async(body=null,query=null)=>{
  const db=browserDb();
  if(!db)throw Error('خدمة الحسابات غير متاحة.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw Error('انتهت الجلسة.');
  const path='/api/admin/message-reports'+(body?'':('?'+(query||'status='+filter+'&page='+page)));
  const res=await fetch(path,{
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
  const account=user.id;
  try{
   setError('');
   const data=await request();
   if(ownerRef.current===account)setResultState({owner:account,data});
  }catch(e){
   if(ownerRef.current===account){setResultState(null);setError(e.message);}
  }
 },[request,user?.id]);

 useEffect(()=>{if(!ready||!user){setResultState(null);setOpened(null);return;}load();},[ready,user?.id,load]);

 const update=async(id,status)=>{
  if(!window.confirm('تأكيد تسجيل قرار البلاغ؟'))return;
  setBusy(true);setError('');
  try{await request({id,status});await load();}catch(e){setError(e.message);}
  finally{setBusy(false);}
 };

 const viewConversation=async(report)=>{
  const account=ownerRef.current;
  if(!account)return;
  setOpened({owner:account,id:report.id,loading:true,report,messages:[],hasMore:false,page:0,intro:null,error:''});
  try{
   const data=await request(null,'report='+encodeURIComponent(report.id)+'&page=1');
   if(ownerRef.current!==account)return;
   setOpened(previous=>previous?.id===report.id?{...previous,...data,owner:account,id:report.id,loading:false,page:1,error:''}:previous);
  }catch(e){
   if(ownerRef.current===account)setOpened(previous=>previous?.id===report.id?{...previous,loading:false,error:e.message}:previous);
  }
 };

 const loadOlder=async()=>{
  if(!visibleThread||visibleThread.loading||!visibleThread.hasMore)return;
  const id=visibleThread.id,account=ownerRef.current,next=visibleThread.nextPage;
  setOpened(prev=>({...prev,loading:true,error:''}));
  try{
   const data=await request(null,'report='+encodeURIComponent(id)+'&page='+next);
   if(ownerRef.current!==account)return;
   setOpened(previous=>previous?.id===id?{...previous,messages:[...data.messages,...previous.messages],page:next,nextPage:data.nextPage,hasMore:data.hasMore,loading:false}:previous);
  }catch(e){
   if(ownerRef.current===account)setOpened(previous=>previous?.id===id?{...previous,loading:false,error:e.message}:previous);
  }
 };

 return <section className={styles.page} dir="rtl"><div className={styles.wrap}>
  <header className={styles.heading}><div><p>967 / الإدارة فقط</p><h1>بلاغات الرسائل الخاصة</h1><p>كل بلاغ يوضح مَن أرسله، ومَن أُبلغ عنه، ونص الإساءة وسياق المحادثة حتى وقت البلاغ.</p></div><Link href="/admin">العودة إلى لوحة الإدارة</Link></header>
  {!ready?<p>جارٍ التحقق من الحساب…</p>:!user?<p>سجّل الدخول بحساب الإدارة للمتابعة.</p>:<>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   <div className={styles.tools}><label>حالة البلاغ <select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);setOpened(null);}}><option value="open">قيد المراجعة</option><option value="reviewed">تمت المراجعة</option><option value="dismissed">مغلقة</option></select></label><button onClick={load}>تحديث</button></div>
   {result&&<><div className={styles.cards}>{result.reports.map(report=><article key={report.id}>
    <div className={styles.summary}><strong>{report.reference} · {REPORT_REASONS[report.reason]||report.reason}</strong><span>{displayDate(report.created_at)}</span></div>
    <div className={styles.parties}>
     <div><span>مقدّم البلاغ</span><strong>{report.reporter.name}</strong></div>
     <div><span>المُبلّغ عنه</span><strong>{report.reported.name}</strong></div>
    </div>
    <p className={styles.detail}><strong>موضوع البلاغ:</strong> {report.subject_type} · <strong>الحالة:</strong> {states[report.status]||report.status}</p>
    <p className={styles.text}>{report.evidence}</p>
    {report.note&&<p className={styles.note}><strong>ملاحظة مقدّم البلاغ:</strong> {report.note}</p>}
    <div className={styles.actions}>
     <button type="button" onClick={()=>viewConversation(report)}><Eye size={17}/> قراءة المحادثة المرتبطة بالبلاغ</button>
     {report.status==='open'&&<>
      <button disabled={busy} onClick={()=>update(report.id,'reviewed')}>تمت المراجعة</button>
      <button disabled={busy} onClick={()=>update(report.id,'dismissed')}>إغلاق البلاغ</button>
     </>}
    </div>
   </article>)}</div>
   {!result.reports.length&&<p className={styles.empty}>لا توجد بلاغات بهذه الحالة.</p>}
   <footer className={styles.pages}><span>صفحة {result.page} · {result.total} بلاغ</span><div><button disabled={page<=1||busy} onClick={()=>setPage(n=>n-1)}>السابق</button><button disabled={page*25>=result.total||busy} onClick={()=>setPage(n=>n+1)}>التالي</button></div></footer></>}
  </>}
 </div>
 {visibleThread&&<div className={styles.overlay} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpened(null);}}>
  <section role="dialog" aria-modal="true" aria-labelledby="report-thread-title" className={styles.dialog}>
   <header className={styles.dialogHeader}><div>
    <span className={styles.reference}>{visibleThread.report.reference}</span>
    <h2 id="report-thread-title">محادثة البلاغ</h2>
    <p>{visibleThread.report.reporter.name} أبلغ عن {visibleThread.report.reported.name} · {displayDate(visibleThread.report.created_at)}</p>
   </div><button type="button" aria-label="إغلاق المحادثة" onClick={()=>setOpened(null)}><X size={20}/></button></header>
   <p className={styles.privacyNote}><ShieldAlert size={16}/> تعرض الرسائل حتى وقت تقديم البلاغ فقط. تُسجّل كل عملية اطلاع من الإدارة لحماية الخصوصية.</p>
   {visibleThread.error&&<p className={styles.error} role="alert">{visibleThread.error}</p>}
   <div className={styles.transcript}>
    {visibleThread.hasMore&&<button className={styles.more} disabled={visibleThread.loading} onClick={loadOlder}>تحميل رسائل أقدم</button>}
    {visibleThread.intro&&!visibleThread.hasMore&&<div className={styles.messageLine}>
     <span className={styles.sender}>{visibleThread.report.participants.find(p=>p.id===visibleThread.intro.sender_id)?.name||'مستخدم 967'} · طلب بدء المحادثة</span>
     <p>{visibleThread.intro.body}</p><small>{displayDate(visibleThread.intro.created_at)}</small>
    </div>}
    {(visibleThread.messages||[]).map(message=><div key={message.id} className={styles.messageLine} data-flagged={message.id===visibleThread.report.message_id||undefined}>
     <span className={styles.sender}>{visibleThread.report.participants.find(p=>p.id===message.sender_id)?.name||'مستخدم 967'} {message.id===visibleThread.report.message_id?'· الرسالة المُبلغ عنها':''}</span>
     <p>{message.body}</p><small>{displayDate(message.created_at)}</small>
    </div>)}
    {!visibleThread.loading&&!visibleThread.messages?.length&&<p className={styles.empty}>لا توجد رسائل أخرى قبل تقديم البلاغ. يمكن الاستناد إلى نص الطلب أو الرسالة المحفوظة مع البلاغ.</p>}
    {visibleThread.loading&&<p role="status" className={styles.empty}>جارٍ تحميل المحادثة…</p>}
   </div>
  </section>
 </div>}
 </section>;
}
