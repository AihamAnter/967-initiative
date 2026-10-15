'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpLeft,LogIn,Menu,X} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
const links=[{href:'/',label:'الرئيسية'},{href:'/works',label:'أعمالنا'},{href:'/magazine',label:'مجلة 967'},{href:'/yemen-in-numbers',label:'اليمن بالأرقام'},{href:'/yemen-map',label:'اكتشف اليمن'},{href:'/yemeni-products',label:'منتجات يمنية'},{href:'/professionals',label:'مهنيون'}];
export default function Header(){
 const path=usePathname(),[open,setOpen]=useState(false),[sessionUser,setSessionUser]=useState(undefined),db=useMemo(()=>browserDb(),[]);
 useEffect(()=>{if(!db){setSessionUser(null);return;}let live=true;db.auth.getSession().then(({data})=>{if(live)setSessionUser(data.session?.user||null)}).catch(()=>{if(live)setSessionUser(null)});const {data:sub}=db.auth.onAuthStateChange((_event,session)=>{if(live)setSessionUser(session?.user||null)});return()=>{live=false;sub.subscription.unsubscribe()};},[db]);
 return <header className="site-header"><div className="container header-inner">
  <Link href="/" className="brand" onClick={()=>setOpen(false)} aria-label="مبادرة 967 - الصفحة الرئيسية"><Image className="brand-logo" src="/images/967%20logo%20no%20background.png" alt="967" width={1717} height={1814} priority/><span className="brand-name">مبادرة إعلامية<br/>ومجتمعية يمنية</span></Link>
  <nav className={'nav '+(open?'nav-open':'')} aria-label="التنقل الرئيسي">{links.map(item=><Link key={item.href} href={item.href} className={path===item.href || (item.href!=='/'&&path.startsWith(item.href+'/'))?'active':''} onClick={()=>setOpen(false)}>{item.label}</Link>)}</nav>
  {sessionUser===null&&<Link className={'header-admin-entry '+(path==='/admin'?'active':'')} href="/admin" onClick={()=>setOpen(false)} aria-label="تسجيل الدخول"><LogIn size={16}/><span>تسجيل الدخول</span></Link>}
  <Link className="header-action" href="/#contact" onClick={()=>setOpen(false)}>تواصل معنا <ArrowUpLeft size={15}/></Link>
  <button className="menu-toggle" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
 </div></header>
}
