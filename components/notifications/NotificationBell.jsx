'use client';
import Link from 'next/link';
import {Bell,CheckCheck,X} from 'lucide-react';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {fetchNotifications,markNotification,markNotificationsRead} from './notificationClient';
import NotificationList from './NotificationList';
import {noticeCountLabel} from '@/lib/unifiedNotifications';
import styles from './Notifications.module.css';

export default function NotificationBell({userId,onNavigate}){
 const router=useRouter();
 const host=useRef(null),trigger=useRef(null),pending=useRef(false),versionRef=useRef(0);
 const [open,setOpen]=useState(false),[data,setData]=useState({count:0,markable_count:0,items:[]});
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!userId||pending.current||document.visibilityState!=='visible')return;
  pending.current=true;
  const version=versionRef.current;
  try{
   const response=await fetchNotifications();
   if(version===versionRef.current){
    setData({count:response.count||0,markable_count:response.markable_count||0,items:response.items||[]});
    setError('');
   }
  }catch(e){if(version===versionRef.current&&(e.status===401||e.status===403))setData({count:0,markable_count:0,items:[]});}
  finally{pending.current=false;setLoading(false);}
 },[userId]);
 useEffect(()=>{
  versionRef.current++;pending.current=false;
  setData({count:0,markable_count:0,items:[]});setOpen(false);
  if(!userId)return;
  setLoading(true);
  void refresh();
  const timer=window.setInterval(refresh,60000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  window.addEventListener('focus',refresh);
  window.addEventListener('967:notifications-changed',refresh);
  window.addEventListener('967:messages-changed',refresh);
  document.addEventListener('visibilitychange',visible);
  return()=>{
   window.clearInterval(timer);window.removeEventListener('focus',refresh);
   window.removeEventListener('967:notifications-changed',refresh);
   window.removeEventListener('967:messages-changed',refresh);
   document.removeEventListener('visibilitychange',visible);
  };
 },[userId,refresh]);
 useEffect(()=>{
  if(!open)return;
  const dismiss=e=>{if(!host.current?.contains(e.target))setOpen(false);};
  const key=e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',key);};
 },[open]);
 const view=item=>{
  setOpen(false);onNavigate?.();
  // Marking a preview as read never marks private messages as read.
  if(item.unread&&item.source!=='message')
   void markNotification(item.source,item.source_id).catch(()=>{});
  router.push(item.href);
 };
 const mark=item=>{
  if(busy)return;
  setBusy(true);setError('');
  markNotification(item.source,item.source_id)
   .then(()=>{setData(state=>({...state,count:Math.max(0,state.count-1),markable_count:Math.max(0,state.markable_count-1),
    items:state.items.map(n=>n.id===item.id?{...n,unread:false}:n)}));})
   .catch(e=>setError(e.message))
   .finally(()=>{setBusy(false);void refresh();});
 };
 const markAll=()=>{
  if(busy)return;
  setBusy(true);setError('');
  markNotificationsRead().then(()=>refresh()).catch(e=>setError(e.message)).finally(()=>setBusy(false));
 };
 return <div ref={host} className={styles.bellHost}>
  <button type="button" ref={trigger} className={'ed-tool ed-tool-icon '+styles.bellButton}
   aria-label={data.count?'الإشعارات: '+data.count+' غير مقروءة':'الإشعارات'}
   aria-expanded={open} aria-haspopup="dialog" aria-controls="notifications-preview"
   title="الإشعارات" onClick={()=>{setOpen(v=>!v);if(!open){onNavigate?.();void refresh();}}}>
   <Bell size={20} aria-hidden="true"/>
   {data.count>0&&<span className={styles.bellCount} aria-hidden="true">{noticeCountLabel(data.count)}</span>}
  </button>
  {open&&<section id="notifications-preview" className={styles.popover} role="dialog" aria-label="آخر الإشعارات">
   <header className={styles.popoverHeader}><strong>الإشعارات</strong><span>{data.count?noticeCountLabel(data.count)+' جديدة':'لا توجد إشعارات جديدة'}</span>
    <button type="button" aria-label="إغلاق الإشعارات" className={styles.closeButton} onClick={()=>setOpen(false)}><X size={18}/></button>
   </header>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {loading&&!data.items.length?<p className={styles.message}>جارٍ تحميل الإشعارات…</p>:
    <NotificationList items={data.items} compact onOpen={view} onRead={mark} disabled={busy}/>}
   <footer className={styles.popoverFooter}>
    <Link href="/notifications" onClick={()=>{setOpen(false);onNavigate?.();}}>عرض جميع الإشعارات</Link>
    {data.markable_count>0&&
     <button type="button" disabled={busy} onClick={markAll}><CheckCheck size={15}/> تحديد المقروء</button>}
   </footer>
  </section>}
 </div>;
}
