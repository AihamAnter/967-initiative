'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Bookmark, ChevronDown, Compass, House, Menu, PlayCircle, Search, X} from 'lucide-react';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import useSessionDb from './useSessionDb';
import {usePageVisibility} from './PageVisibilityProvider';
import {resolveNavSections, utilityLinks} from '@/lib/navigation';

// Masthead: one row on wide screens, a menu sheet below 1100px.
// Sections come from lib/navigation.js, shared with the footer and home doors.
export default function Header({actionLabel = 'ساهم معنا', contentLinks = []}) {
  const {visibility, isVisible} = usePageVisibility();
  const {db, ready: sessionReady} = useSessionDb();
  const sections = useMemo(() => resolveNavSections({contentLinks, visibility}).map(section => ({...section, links: section.links.filter(([href]) => isVisible(href))})).filter(section => section.links.length), [contentLinks, visibility, isVisible]);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  const closeDisclosures = () => header.current?.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));
  const close = () => {setOpen(false); closeDisclosures();};
  useEffect(() => {setOpen(false); closeDisclosures();}, [path]);
  useEffect(() => {
    if (open) header.current?.querySelector('#main-navigation a, #main-navigation input')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia('(max-width: 1099px)');
    if (!mobile.matches) {setOpen(false); return;}
    // The sheet scrolls on its own; background content and footer must not take focus.
    const oldOverflow = document.body.style.overflow;
    const background = [document.getElementById('content'), document.querySelector('.ed-footer')].filter(Boolean);
    const previous = background.map(node => node.inert);
    document.body.style.overflow = 'hidden';
    background.forEach(node => {node.inert = true;});
    const onViewportChange = () => {if (!mobile.matches) setOpen(false);};
    mobile.addEventListener('change', onViewportChange);
    return () => {
      mobile.removeEventListener('change', onViewportChange);
      document.body.style.overflow = oldOverflow;
      background.forEach((node, index) => {node.inert = previous[index];});
    };
  }, [open]);
  useEffect(() => {
    if (!db) {if (sessionReady) setSignedIn(false); return;}
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
  }, [db, sessionReady]);
  useEffect(() => {
    const onKey = event => {
      const disclosure = header.current?.querySelector('.ed-nav-group[open]');
      const mobileOpen = toggle.current?.getAttribute('aria-expanded') === 'true';
      if (event.key === 'Escape' && (mobileOpen || disclosure)) {
        close();
        if (mobileOpen) toggle.current?.focus(); else disclosure?.querySelector('summary')?.focus();
      }
    };
    const onClick = event => {if (!header.current?.contains(event.target)) close();};
    const onFocus = event => {if (!header.current?.contains(event.target)) close();};
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    document.addEventListener('focusin', onFocus);
    return () => {document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onClick); document.removeEventListener('focusin', onFocus);};
  }, []);
  const active = href => href !== '/' && !href.includes('#') && (path === href || path.startsWith(href + '/'));
  const sectionActive = section => section.links.some(([href]) => active(href));
  const onlyOneOpen = event => {if (event.currentTarget.open) header.current?.querySelectorAll('.ed-nav-group[open]').forEach(item => {if (item !== event.currentTarget) item.removeAttribute('open');});};
  const account = signedIn === true ? (canEdit ? utilityLinks.editor : utilityLinks.account) : signedIn === false ? utilityLinks.login : null;
  const savedVisible = isVisible(utilityLinks.saved[0]);
  // Timed games, lesson stages, the PDF reader and admin keep the whole screen.
  const immersive = /^\/(games\/.+|school\/.+\/.+|magazine\/.+|admin)/.test(path || '');

  return <header className="ed-header" ref={header} data-open={open || undefined} data-tabbar={!immersive || undefined}>
    <div className="ed-header-inner">
      <Link href="/" className="ed-brand" onClick={close} aria-label="مبادرة 967 — الرئيسية"><BrandLogo priority className="ed-brand-mark"/><span className="ed-brand-name" aria-hidden="true">مبادرة <b>967</b></span></Link>
      <nav id="main-navigation" className="ed-nav" aria-label="التنقل الرئيسي">
        <form action="/search" role="search" className="ed-nav-search">
          <label htmlFor="menu-search" className="sr-only">ابحث في منصة 967</label>
          <Search size={18} aria-hidden="true"/>
          <input id="menu-search" name="q" type="search" placeholder="ابحث في منصة 967" maxLength={150}/>
          <button type="submit">ابحث</button>
        </form>
        <ul className="ed-nav-list">
          {sections.map(section => <li key={section.id} className="ed-nav-item" data-section={section.id}>
            {section.standalone && <Link className="ed-nav-direct" href={section.links[0][0]} aria-current={active(section.links[0][0]) || sectionActive(section) ? 'page' : undefined} onClick={close}>{section.label}</Link>}
            <details className="ed-nav-group" data-standalone={section.standalone || undefined} data-active={sectionActive(section) || undefined} onToggle={onlyOneOpen}>
              <summary>{section.label}<ChevronDown size={15} aria-hidden="true"/></summary>
              <div className="ed-nav-panel">
                <p className="ed-nav-lead">{section.description}</p>
                <ul>{section.links.map(([href, label]) => <li key={href}><Link href={href} aria-current={active(href) ? 'page' : undefined} onClick={close}>{label}</Link></li>)}</ul>
              </div>
            </details>
          </li>)}
        </ul>
        <div className="ed-nav-utility">
          {savedVisible && <Link href={utilityLinks.saved[0]} onClick={close}>{utilityLinks.saved[1]}</Link>}
          {account && <Link href={account[0]} aria-current={path === account[0] ? 'page' : undefined} onClick={close}>{account[1]}</Link>}
          {isVisible('/contribute') && <Link href="/contribute" onClick={close}>{actionLabel}</Link>}
        </div>
      </nav>
      <div className="ed-tools">
        {(path==='/' || path==='/works' || path.startsWith('/works/') || path==='/yemen-in-numbers' || path.startsWith('/yemen-in-numbers/indicator/')) && <ThemeToggle/>}
        <Link href="/search" className="ed-tool ed-tool-icon" aria-label="البحث في المنصة" aria-current={path === '/search' ? 'page' : undefined} onClick={close}><Search size={20} aria-hidden="true"/></Link>
        {savedVisible && <Link href={utilityLinks.saved[0]} className="ed-tool ed-tool-icon ed-wide-only" aria-label={utilityLinks.saved[1]} title={utilityLinks.saved[1]} aria-current={path === utilityLinks.saved[0] ? 'page' : undefined} onClick={close}><Bookmark size={19} aria-hidden="true"/></Link>}
        {account && <Link href={account[0]} className="ed-tool ed-tool-text ed-wide-only" aria-current={path === account[0] ? 'page' : undefined} onClick={close}>{account[1]}</Link>}
        {isVisible('/contribute') && <Link href="/contribute" className="ed-tool ed-tool-cta ed-wide-only" onClick={close}>{actionLabel}</Link>}
        <button ref={toggle} type="button" className="ed-tool ed-menu-toggle" aria-controls="main-navigation" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={22} aria-hidden="true"/> : <Menu size={22} aria-hidden="true"/>}<span className="ed-menu-word" aria-hidden="true">{open ? 'إغلاق' : 'القائمة'}</span></button>
      </div>
    </div>
    {/* Phones: a thumb-reach tab bar for the most used destinations and the menu. */}
    {!immersive && <nav className="ed-tabbar" aria-label="اختصارات سريعة">
      <Link href="/" aria-current={path === '/' ? 'page' : undefined} onClick={close}><House size={21} aria-hidden="true"/><span>الرئيسية</span></Link>
      {isVisible('/works') && <Link href="/works" aria-current={active('/works') ? 'page' : undefined} onClick={close}><PlayCircle size={21} aria-hidden="true"/><span>الإعلام</span></Link>}
      {isVisible('/yemen-in-numbers') && <Link href="/yemen-in-numbers" aria-current={active('/yemen-in-numbers') ? 'page' : undefined} onClick={close}><Compass size={21} aria-hidden="true"/><span>المعرفة</span></Link>}
      <Link href="/search" aria-current={path === '/search' ? 'page' : undefined} onClick={close}><Search size={21} aria-hidden="true"/><span>البحث</span></Link>
      <button type="button" aria-controls="main-navigation" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={21} aria-hidden="true"/> : <Menu size={21} aria-hidden="true"/>}<span>{open ? 'إغلاق' : 'القائمة'}</span></button>
    </nav>}
  </header>;
}
