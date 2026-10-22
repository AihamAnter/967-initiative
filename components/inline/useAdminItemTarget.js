'use client';
import {useEffect,useRef} from 'react';

// Consume a deep link once after the existing section has loaded its own rows.
// Subsequent list refreshes must never reopen a saved/cancelled form.
export default function useAdminItemTarget({item,rows,loading,onSelect,onMissing}){
 const consumed=useRef(null),callbacks=useRef({onSelect,onMissing});callbacks.current={onSelect,onMissing};
 useEffect(()=>{
  if(!item||loading||consumed.current===item)return;
  consumed.current=item;
  const row=rows.find(value=>value.id===item||value.slug===item);
  if(row)callbacks.current.onSelect(row);else callbacks.current.onMissing?.();
 },[item,rows,loading]);
}
