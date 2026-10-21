'use client';
import {useEffect,useRef} from 'react';
import {ChevronDown} from 'lucide-react';
export default function DebateDisclosure({id,title,description,children,className='',defaultOpen=false}){
 const ref=useRef(null);
 useEffect(()=>{
  const reveal=()=>{let target;try{target=document.getElementById(decodeURIComponent(location.hash.slice(1)));}catch{return;}if(target&&ref.current?.contains(target)){ref.current.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}};
  reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);
 },[]);
 return <details id={id} ref={ref} open={defaultOpen} className={'debate-disclosure '+className}><summary><h2><span>{title}{description&&<small>{description}</small>}</span><ChevronDown size={20} aria-hidden="true"/></h2></summary><div className="debate-disclosure-body">{children}</div></details>;
}
