'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,ArrowUpLeft,Gamepad2,Link2,LockKeyhole,ShieldCheck,Swords,Timer,Trophy} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {FRIEND_GAMES,FRIEND_SECONDS,friendGameTitle} from '@/lib/friendChallenge';
import styles from './FriendChallenge.module.css';

export default function FriendChallengeCreate(){
 const router=useRouter();
 const [game,setGame]=useState('quiz'),[seconds,setSeconds]=useState(15);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function create(){
  if(busy)return;
  setError('');setBusy(true);
  try{
   const db=browserDb();
   const {data}=await db?.auth.getSession()||{};
   if(!data?.session?.access_token)throw Error('يجب تسجيل الدخول بحسابك المؤكد لإنشاء تحدٍّ خاص.');
   const response=await fetch('/api/games/friends',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},
    body:JSON.stringify({game,seconds}),cache:'no-store'
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'تعذر إنشاء رابط التحدي.');
   if(!result.url?.startsWith('/games/friends/'))throw Error('تعذر فتح رابط التحدي.');
   router.push(result.url);
  }catch(e){setError(e.message||'تعذر إنشاء التحدي.');setBusy(false);}
 }
 return <section className={styles.panel} aria-labelledby="friends-create-title">
  <span className={styles.overline}><Swords size={17}/> FRIEND DUEL / 967</span>
  <h2 id="friends-create-title">واجه صديقك في <em>التحدي نفسه</em></h2>
  <p className={styles.lead}>اختر إحدى ألعاب اليمن التسع وحدد وقت السؤال، ثم أنشئ رابطًا خاصًا. أنت وصديقك ستلعبان الأسئلة العشرة نفسها، وستُعتمد النتائج من الخادم.</p>
  <div className={styles.fields}>
   <fieldset className={styles.fieldset}>
    <legend><Gamepad2 size={18}/> اختر اللعبة</legend>
    <div className={styles.gameGrid}>
     {FRIEND_GAMES.map(id=><button key={id} type="button" disabled={busy} aria-pressed={game===id} onClick={()=>setGame(id)}>{friendGameTitle(id)}</button>)}
    </div>
   </fieldset>
   <fieldset className={styles.fieldset}>
    <legend><Timer size={18}/> وقت كل سؤال</legend>
    <div className={styles.secondsGrid}>
     {FRIEND_SECONDS.map(n=><button type="button" key={n} aria-pressed={seconds===n} disabled={busy} onClick={()=>setSeconds(n)}>{n} ثانية</button>)}
    </div>
    <p className={styles.micro}>يتوقف المؤقت بعد الإجابة حتى يبدأ السؤال التالي. المهلة نفسها للطرفين.</p>
   </fieldset>
  </div>
  <div className={styles.reassurance}>
   <span><Link2 size={17}/> رابط خاص للاعبين فقط</span>
   <span><ShieldCheck size={17}/> النقاط تُحسب على الخادم</span>
   <span><Trophy size={17}/> مستقل عن تحدي اليوم</span>
  </div>
  {error&&<p className={styles.error} role="alert">{error} <Link href="/login">تسجيل الدخول</Link></p>}
  <button type="button" className={styles.primary} disabled={busy} onClick={create}><Swords size={20}/> {busy?'جارٍ إنشاء التحدي…':'أنشئ التحدي وشارك الرابط'} <ArrowUpLeft size={17}/></button>
  <p className={styles.micro}><LockKeyhole size={14}/> يلزم حساب مسجل ومؤكد لكل لاعب. يُغلق الرابط بعد سبعة أيام، ولكل حساب محاولة واحدة في التحدي.</p>
 </section>;
}
