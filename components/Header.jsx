'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {ArrowUpLeft, ChevronDown, Menu, Search, X} from 'lucide-react';
import BrandLogo from './BrandLogo';

const groups = [
  {label: 'المحتوى', links: [['/works', 'الأعمال الإعلامية'], ['/magazine', 'مجلة 967']]},
  {label: 'المعرفة', links: [['/yemen-in-numbers', 'اليمن بالأرقام'], ['/yemen-map', 'اكتشف اليمن']]},
  {label: 'الأدلة', links: [['/yemeni-products', 'منتجات يمنية'], ['/professionals', 'المهنيون']]},
  {label: 'المبادرة', links: [['/#about', 'من نحن'], ['/#projects', 'مشاريعنا'], ['/contribute', 'تواصل وشارك']]},
];
export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  const close = () => {setOpen(false); header.current?.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));};
  useEffect(() => {setOpen(false);}, [path]);
  useEffect(() => {
    const onKey = event => {if (event.key === 'Escape' && (toggle.current?.getAttribute('aria-expanded') === 'true' || header.current?.querySelector('details[open]'))) {close(); toggle.current?.focus();}};
    const onClick = event => {if (!header.current?.contains(event.target)) close();};
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onClick);};
  }, []);
  const active = href => href !== '/' && !href.includes('#') && (path === href || path.startsWith(href + '/'));
  return <header className="site-header" ref={header}><div className="container header-inner">
    <Link href="/" className="brand" onClick={close} aria-label="مبادرة 967 — الرئيسية"><BrandLogo priority/><span className="brand-name">مساحة يمنية<br/><strong>للمعرفة والمشاركة</strong></span></Link>
    <nav id="main-navigation" className={`platform-nav ${open ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
      <Link className={`nav-home ${path === '/' ? 'active' : ''}`} href="/" aria-current={path === '/' ? 'page' : undefined} onClick={close}>الرئيسية</Link>
      {groups.map(group => <details className={`nav-group ${group.links.some(([href]) => active(href)) ? 'active' : ''}`} key={group.label} onToggle={event => {if (event.currentTarget.open) header.current?.querySelectorAll('details[open]').forEach(item => {if (item !== event.currentTarget) item.removeAttribute('open');});}}>
        <summary>{group.label}<ChevronDown size={14}/></summary><div className="nav-dropdown">{group.links.map(([href, label]) => <Link href={href} key={href} className={active(href) ? 'active' : ''} aria-current={active(href) ? 'page' : undefined} onClick={close}>{label}<ArrowUpLeft size={14}/></Link>)}</div>
      </details>)}
      <div className="mobile-navigation-groups">{groups.map(group=><div key={group.label}><span>{group.label}</span>{group.links.map(([href,label])=><Link href={href} key={href} aria-current={active(href)?'page':undefined} onClick={close}>{label}<ArrowUpLeft size={14}/></Link>)}</div>)}</div>
      <Link href="/search" className="mobile-search-link" onClick={close}><Search size={18}/> البحث في المنصة</Link>
    </nav>
    <div className="header-tools"><Link href="/search" className="header-search" aria-label="البحث في المنصة" onClick={close}><Search size={21}/></Link><Link href="/contribute" className="header-action" onClick={close}>كن جزءاً من الحكاية <ArrowUpLeft size={16}/></Link><button ref={toggle} type="button" className="menu-toggle" aria-controls="main-navigation" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
  </div></header>;
}
