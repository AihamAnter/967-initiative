'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import styles from './MobileFold.module.css';

// Desktop content is always visible. Only narrow screens start with extras closed.
// Hash targets (#participants, etc.) open the section when linked directly.
export default function MobileFold({title,children,initiallyOpen=false,className=''}) {
 const [open,setOpen]=useState(initiallyOpen);
 const id=useId();
 const ref=useRef(null);
 useEffect(()=>{
  const reveal=()=>{
   const hash=window.location.hash.slice(1);
   if(!hash)return;
   let targetId;try{targetId=decodeURIComponent(hash);}catch{return;}
   const target=document.getElementById(targetId);
   if(target&&ref.current?.contains(target))setOpen(true);
  };
  reveal();
  window.addEventListener('hashchange',reveal);
  return()=>window.removeEventListener('hashchange',reveal);
 },[]);
 useEffect(()=>{
  if(!open||!window.location.hash)return;
  let targetId;try{targetId=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
  const target=document.getElementById(targetId);
  if(!target||!ref.current?.contains(target))return;
  const frame=requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'auto'}));
  return()=>cancelAnimationFrame(frame);
 },[open]);
 return <div className={[styles.fold,open?styles.open:styles.closed,className].filter(Boolean).join(' ')}>
  <button type="button" className={styles.trigger} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
   <span>{title}</span><ChevronDown size={19} aria-hidden="true"/>
  </button>
  <div id={id} className={styles.content} ref={ref}>{children}</div>
 </div>;
}
