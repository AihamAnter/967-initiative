'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {ArrowUpLeft, ChevronDown, LayoutDashboard, LogIn, Menu, Search, X} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {browserDb} from '@/lib/supabase';

const groups = [
  {label: 'المحتوى', links: [['/works', 'الأعمال الإعلامية'], ['/magazine', 'مجلة 967']]},
  {label: 'المعرفة', links: [['/yemen-in-numbers', 'اليمن بالأرقام'], ['/yemen-map', 'اكتشف اليمن']]},
  {label: 'الأدلة', links: [['/yemeni-products', 'منتجات يمنية'], ['/professionals', 'المهنيون']]},
  {label: 'المبادرة', links: [['/#about', 'من نحن'], ['/#projects', 'مشاريعنا'], ['/contribute', 'تواصل وشارك']]},
];
export default function Header({actionLabel='كن جزءاً من الحكاية'}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  const close = () => {setOpen(false); header.current?.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));};
  useEffect(() => {setOpen(false);}, [path]);
  useEffect(() => {
    const db = browserDb();
    if (!db) {setSignedIn(false); return;}
    let active = true;
    let sessionChanged = false;
    let requestId = 0;
    const timers = new Set();
    const updateSession = session => {
      if (!active) return;
      const currentRequest = ++requestId;
      setSignedIn(Boolean(session?.user));
      setCanEdit(false);
      if (!session?.user) return;
      // Run database calls after Supabase has released its auth event lock.
      const timer = window.setTimeout(async () => {
        timers.delete(timer);
        if (!active || currentRequest !== requestId) return;
        try {
          let {data, error} = await db.from('editors').select('user_id,role').eq('user_id', session.user.id).maybeSingle();
          // Match the dashboard's compatibility with installations predating editor roles.
          if (error && /role/i.test(error.message || '') && ['42703', 'PGRST204'].includes(error.code)) {
            const legacy = await db.from('editors').select('user_id').eq('user_id', session.user.id).maybeSingle();
            data = legacy.data ? {...legacy.data, role: 'admin'} : null;
            error = legacy.error;
          }
          if (active && currentRequest === requestId) setCanEdit(!error && Boolean(data) && ['admin', 'management'].includes(data.role));
        } catch {
          if (active && currentRequest === requestId) setCanEdit(false);
        }
      }, 0);
      timers.add(timer);
    };
    const {data: {subscription}} = db.auth.onAuthStateChange((_event, session) => {
      sessionChanged = true;
      updateSession(session);
    });
    db.auth.getSession().then(({data}) => {
      if (active && !sessionChanged) updateSession(data.session);
    }).catch(() => {
      if (active && !sessionChanged) updateSession(null);
    });
    return () => {active = false; requestId++; timers.forEach(timer => window.clearTimeout(timer)); subscription.unsubscribe();};
  }, []);
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
    <div className="header-tools"><Link href="/search" className="header-search" aria-label="البحث في المنصة" onClick={close}><Search size={21}/></Link>{signedIn === false && <Link href="/admin" className="header-login" aria-current={path === '/admin' ? 'page' : undefined} onClick={close}><LogIn size={17} aria-hidden="true"/><span>تسجيل الدخول</span></Link>}{signedIn === true && canEdit && <Link href="/admin" className="header-login" aria-current={path === '/admin' ? 'page' : undefined} onClick={close}><LayoutDashboard size={17} aria-hidden="true"/><span>لوحة التحرير</span></Link>}<Link href="/contribute" className="header-action" onClick={close}>{actionLabel} <ArrowUpLeft size={16}/></Link><button ref={toggle} type="button" className="menu-toggle" aria-controls="main-navigation" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
  </div></header>;
}
