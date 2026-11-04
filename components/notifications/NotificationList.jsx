'use client';
import {Bell,Check,ClipboardList,MessageCircle,MessagesSquare,UserRound} from 'lucide-react';
import styles from './Notifications.module.css';

const icons={messages:MessageCircle,tasks:ClipboardList,debates:MessagesSquare,account:UserRound};
const labels={messages:'الرسائل الخاصة',tasks:'مركز المهام',debates:'المناظرات',account:'الحساب'};
const timestamp=value=>{
 const date=new Date(value||'');
 if(!Number.isFinite(date.getTime()))return '';
 return new Intl.DateTimeFormat('ar-u-nu-latn',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date);
};
export default function NotificationList({items=[],onOpen,onRead,disabled=false,compact=false}){
 if(!items.length)return <div className={styles.empty}><Bell size={26} aria-hidden="true"/><p>لا توجد إشعارات في هذا القسم.</p></div>;
 return <div className={styles.list} data-compact={compact||undefined}>
  {items.map(item=>{
   const Icon=icons[item.category]||Bell;
   return <article key={item.id} className={styles.notification} data-unread={item.unread||undefined}>
    <span className={styles.noticeIcon} aria-hidden="true"><Icon size={19}/></span>
    <button type="button" className={styles.noticeMain} onClick={()=>onOpen(item)} disabled={disabled}
     aria-label={item.title+' — '+item.description}>
     <span className={styles.noticeTop}><strong>{item.title}</strong>{item.unread&&<i className={styles.dot} aria-label="غير مقروء"/>}</span>
     <span className={styles.noticeDescription}>{item.description}</span>
     <span className={styles.noticeMeta}><span>{labels[item.category]||'إشعار'}</span><time dateTime={item.created_at}>{timestamp(item.created_at)}</time></span>
    </button>
    {item.unread&&item.source!=='message'&&<button type="button" className={styles.markRead}
     aria-label={'تحديد كمقروء: '+item.title} title="تحديد كمقروء" disabled={disabled} onClick={()=>onRead(item)}>
     <Check size={17}/></button>}
   </article>;
  })}
 </div>;
}
