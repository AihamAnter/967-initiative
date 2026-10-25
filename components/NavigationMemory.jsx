'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {navigationMemoryPath,navigationMemoryKey} from '@/lib/navigationContext';
export function rememberNavigation(){
 const path=navigationMemoryPath(location.pathname+location.search);if(!path)return;
 try{const old=JSON.parse(sessionStorage.getItem(navigationMemoryKey)||'{}');old[path]={y:scrollY,at:Date.now()};const entries=Object.entries(old).sort((a,b)=>b[1].at-a[1].at).slice(0,25);sessionStorage.setItem(navigationMemoryKey,JSON.stringify(Object.fromEntries(entries)));}catch{}
}
export default function NavigationMemory(){
 const pathname=usePathname();
 useEffect(()=>{const click=e=>{if(e.target.closest?.('a[href]'))rememberNavigation();};document.addEventListener('click',click,true);window.addEventListener('pagehide',rememberNavigation);return()=>{document.removeEventListener('click',click,true);window.removeEventListener('pagehide',rememberNavigation);};},[]);
 useEffect(()=>{
  const path=navigationMemoryPath(location.pathname+location.search);if(!path)return;
  let target;try{target=JSON.parse(sessionStorage.getItem(navigationMemoryKey)||'{}')[path];}catch{}
  if(!target||Date.now()-target.at>2*3600000||!Number.isFinite(target.y))return;
  let stopped=false,lastHeight=0,stable=0;const started=Date.now();const stop=()=>{stopped=true;};window.addEventListener('wheel',stop,{once:true,passive:true});window.addEventListener('touchstart',stop,{once:true,passive:true});window.addEventListener('keydown',stop,{once:true});
  const timer=setInterval(()=>{if(stopped||Date.now()-started>6000){clearInterval(timer);return;}const h=document.documentElement.scrollHeight;stable=h===lastHeight?stable+1:0;lastHeight=h;if(h>=target.y+innerHeight){scrollTo({top:target.y,behavior:'instant'});if(stable>=3)clearInterval(timer);}},120);
  return()=>{clearInterval(timer);window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);window.removeEventListener('keydown',stop);};
 },[pathname]);return null;
}
