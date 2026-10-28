'use client';
import {useEffect,useRef,useState} from 'react';
import {millisecondsRemaining} from '@/lib/gameClock';

// Monotonic clock: background tabs or throttled intervals cannot grant extra seconds.
// claim() synchronously locks the current question and freezes the clock on submission.
export default function useQuestionTimer({seconds,token,active,onExpire}){
 const [remaining,setRemaining]=useState(seconds*1000);
 const deadline=useRef(null),locked=useRef(true),expireCallback=useRef(onExpire);
 expireCallback.current=onExpire;
 useEffect(()=>{
  if(!active){locked.current=true;deadline.current=null;return;}
  locked.current=false;
  deadline.current=performance.now()+seconds*1000;
  setRemaining(seconds*1000);
  const tick=()=>{
   if(locked.current||deadline.current===null)return;
   const ms=millisecondsRemaining(deadline.current,performance.now());
   setRemaining(ms);
   if(ms===0){
    locked.current=true;deadline.current=null;
    expireCallback.current?.();
   }
  };
  const interval=setInterval(tick,50);
  return ()=>{clearInterval(interval);locked.current=true;deadline.current=null;};
 },[active,token,seconds]);
 function claim(){
  if(locked.current||deadline.current===null)return false;
  const ms=millisecondsRemaining(deadline.current,performance.now());
  locked.current=true;deadline.current=null;setRemaining(ms);
  if(ms===0){expireCallback.current?.();return false;}
  return true;
 }
 return {remaining,claim,secondsLeft:Math.ceil(remaining/1000)};
}
