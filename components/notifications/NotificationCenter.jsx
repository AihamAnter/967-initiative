'use client';
import Link from 'next/link';
import {ArrowRight,Bell,CheckCheck,RefreshCw} from 'lucide-react';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import useAudience from '@/components/debates/useAudience';
import {fetchNotifications,markNotification,markNotificationsRead} from './notificationClient';
import NotificationList from './NotificationList';
import {NOTIFICATION_CATEGORIES,noticeCategoryLabel,noticeCountLabel} from '@/lib/unifiedNotifications';
import styles from './Notifications.module.css';

export default function NotificationCenter(){
 const {user,ready}=useAudience(),router=useRouter();
 const [category,setCategory]=useState('all'),[items,setItems]=useState([]);
 const [page,setPage]=useState(1),[count,setCount]=useState(0),[total,setTotal]=useState(0),[markableCount,setMarkableCount]=useState(0);
 const [hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const seq=useRef(0);
 const load=useCallback(async(nextPage=1,append=false)=>{
  const version=++seq.current;
  setLoading(true);setError('');
  try{
   const response=await fetchNotifications({mode:'list',category,page:nextPage});
   if(version!==seq.current)return;
   setItems(previous=>{
    if(!append)return response.items||[];
    const keys=new Set(previous.map(item=>item.id));
    return [...previous,...(response.items||[]).filter(item=>!keys.has(item.id))];
   });
   setPage(nextPage);setCount(response.count||0);setTotal(response.total||0);setMarkableCount(response.markable_count||0);
   setHasMore(Boolean(response.hasMore));
  }catch(e){if(version===seq.current)setError(e.message);}
  finally{if(version===seq.current)setLoading(false);}
 },[category]);
 useEffect(()=>{
  seq.current++;setItems([]);setPage(1);setHasMore(false);setCount(0);setMarkableCount(0);
  if(!user)return;
  void load(1,false);
  return()=>{seq.current++;};
 },[user?.id,category,load]);
 const mark=async item=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   await markNotification(item.source,item.source_id);
   setItems(current=>current.map(n=>n.id===item.id?{...n,unread:false}:n));
   setCount(n=>Math.max(0,n-1));setMarkableCount(n=>Math.max(0,n-1));
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 const openItem=item=>{
  if(item.unread&&item.source!=='message')void markNotification(item.source,item.source_id).catch(()=>{});
  router.push(item.href);
 };
 const markAll=async()=>{
  if(busy)return;
  setBusy(true);setError('');
  try{await markNotificationsRead();await load(1,false);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 if(!ready)return <section className={styles.page}><p role="status">جارٍ التحقق من حسابك…</p></section>;
 if(!user)return <section className={styles.page}><div className={styles.guest}><Bell size={32}/><h1>إشعارات 967</h1><p>سجّل الدخول لمتابعة تحديثات حسابك ومهامك ورسائلك.</p><Link href="/login?next=%2Fnotifications">تسجيل الدخول</Link></div></section>;
 return <section className={styles.page}>
  <Link href="/account" className={styles.back}><ArrowRight size={17}/> حسابي</Link>
  <div className={styles.pageHeading}><div><span>حسابك في 967</span><h1><Bell size={26}/> مركز الإشعارات</h1>
   <p>الرسائل والمهام والمناظرات وتحديثات الحساب في مكان واحد.</p></div>
   <div className={styles.pageActions}>
    <button type="button" onClick={()=>load(1,false)} disabled={busy||loading}><RefreshCw size={17}/> تحديث</button>
    <button type="button" onClick={markAll} disabled={busy||loading||markableCount===0}><CheckCheck size={17}/> تحديد الإشعارات كمقروءة</button>
   </div>
  </div>
  <div className={styles.centerShell}>
   <header className={styles.centerHeader}><strong>{count?noticeCountLabel(count)+' إشعارات جديدة':'لا توجد إشعارات جديدة'}</strong>
    <span>{total} في القسم الحالي</span></header>
   <nav className={styles.filters} aria-label="تصفية الإشعارات">
    {NOTIFICATION_CATEGORIES.map(key=><button key={key} type="button" onClick={()=>setCategory(key)}
     aria-pressed={category===key} data-active={category===key||undefined}>{noticeCategoryLabel[key]}</button>)}
   </nav>
   {error&&<p className={styles.error} role="alert">{error} <button type="button" onClick={()=>load(page,false)}>إعادة المحاولة</button></p>}
   {loading&&!items.length?<p className={styles.message} role="status">جارٍ تحميل الإشعارات…</p>:
    <NotificationList items={items} onOpen={openItem} onRead={mark} disabled={busy}/>}
   {hasMore&&<div className={styles.more}><button type="button" onClick={()=>load(page+1,true)}
     disabled={loading||busy}>{loading?'جارٍ التحميل…':'عرض إشعارات أقدم'}</button></div>}
  </div>
  <p className={styles.footnote}>الرسائل الخاصة تُعرض هنا مجمعة حسب المحادثة. لن تُعد رسالة مقروءة حتى تفتح المحادثة نفسها. إشعارات المهام متاحة لأعضاء الفريق المعتمدين فقط.</p>
 </section>;
}
