'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Ban,CheckCircle2,Mail,RefreshCw,Search,ShieldAlert,ShieldCheck,UsersRound,X} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import useAudience from '@/components/debates/useAudience';
import styles from './ManagementUsersDashboard.module.css';

const readable=count=>Number(count||0).toLocaleString('en-US');
const dateTime=value=>{
 if(!value)return 'لم يسجّل الدخول';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '—';
 return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Malta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
};
const roles={user:'مستخدم',admin:'أدمن تحرير',management:'إدارة'};
const states={active:'نشط',banned:'محظور',unverified:'غير مؤكّد'};
const providers={email:'البريد',google:'Google',github:'GitHub',apple:'Apple'};
const durations=[['24h','يوم واحد'],['168h','7 أيام'],['720h','30 يومًا'],['876000h','حظر طويل الأمد']];
const initialFilters={q:'',status:'all',role:'all',sort:'created_desc',page:1};

export default function ManagementUsersDashboard(){
 const {user,ready,error:authError}=useAudience();
 const [filters,setFilters]=useState(initialFilters);
 const [revision,setRevision]=useState(0);
 const [directoryState,setDirectoryState]=useState({owner:null,data:null});
 const directory=directoryState.owner===user?.id?directoryState.data:null;
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [denied,setDenied]=useState(false);
 const [notice,setNotice]=useState('');
 const [modal,setModal]=useState(null);
 const [duration,setDuration]=useState('24h');
 const [subject,setSubject]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);

 const request=useCallback(async (path,body,signal)=>{
  const db=browserDb();
  if(!db)throw Error('خدمة الحسابات غير متاحة.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token)throw Error('انتهت الجلسة. سجّل الدخول مجددًا.');
  const response=await fetch(path,{method:body?'POST':'GET',headers:{
   Authorization:'Bearer '+data.session.access_token,
   ...(body?{'Content-Type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{}),signal,cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error||'تعذر تنفيذ الطلب.'),{status:response.status});
  return result;
 },[]);

 const query=useMemo(()=>new URLSearchParams({
  q:filters.q,status:filters.status,role:filters.role,sort:filters.sort,page:String(filters.page)
 }).toString(),[filters]);

 useEffect(()=>{
  if(!ready||!user){setDirectoryState({owner:null,data:null});setDenied(false);setLoading(false);return;}
  let live=true;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setLoading(true);setError('');
   try{
    const result=await request('/api/admin/users?'+query,null,controller.signal);
    if(live){setDirectoryState({owner:user.id,data:result});setDenied(false);}
   }catch(failure){
    if(live&&!controller.signal.aborted){setDirectoryState({owner:null,data:null});setDenied(failure.status===403);setError(failure.message);}
   }finally{if(live)setLoading(false);}
  },filters.q?300:0);
  return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[ready,user?.id,query,revision,request]);

 const change=patch=>{setFilters(current=>({...current,...patch,page:1}));setNotice('');};
 const refresh=()=>setRevision(value=>value+1);
 const open=(kind,account)=>{
  setModal({kind,account});
  setDuration('24h');setSubject('رسالة من فريق 967');setMessage('');
  setError('');setNotice('');
 };
 const close=()=>{if(!busy)setModal(null);};

 const action=async()=>{
  if(!modal||busy)return;
  const {account,kind}=modal;
  if(kind==='ban'&&!window.confirm('تأكيد حظر حساب '+account.name+'؟'))return;
  if(kind==='unban'&&!window.confirm('رفع الحظر عن حساب '+account.name+'؟'))return;
  setBusy(true);setError('');
  try{
   const result=await request('/api/admin/users',{
    action:kind==='email'?'send_email':kind,
    user_id:account.id,
    ...(kind==='ban'?{duration}:{}),
    ...(kind==='email'?{subject:subject.trim(),message:message.trim()}:{})
   });
   setNotice(result.message||'تم تنفيذ العملية.');
   setModal(null);
   refresh();
  }catch(failure){setError(failure.message);}
  finally{setBusy(false);}
 };
 const mailto=modal?.kind==='email'&&modal.account.email?
  'mailto:'+modal.account.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message):'';
 const canSend=subject.trim().length>=3&&subject.trim().length<=160&&message.trim().length>=10&&message.trim().length<=4000;

 return <div className={styles.page} dir="rtl"><div className={styles.wrap}>
  <header className={styles.heading}>
   <div>
    <Link href="/admin" className={styles.back}><ArrowLeft size={16}/> العودة للوحة الإدارة</Link>
    <span className={styles.eyebrow}><ShieldCheck size={17}/> لوحة الإدارة / الإدارة فقط</span>
    <h1>المستخدمين</h1>
    <p>إدارة حسابات 967، والبحث عنها، ومراجعة نشاط تسجيل الدخول وحالة الوصول.</p>
   </div>
   <button type="button" className={styles.refresh} onClick={refresh} disabled={loading||!ready||!user}><RefreshCw size={17}/> تحديث القائمة</button>
  </header>
  {!ready?<div className={styles.statePanel} role="status">جارٍ التحقق من صلاحيات الحساب…</div>:
  !user?<div className={styles.statePanel}><ShieldAlert size={26}/><h2>سجّل الدخول بحساب الإدارة</h2><p>{authError||'يجب تسجيل الدخول حتى تتمكن من عرض حسابات المستخدمين.'}</p><Link href="/login?next=%2Fadmin%2Fusers">تسجيل الدخول</Link></div>:
  denied?<div className={styles.statePanel} role="alert"><ShieldAlert size={26}/><h2>هذه الصفحة للإدارة فقط</h2><p>{error}</p><Link href="/admin">العودة إلى لوحة التحرير</Link></div>:
  <>
   {error&&!modal&&<p role="alert" className={styles.error}>{error}</p>}
   {notice&&<p role="status" className={styles.success}>{notice}</p>}
   {directory&&<>
    <div className={styles.metrics} aria-label="ملخص حسابات المستخدمين">
     <div><UsersRound size={20}/><span>إجمالي الحسابات</span><strong>{readable(directory.summary.total)}</strong></div>
     <div><CheckCircle2 size={20}/><span>نشطة</span><strong>{readable(directory.summary.active)}</strong></div>
     <div><Ban size={20}/><span>محظورة</span><strong>{readable(directory.summary.banned)}</strong></div>
     <div><Mail size={20}/><span>لم تؤكد البريد</span><strong>{readable(directory.summary.unverified)}</strong></div>
    </div>
   </>}
   <section className={styles.panel} aria-label="قائمة المستخدمين">
    <div className={styles.controls}>
     <label className={styles.search}><span>بحث بالاسم أو البريد أو معرّف الحساب</span><div><Search size={18}/><input type="search" placeholder="اكتب الاسم أو البريد الإلكتروني…" value={filters.q} maxLength={120} onChange={e=>change({q:e.target.value})}/></div></label>
     <label>حالة الحساب<select value={filters.status} onChange={e=>change({status:e.target.value})}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="banned">محظور</option><option value="unverified">البريد غير مؤكّد</option></select></label>
     <label>نوع الحساب<select value={filters.role} onChange={e=>change({role:e.target.value})}><option value="all">جميع الأدوار</option><option value="user">مستخدم عادي</option><option value="admin">أدمن تحرير</option><option value="management">إدارة</option></select></label>
     <label>الترتيب<select value={filters.sort} onChange={e=>change({sort:e.target.value})}><option value="created_desc">الأحدث إنشاءً</option><option value="created_asc">الأقدم إنشاءً</option><option value="login_desc">آخر تسجيل دخول</option><option value="name_asc">الاسم أبجديًا</option></select></label>
    </div>
    <div className={styles.tableHead}><strong>قائمة الحسابات</strong><span>{loading?'جارٍ البحث…':directory?readable(directory.total)+' نتيجة مطابقة':'—'}</span></div>
    {loading&&!directory&&<p className={styles.empty} role="status">جارٍ تحميل الحسابات…</p>}
    {directory&&<div className={styles.tableScroll} tabIndex={0} role="region" aria-label="جدول حسابات مستخدمي 967">
     <table className={styles.table}>
      <thead><tr><th scope="col">الاسم</th><th scope="col">البريد الإلكتروني</th><th scope="col">تاريخ الإنشاء</th><th scope="col">آخر دخول</th><th scope="col">الحالة</th><th scope="col">الصلاحية</th><th scope="col">الإجراءات</th></tr></thead>
      <tbody>{directory.users.map(account=><tr key={account.id}>
       <th scope="row"><div className={styles.person}><span className={styles.avatar}>{account.name.slice(0,1)}</span><div><strong>{account.name}</strong><small dir="ltr" title={account.id}>{account.id.slice(0,8)}…</small></div></div></th>
       <td><span dir="ltr" className={styles.email}>{account.email||'—'}</span><small>{providers[account.provider]||account.provider} · {account.email?(account.email_confirmed?'بريد مؤكّد':'بريد غير مؤكّد'):'لا يوجد بريد'}</small></td>
       <td className={styles.dateCell} dir="ltr">{dateTime(account.created_at)}</td>
       <td className={styles.dateCell} dir="ltr">{dateTime(account.last_sign_in_at)}</td>
       <td><span className={styles.status} data-status={account.status}>{states[account.status]||account.status}</span>{account.status==='banned'&&<small>حتى {dateTime(account.banned_until)}</small>}</td>
       <td>{roles[account.role]||roles.user}</td>
       <td><div className={styles.actions}>
        {account.email&&<button type="button" onClick={()=>open('email',account)} aria-label={'مراسلة '+account.name}><Mail size={15}/> مراسلة</button>}
        {account.id!==user.id&&account.role==='user'&&(account.status==='banned'?
         <button className={styles.unban} type="button" onClick={()=>open('unban',account)}><CheckCircle2 size={15}/> رفع الحظر</button>:
         <button className={styles.ban} type="button" onClick={()=>open('ban',account)}><Ban size={15}/> حظر</button>)}
        {account.role!=='user'&&<small>حماية حسابات الفريق</small>}
       </div></td>
      </tr>)}
      {!directory.users.length&&<tr><td colSpan={7} className={styles.empty}>لم نجد حسابات مطابقة لهذه الفلاتر.</td></tr>}
      </tbody>
     </table>
    </div>}
    {directory&&<footer className={styles.pagination}>
     <span>صفحة {readable(directory.page)} من {readable(directory.pages)} · {readable(directory.total)} مستخدم</span>
     <div><button type="button" disabled={loading||directory.page<=1} onClick={()=>setFilters(x=>({...x,page:x.page-1}))}>السابق</button>
     <button type="button" disabled={loading||directory.page>=directory.pages} onClick={()=>setFilters(x=>({...x,page:x.page+1}))}>التالي</button></div>
    </footer>}
   </section>
   <p className={styles.footnote}>التواريخ بتوقيت مالطا. الحظر يمنع تسجيل الدخول وتجديد الجلسة، لكن رموز الدخول الصادرة مسبقًا قد تبقى صالحة حتى تنتهي مدتها. البيانات متاحة للإدارة فقط.</p>
  </>}
  {modal&&<div className={styles.overlay} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
   <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="manage-user-title">
    <div className={styles.dialogTitle}><h2 id="manage-user-title">{modal.kind==='email'?'مراسلة المستخدم':modal.kind==='ban'?'حظر حساب مستخدم':'رفع الحظر عن المستخدم'}</h2><button type="button" disabled={busy} onClick={close} aria-label="إغلاق"><X size={20}/></button></div>
    <p className={styles.recipient}><strong>{modal.account.name}</strong><span dir="ltr">{modal.account.email||modal.account.id}</span></p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {modal.kind==='email'?<div className={styles.form}>
     <label>الموضوع<input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={160}/></label>
     <label>الرسالة<textarea value={message} onChange={e=>setMessage(e.target.value)} rows={7} maxLength={4000} placeholder="اكتب رسالتك إلى المستخدم…"/></label>
     <small>الإرسال المباشر يتطلب تفعيل مزوّد Resend وبريد مرسل موثّق. ويمكن فتح الرسالة في برنامج بريدك بدلًا من ذلك.</small>
    </div>:modal.kind==='ban'?<div className={styles.form}><label>مدة الحظر<select value={duration} onChange={e=>setDuration(e.target.value)}>{durations.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p>سيُمنع هذا الحساب من تسجيل الدخول أو تجديد الجلسة خلال مدة الحظر. لن تُحذف بياناته أو مشاركاته.</p></div>:<p>سيتم السماح لهذا المستخدم بتسجيل الدخول مرة أخرى دون حذف بياناته.</p>}
    <div className={styles.dialogActions}>
     <button type="button" onClick={action} disabled={busy||(modal.kind==='email'&&!canSend)} className={modal.kind==='ban'?styles.dangerAction:styles.primaryAction}>{busy?'جارٍ التنفيذ…':modal.kind==='email'?'إرسال البريد الآن':modal.kind==='ban'?'تأكيد الحظر':'رفع الحظر'}</button>
     {mailto&&<a className={styles.mailto} href={mailto}>فتح في برنامج البريد</a>}
     <button type="button" onClick={close} disabled={busy} className={styles.cancelAction}>إلغاء</button>
    </div>
   </section>
  </div>}
 </div></div>;
}
