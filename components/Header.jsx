'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {ArrowUpLeft,Menu,X} from 'lucide-react';
const links=[{href:'/',label:'الرئيسية'},{href:'/works',label:'أعمالنا'},{href:'/magazine',label:'مجلة 967'}];
export default function Header(){
 const path=usePathname(),[open,setOpen]=useState(false);
 return <header className="site-header"><div className="container header-inner">
  <Link href="/" className="brand" onClick={()=>setOpen(false)} aria-label="مبادرة 967 - الصفحة الرئيسية"><span className="brand-mark">967<span className="brand-dot">.</span></span><span className="brand-name">مبادرة إعلامية<br/>ومجتمعية يمنية</span></Link>
  <nav className={'nav '+(open?'nav-open':'')} aria-label="التنقل الرئيسي">{links.map(item=><Link key={item.href} href={item.href} className={path===item.href || (item.href!=='/'&&path.startsWith(item.href+'/'))?'active':''} onClick={()=>setOpen(false)}>{item.label}</Link>)}</nav>
  <Link className="header-action" href="/#contact" onClick={()=>setOpen(false)}>تواصل معنا <ArrowUpLeft size={15}/></Link>
  <button className="menu-toggle" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
 </div></header>
}
