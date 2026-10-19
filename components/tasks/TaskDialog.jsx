'use client';
import {useEffect,useRef,useId} from 'react';
import {X} from 'lucide-react';
import styles from './TaskCenter.module.css';
export default function TaskDialog({title,children,onClose,busy=false,wide=false}){
 const ref=useRef(null),titleId=useId();
 useEffect(()=>{const node=ref.current,focused=document.activeElement;node.showModal();return()=>{node.close();if(focused?.isConnected)focused.focus();};},[]);
 return <dialog ref={ref} className={`${styles.dialog} ${wide?styles.wide:''}`} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
  <div className={styles.dialogBody}><header className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button type="button" className={styles.iconButton} aria-label="إغلاق النافذة" disabled={busy} onClick={onClose}><X size={21}/></button></header>{children}</div>
 </dialog>;
}
