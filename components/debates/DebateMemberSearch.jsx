'use client';
import {useEffect,useId,useState} from 'react';
import {Search,UserRound} from 'lucide-react';
import {audienceRequest} from '@/components/debates/useAudience';
import ProfileAvatar from '@/components/design/ProfileAvatar';
import styles from './DebateMemberSearch.module.css';

export default function DebateMemberSearch({onSelect,disabled=false,label='البحث عن عضو مسجل',help=''}) {
 const id=useId(),[query,setQuery]=useState(''),[items,setItems]=useState([]);
 const [pending,setPending]=useState(false),[choosing,setChoosing]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const q=query.trim();
  if(q.length<2){setItems([]);setPending(false);setError('');return;}
  let active=true;
  setPending(true);setError('');
  const timer=setTimeout(()=>{
   audienceRequest('/api/admin/debates/member-search?'+new URLSearchParams({q}))
    .then(data=>{if(active)setItems(data.members||[]);})
    .catch(err=>{if(active){setItems([]);setError(err.message);}})
    .finally(()=>{if(active)setPending(false);});
  },300);
  return()=>{active=false;clearTimeout(timer);};
 },[query]);
 async function choose(member){
  if(disabled||choosing)return;
  setChoosing(true);setError('');
  try{
   const accepted=await onSelect(member);
   if(accepted!==false){setQuery('');setItems([]);}
  }catch(e){setError(e.message||'تعذر اختيار هذا العضو.');}
  finally{setChoosing(false);}
 }
 return <div className={styles.wrap}>
  <label htmlFor={id} className={styles.label}><Search size={16}/>{label}</label>
  <input id={id} className={styles.input} type="search" autoComplete="off"
   value={query} onChange={event=>setQuery(event.target.value)}
   placeholder="اكتب اسم العضو (حرفان على الأقل)" maxLength={80} disabled={disabled||choosing}/>
  {help&&<p className={styles.hint}>{help}</p>}
  {query.trim().length>=2&&<div className={styles.results} role="status">
   {pending?<p>جارٍ البحث…</p>:error?<p className={styles.error}>{error}</p>:
    items.length?items.map(member=><button className={styles.item} type="button" key={member.id}
     onClick={()=>choose(member)} disabled={disabled||choosing}>
     <ProfileAvatar name={member.name} src={member.avatar_url} className={styles.avatar}/>
     <span>{member.name}</span><UserRound size={16}/>
    </button>):<p>لا توجد أسماء مطابقة أو متاحة للظهور.</p>}
  </div>}
 </div>;
}
