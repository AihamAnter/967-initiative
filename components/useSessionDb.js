'use client';
import {useEffect,useState} from 'react';
import {authStorageKey,browserSessionMayExist} from '@/lib/sessionHint';

export default function useSessionDb(){
 const [state,setState]=useState({db:null,ready:false});
 useEffect(()=>{
  let live=true,loading=false;const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=authStorageKey(url);
  const connect=async()=>{if(loading)return;loading=true;try{const {browserDb}=await import('@/lib/supabase');if(live)setState({db:browserDb(),ready:true});}catch{if(live)setState({db:null,ready:true});}finally{loading=false;}};
  let shouldConnect=false;try{shouldConnect=browserSessionMayExist(url,localStorage,location.href);}catch{shouldConnect=true;}
  if(shouldConnect)connect().catch(()=>{});
  else setState({db:null,ready:true});
  const storage=event=>{if(event.key===key||event.key===null)connect().catch(()=>{});};
  const activate=()=>connect().catch(()=>{});
  window.addEventListener('storage',storage);window.addEventListener('967:auth-ready',activate);
  return()=>{live=false;window.removeEventListener('storage',storage);window.removeEventListener('967:auth-ready',activate);};
 },[]);
 return state;
}
