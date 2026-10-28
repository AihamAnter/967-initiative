'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {browserDb} from '@/lib/supabase';
import {dailyGameUrl} from '@/lib/dailyGame';
import styles from './DailyAttempt.module.css';

// The official daily attempt is owned by the server/Postgres, never localStorage.
// Practice rounds remain fully available without signing in.
export default function useDailyAttempt(mode,game,date){
 const [state,setState]=useState({kind:'loading',message:''});
 const pending=useRef(false);
 useEffect(()=>{
  if(mode!=='daily'){setState({kind:'free',message:''});return;}
  let alive=true;
  const db=browserDb();
  if(!db){setState({kind:'error',message:'خدمة الحسابات غير مفعّلة. تحدي اليوم غير متاح حالياً.'});return;}
  const read=async()=>{
   if(alive)setState({kind:'loading',message:''});
   try{
    const {data,error}=await db.auth.getSession();
    if(error||!data?.session){if(alive)setState({kind:'login',message:''});return;}
    const res=await fetch('/api/games/daily',{headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
    const json=await res.json();
    if(!alive)return;
    if(res.status===401){setState({kind:'login',message:json.error||''});return;}
    if(!res.ok){setState({kind:'error',message:json.error||'تعذر معرفة حالة المحاولة.'});return;}
    if(json.date!==date){setState({kind:'outdated',message:'بدأ يوم جديد؛ حدّث الصفحة.'});return;}
    if(json.game!==game){setState({kind:'other',date:json.date,game:json.game,message:'تحدي اليوم في لعبة أخرى.'});return;}
    setState({kind:json.used?'used':'ready',nextAt:json.nextAt,message:''});
   }catch{if(alive)setState({kind:'error',message:'تعذر التحقق من المحاولة. حاول بعد التحقق من اتصالك.'});}
  };
  read();
  // Never call Supabase auth methods synchronously inside onAuthStateChange:
  // that event can hold an auth lock; defer follow-up reads to the next tick.
  let authTimer=null;
  const {data:{subscription}}=db.auth.onAuthStateChange(()=>{
   clearTimeout(authTimer);
   authTimer=setTimeout(()=>{if(alive&&!pending.current)read();},0);
  });
  return()=>{alive=false;clearTimeout(authTimer);subscription.unsubscribe();};
 },[mode,game,date]);
 async function reserve(){
  if(mode!=='daily')return true;
  if(pending.current||state.kind!=='ready')return false;
  pending.current=true;setState(previous=>({...previous,kind:'reserving'}));
  try{
   const db=browserDb(),{data,error}=await db.auth.getSession();
   if(error||!data?.session){setState({kind:'login',message:''});return false;}
   const res=await fetch('/api/games/daily',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},
    cache:'no-store',body:JSON.stringify({date,game})});
   const json=await res.json();
   if(res.ok&&json.claimed){setState({kind:'used',nextAt:json.nextAt,message:''});return true;}
   if(json.used){setState({kind:'used',nextAt:json.nextAt,message:json.error});return false;}
   setState({kind:res.status===401?'login':'error',message:json.error||'تعذر بدء التحدي.'});
   return false;
  }catch{setState({kind:'error',message:'فشل الاتصال بالخادم؛ لم تتأكد المحاولة. أعد تحميل الصفحة.'});return false;}
  finally{pending.current=false;}
 }
 return {...state,reserve,canStart:mode!=='daily'||state.kind==='ready'};
}
export function DailyAttemptNotice({daily,mode}){
 if(mode!=='daily')return null;
 if(daily.kind==='ready')return <p className={styles.info}>محاولة واحدة فقط اليوم على مستوى حسابك في ألعاب 967. بمجرد الضغط على «ابدأ»، تُستهلك المحاولة حتى لو أغلقت الصفحة.</p>;
 if(daily.kind==='login')return <div className={styles.notice} role="status"><strong>سجّل الدخول للمشاركة في تحدي اليوم.</strong><p>يمكنك لعب الجولات الحرة دون حساب. التحدي الرسمي محاولة واحدة لكل حساب يومياً.</p><Link href="/login">تسجيل الدخول</Link></div>;
 if(daily.kind==='other')return <div className={styles.notice} role="status"><strong>تحدي اليوم في لعبة أخرى.</strong><p>هناك لعبة رسمية واحدة تتغير يومياً وتكون مشتركة بين جميع المشاركين.</p><Link href={dailyGameUrl(daily.date)}>انتقل إلى تحدي اليوم</Link></div>;
 if(daily.kind==='used')return <div className={styles.used} role="status"><strong>استخدمت محاولتك اليومية بالفعل.</strong><p>{daily.message||'يمكنك العودة لتحدي اليوم التالي. الجولات الحرة ما زالت متاحة.'}</p><small>تُفتح محاولة جديدة عند الساعة 00:00 بتوقيت UTC.</small></div>;
 if(daily.kind==='outdated')return <div className={styles.notice} role="status"><strong>بدأ تحدٍ جديد.</strong><p>{daily.message}</p><button type="button" onClick={()=>location.reload()}>تحديث الصفحة</button></div>;
 if(daily.kind==='error')return <div className={styles.notice} role="alert"><strong>تعذر تفعيل تحدي اليوم.</strong><p>{daily.message}</p><button type="button" onClick={()=>location.reload()}>إعادة المحاولة</button></div>;
 return <p role="status" className={styles.loading}>جارٍ التحقق من محاولتك اليومية…</p>;
}
