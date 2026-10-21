'use client';
import {useCallback,useEffect} from 'react';

export default function useUnsavedChanges(dirty){
 const confirmLeave=useCallback(()=>!dirty||window.confirm('لديك تغييرات غير محفوظة. هل تريد مغادرة النموذج وفقدها؟'),[dirty]);
 useEffect(()=>{
  if(!dirty)return;
  const beforeUnload=event=>{event.preventDefault();event.returnValue='';};
  const beforeNavigate=event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const anchor=event.target.closest?.('a[href]');
   if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
   const url=new URL(anchor.href,location.href);
   if(url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search)return;
   if(!confirmLeave()){event.preventDefault();event.stopPropagation();}
  };
  window.addEventListener('beforeunload',beforeUnload);
  document.addEventListener('click',beforeNavigate,true);
  return()=>{window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',beforeNavigate,true);};
 },[dirty,confirmLeave]);
 return confirmLeave;
}
