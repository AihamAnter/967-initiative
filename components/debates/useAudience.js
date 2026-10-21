'use client';
import {useCallback,useEffect,useState} from 'react';
import {browserDb} from '@/lib/supabase';

export async function audienceRequest(path,body){
 const db=browserDb();if(!db)throw Error('خدمة الحسابات غير مفعّلة بعد.');
 const {data,error}=await db.auth.getSession();
 if(error||!data.session)throw Error('انتهت الجلسة. سجل الدخول مجدداً.');
 const response=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 const result=await response.json();
 if(!response.ok){if(response.status===401)await db.auth.signOut({scope:'local'});throw Error(result.error||'تعذر إتمام الطلب.');}
 return result;
}
export default function useAudience(){
 const [state,setState]=useState({user:null,ready:false,error:''});
 const refresh=useCallback(async()=>{
  const db=browserDb();if(!db){setState({user:null,ready:true,error:''});return;}
  try{const {data,error}=await db.auth.getUser();setState({user:error?null:data.user,ready:true,error:error&&error.status!==400&&error.name!=='AuthSessionMissingError'?'انتهت الجلسة أو تعذر التحقق منها. سجل الدخول مجدداً.':''});}
  catch{setState({user:null,ready:true,error:'تعذر التحقق من الجلسة. حاول مجدداً.'});}
 },[]);
 useEffect(()=>{let active=true,revision=0;const timers=new Set();const db=browserDb();
  if(!db){setState({user:null,ready:true,error:''});return;}
  const check=async()=>{const current=++revision;try{const {data,error}=await db.auth.getUser();if(active&&current===revision)setState({user:error?null:data.user,ready:true,error:error&&error.name!=='AuthSessionMissingError'?'انتهت الجلسة أو تعذر التحقق منها. سجل الدخول مجدداً.':''});}catch{if(active&&current===revision)setState({user:null,ready:true,error:'تعذر التحقق من الجلسة.'});}};
  check();const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{revision++;if(!session){setState({user:null,ready:true,error:''});return;}const timer=setTimeout(()=>{timers.delete(timer);if(active)check();},0);timers.add(timer);});
  return()=>{active=false;revision++;timers.forEach(clearTimeout);subscription.unsubscribe();};
 },[]);
 return {...state,refresh};
}
