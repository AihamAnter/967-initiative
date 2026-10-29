'use client';
import {useEffect,useRef,useState} from 'react';
// Autosave the in-progress answer; advancing also waits for a confirmed save.
export default function useSchoolDraft({attempt,active,answers,selection,request}){
 const version=useRef(0),loaded=useRef(null);
 const [status,setStatus]=useState('');
 if(attempt?.id!==loaded.current){
  loaded.current=attempt?.id||null;
  version.current=Number(attempt?.draftVersion||0);
 }
 async function save(draft){
  if(!attempt?.id)return;
  const revision=++version.current;
  setStatus('جارٍ حفظ تقدمك…');
  const outcome=await request({action:'save',attemptId:attempt.id,revision,draft});
  if(outcome.stale){
   setStatus('تحديث من نافذة أخرى؛ أعد فتح المحطة لمزامنة إجاباتك.');
   throw Error('تعذر حفظ الإجابات لأن نسخة أحدث محفوظة.');
  }
  setStatus('تم حفظ الإجابات');
 }
 useEffect(()=>{
  if(!active||!attempt?.id||answers.length>=attempt.questions.length)return;
  const timer=setTimeout(()=>{
   save({answers,selection}).catch(()=>setStatus('تعذر الحفظ التلقائي؛ حاول المتابعة مجددًا.'));
  },650);
  return()=>clearTimeout(timer);
 // Stable request functions are defined outside the lesson component.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,attempt?.id,answers,selection]);
 return {save,status};
}
