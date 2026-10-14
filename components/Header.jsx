'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {ArrowUpLeft,Menu,X} from 'lucide-react';
const links=[{href:'/',label:'الرئيسية'},{href:'/works',label:'أعمالنا'},{href:'/magazine',label:'مجلة 967'},{href:'/yemen-map',label:'اكتشف اليمن'},{href:'/yemeni-products',label:'منتجات يمنية'},{href:'/professionals',label:'مهنيون'}];
export default function Header(){
 const path=usePathname(),[open,setOpen]=useState(false);
 return <header className="site-header"><div className="container header-inner">
  <Link href="/" className="brand" onClick={()=>setOpen(false)} aria-label="مبادرة 967 - الصفحة الرئيسية"><Image className="brand-logo" src="/images/967%20logo%20no%20background.png" alt="967" width={1717} height={1814} priority/><span className="brand-name">مبادرة إعلامية<br/>ومجتمعية يمنية</span></Link>
  <nav className={'nav '+(open?'nav-open':'')} aria-label="التنقل الرئيسي">{links.map(item=><Link key={item.href} href={item.href} className={path===item.href || (item.href!=='/'&&path.startsWith(item.href+'/'))?'active':''} onClick={()=>setOpen(false)}>{item.label}</Link>)}</nav>
  <Link className="header-action" href="/#contact" onClick={()=>setOpen(false)}>تواصل معنا <ArrowUpLeft size={15}/></Link>
  <button className="menu-toggle" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
 </div></header>
}
