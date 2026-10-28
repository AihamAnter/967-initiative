'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Trophy} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import styles from './MyGameRank.module.css';
export default function MyGameRank(){
 const [mine,setMine]=useState(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const db=browserDb();if(!db)return;
    const {data}=await db.auth.getSession();
    const token=data?.session?.access_token;
    if(!token)return;
    const response=await fetch('/api/games/leaderboard?period=all',{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    if(!response.ok)return;
    const json=await response.json();
    if(active)setMine(json.mine);
   }catch{}finally{if(active)setReady(true);}
  })();
  return()=>{active=false;};
 },[]);
 return <section className={styles.rank} aria-label="ترتيبي في ألعاب 967">
  <div className={styles.title}><Trophy size={24}/><div><h3>ترتيبي في ألعاب 967</h3><p>المنافسة الرسمية الموحدة بين الألعاب الأربع</p></div></div>
  {mine?<div className={styles.stats}><strong>#{Number(mine.rank).toLocaleString('ar')}</strong><span>المركز العام</span><strong>{Number(mine.score).toLocaleString('ar')} XP</strong><span>إجمالي النقاط</span></div>
  :<p className={styles.noRank}>{ready?'لم تكمل تحديًا رسميًا بعد، أو لا توجد نتائج متاحة لحسابك.':'جارٍ تحميل ترتيبك…'}</p>}
  <Link href="/games/leaderboard">لوحة المتصدرين <ArrowLeft size={17}/></Link>
 </section>;
}
