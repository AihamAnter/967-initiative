'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpLeft,UserRound} from 'lucide-react';
import useAudience,{audienceRequest} from '@/components/debates/useAudience';
import ProfileAvatar from '@/components/design/ProfileAvatar';
import {SearchMissTracker} from '@/components/analytics/SiteUsageTracker';
import styles from './MemberSearchResults.module.css';

export default function MemberSearchResults({query,mode,exclude,onlyMembers=false,contentCount=0,canTrackMiss=false}){
 const {ready,user}=useAudience();
 const [state,setState]=useState({key:'',users:[],hasMore:false,loading:false,error:''});
 const key=[user?.id||'',query,mode,exclude].join('|');
 useEffect(()=>{
  if(!ready||!user||query.trim().length<2)return;
  let active=true;
  setState({key,users:[],hasMore:false,loading:true,error:''});
  const params=new URLSearchParams({q:query,mode,exclude});
  audienceRequest('/api/members/search?'+params.toString()).then(data=>{
   if(active)setState({key,users:data.users||[],hasMore:Boolean(data.hasMore),loading:false,error:''});
  }).catch(error=>{
   if(active)setState({key,users:[],hasMore:false,loading:false,error:error.message});
  });
  return()=>{active=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the signed-in account changes, not on every session token refresh
 },[ready,user?.id,query,mode,exclude,key]);
 if(!ready)return onlyMembers?<p className={styles.note}>جارٍ التحقق من تسجيل الدخول…</p>:null;
 if(!user){
  if(!onlyMembers)return null;
  const next='/search?'+new URLSearchParams({q:query,type:'members',mode,exclude}).toString();
  return <div className={styles.note}><UserRound size={20}/> البحث عن الأعضاء متاح بعد <Link href={'/login?next='+encodeURIComponent(next)}>تسجيل الدخول</Link>.</div>;
 }
 if(query.trim().length<2)return <p className={styles.note}>اكتب حرفين على الأقل للبحث عن عضو.</p>;
 const current=state.key===key?state:null;
 if(!current||current.loading)return <p className={styles.note} role="status">جارٍ البحث عن الأعضاء…</p>;
 if(current.error)return <p className={styles.note} role="alert">{current.error}</p>;
 if(!current.users.length){
  if(!onlyMembers&&contentCount>0)return null;
  return <>
   {canTrackMiss&&<SearchMissTracker category={onlyMembers?'members':'all'}/>}
   <div className={styles.note}>لم نجد أعضاء مطابقين لهذا الاسم{contentCount===0&&!onlyMembers?' أو نتائج أخرى في المحتوى':''}. جرّب اسمًا أقصر.</div>
  </>;
 }
 return <section className={styles.section} aria-label="نتائج الأعضاء">
  <div className={styles.heading}><h2>الأعضاء</h2><span>عدد النتائج: {current.users.length}{current.hasMore?' أو أكثر':''}</span></div>
  <div className={styles.list}>{current.users.map(person=><Link href={'/members/'+encodeURIComponent(person.id)} className={styles.item} key={person.id}>
   <ProfileAvatar name={person.name} src={person.avatar_url} className={styles.avatar}/>
   <span className={styles.details}><strong>{person.name}</strong><small>{person.is_demo?'مناظر · ملف تجريبي':'عضو في 967'} · عرض الملف الشخصي</small></span>
   <ArrowUpLeft className={styles.arrow} size={18}/>
  </Link>)}</div>
  {current.hasMore&&<p className={styles.hint}>توجد نتائج إضافية. استخدم اسمًا أكثر تحديدًا لتضييق البحث.</p>}
 </section>;
}
