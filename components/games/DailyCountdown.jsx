'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowUpLeft,CalendarClock,Clock3,Flame,Sparkles,Trophy,Zap} from 'lucide-react';
import {DAILY_GAME_TITLES,dailyGameForDate,dailyGameUrl,dailyWindow,nextUtcMidnight,utcDay} from '@/lib/dailyGame';
import styles from './DailyCountdown.module.css';

const two=n=>String(n).padStart(2,'0');

export default function DailyCountdown({initialDate,variant='featured'}){
 const [now,setNow]=useState(null);
 const offset=useRef(0);
 const compact=variant==='compact';

 useEffect(()=>{
  let alive=true;
  let syncing=false;
  const tick=()=>{if(alive)setNow(Date.now()+offset.current);};
  const synchronize=async()=>{
   if(syncing||!alive)return;
   syncing=true;
   const before=Date.now();
   try{
    const response=await fetch('/api/games/clock',{cache:'no-store'});
    if(!response.ok)throw Error('Clock unavailable');
    const json=await response.json();
    const serverTime=Date.parse(json.serverNow);
    const after=Date.now();
    if(Number.isFinite(serverTime)&&alive){
     // Midpoint compensates for network transit: no dependence on the device time zone.
     offset.current=serverTime-(before+after)/2;
     tick();
    }
   }catch{
    // A temporary offline state still displays a working UTC countdown from the device.
   }finally{syncing=false;}
  };
  const onVisibility=()=>{if(document.visibilityState==='visible'){tick();synchronize();}};
  const onFocus=()=>{tick();synchronize();};
  tick();
  synchronize();
  const ticker=setInterval(tick,1000);
  const resync=setInterval(synchronize,5*60*1000);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('focus',onFocus);
  return()=>{
   alive=false;
   clearInterval(ticker);
   clearInterval(resync);
   document.removeEventListener('visibilitychange',onVisibility);
   window.removeEventListener('focus',onFocus);
  };
 },[]);

 // The initial server render never inserts client-specific clock values:
 // hydration stays stable and the first live tick supplies the digits.
 const windowState=now===null?null:dailyWindow(now);
 const currentDate=windowState?.date||initialDate;
 const nextDate=windowState?.nextDate||utcDay(nextUtcMidnight(initialDate));
 const nextAt=windowState?.nextAt||nextUtcMidnight(initialDate);
 const game=DAILY_GAME_TITLES[dailyGameForDate(currentDate)];
 const nextGame=DAILY_GAME_TITLES[dailyGameForDate(nextDate)];
 const href=dailyGameUrl(currentDate);
 const localOpening=windowState?new Intl.DateTimeFormat('ar',{
  weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'
 }).format(new Date(nextAt)):null;

 const digits=<div className={styles.digits} role="timer" aria-label="الوقت المتبقي لانتهاء تحدي اليوم وبداية التحدي القادم">
  {[['ساعة',windowState?.hours],['دقيقة',windowState?.minutes],['ثانية',windowState?.seconds]].map(([label,value],i)=>
   <div className={styles.digitPair} key={label}>
    {i>0&&<span className={styles.colon} aria-hidden="true">:</span>}
    <span className={styles.digit}><strong>{value===undefined?'--':two(value)}</strong><small>{label}</small></span>
   </div>)}
 </div>;

 if(compact)return <div className={styles.compact} aria-label="موعد تحدي 967 القادم">
  <div className={styles.compactLead}><Clock3 size={18} aria-hidden="true"/><span>ينتهي تحدي اليوم ويبدأ التحدي القادم بعد:</span></div>
  {digits}
  <p>التالي: <strong>{nextGame}</strong> · <time dateTime={nextAt}>00:00 UTC</time>
   {localOpening&&<span className={styles.local}> · {localOpening} بتوقيت جهازك</span>}</p>
 </div>;

 return <section className={styles.panel} id="daily-challenge" aria-labelledby="daily-countdown-title">
  <div className={styles.main}>
   <span className={styles.eyebrow}><Flame size={16} aria-hidden="true"/> DAILY CHALLENGE / 967</span>
   <h3 id="daily-countdown-title">تحدي اليوم <span>على وشك التغيّر!</span></h3>
   <p className={styles.explanation}>يتنافس الجميع في لعبة واحدة كل يوم. لديك محاولة رسمية واحدة بحسابك، ومهلة 7 ثوانٍ لكل سؤال.</p>
   <div className={styles.gameNames}>
    <span><Trophy size={15}/> اليوم: <strong>{game}</strong></span>
    <span><Sparkles size={15}/> القادم: <strong>{nextGame}</strong></span>
   </div>
   <Link href={href} className={styles.action}>العب تحدي اليوم <ArrowUpLeft size={18} aria-hidden="true"/></Link>
  </div>
  <div className={styles.timeSection}>
   <span className={styles.clockHeader}><Clock3 size={17} aria-hidden="true"/> ينتهي تحدي اليوم ويفتح القادم بعد</span>
   {digits}
   <div className={styles.nextOpening}><CalendarClock size={17} aria-hidden="true"/>
    <span>التحدي القادم يبدأ <time dateTime={nextAt}>00:00 UTC</time>{localOpening&&<> · {localOpening} بتوقيتك</>}</span>
   </div>
   <p className={styles.utcNote}><Zap size={14} aria-hidden="true"/> توقيت موحد لجميع اللاعبين · يتجدد العدّاد والرابط تلقائيًا</p>
  </div>
 </section>;
}
