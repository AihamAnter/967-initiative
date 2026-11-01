'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowUpLeft, Bookmark, ChevronDown, House, LayoutDashboard, LayoutGrid, LogIn, Search, UserRound, X} from 'lucide-react';
import BrandLogo from './BrandLogo';
import useSessionDb from './useSessionDb';
import {usePageVisibility} from './PageVisibilityProvider';
import {activeTask, isActivePath, navTasks} from '@/lib/navigation';
import styles from './shell/Header.module.css';

// Design B header: one row of six task verbs (desktop panels), a real search
// field, and on small screens a thumb-reach tab bar plus a full-height
// "sections" sheet listing every destination under the same six verbs.
const SHEET_QUERY = '(max-width: 1023px)';
// Focused, timed or editorial screens keep the whole viewport: no tab bar there.
const GAME_PLAY = /^\/games\/(?!(?:leaderboard|achievements)$)[^/]+/;
export function showsTabBar(path = '') {
  return !(/^\/admin(\/|$)/.test(path) || /^\/school\/studio/.test(path) || GAME_PLAY.test(path)
    || /^\/school\/courses\/[^/]+\/[^/]+/.test(path) || /^\/school\/writing\/(musnad|arud)\/(?!alphabet$|practice$)[^/]+$/.test(path));
}

export default function Header({actionLabel = 'كن جزءاً من الحكاية', contentLinks = []}) {
  const {isVisible} = usePageVisibility();
  const {db, ready: sessionReady} = useSessionDb();
  const tasks = navTasks({isVisible, contentLinks});
  const path = usePathname();
  const current = activeTask(path, tasks);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [signedIn, setSignedIn] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  const opener = useRef(null);
  const tabbar = useRef(null);
  const withTabs = showsTabBar(path);
  const close = useCallback(() => {setOpen(false); setPanel(null);}, []);

  useEffect(() => {setOpen(false); setPanel(null);}, [path]);
  useEffect(() => {
    if (open) header.current?.querySelector('#main-navigation a')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia(SHEET_QUERY);
    if (!mobile.matches) {setOpen(false);return;}
    // The sheet scrolls within the viewport; do not let background cards,
    // forms or footer receive keyboard focus while it is open.
    const oldOverflow = document.body.style.overflow;
    const background = [document.getElementById('content'), document.querySelector('[data-site-footer]')].filter(Boolean);
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
    if (!db) {if (sessionReady) setSignedIn(false);return;}
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
      if (event.key !== 'Escape') return;
      const mobileOpen = toggle.current?.getAttribute('aria-expanded') === 'true';
      const trigger = header.current?.querySelector('[data-panel-trigger][aria-expanded="true"]');
      if (!mobileOpen && !trigger) return;
      close();
      if (mobileOpen) (opener.current && document.contains(opener.current) ? opener.current : toggle.current)?.focus();
      else trigger?.focus();
    };
    const inside = target => header.current?.contains(target) || tabbar.current?.contains(target);
    const onPointer = event => {if (!inside(event.target)) close();};
    const onFocus = event => {if (!inside(event.target)) setPanel(null);};
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    return () => {document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); document.removeEventListener('focusin', onFocus);};
  }, [close]);

  const account = signedIn === true
    ? canEdit ? {href: '/admin', label: 'لوحة التحرير', icon: LayoutDashboard} : {href: '/account', label: 'حسابي', icon: UserRound}
    : signedIn === false ? {href: '/login', label: 'تسجيل الدخول', icon: LogIn} : null;
  const contributeVisible = isVisible('/contribute');

  return <><header className={styles.header} ref={header} data-site-header data-tabs={withTabs || undefined}>
    <div className={styles.bar}>
      <Link href="/" className={styles.brand} onClick={close} aria-label="مبادرة 967 — الرئيسية"><BrandLogo priority/><span className={styles.brandText}>مبادرة <strong>967</strong></span></Link>

      <nav className={styles.tasks} aria-label="الأقسام الرئيسية">
        <ul>{tasks.map(task => {
          const expanded = panel === task.id;
          return <li key={task.id} className={styles.task} data-tone={task.tone}>
            <button type="button" data-panel-trigger className={styles.trigger} aria-expanded={expanded} aria-controls={'panel-' + task.id} data-current={current === task.id || undefined} onClick={() => setPanel(value => value === task.id ? null : task.id)}>
              <i className={styles.dot} aria-hidden="true"/>{task.verb}<ChevronDown size={15} aria-hidden="true"/>
            </button>
            <div id={'panel-' + task.id} className={styles.panel} hidden={!expanded}>
              {/* Contents mount on demand: the footer already lists every destination for crawlers and no-JS. */}
              {expanded && <><div className={styles.panelHead}><span className={styles.panelSection}>{task.section}</span><p>{task.hint}</p></div>
              <ul className={styles.panelLinks}>{task.links.map(([href, label]) => <li key={href}><Link href={href} aria-current={isActivePath(path, href) ? 'page' : undefined} onClick={close}>{label}</Link></li>)}</ul>
              {task.id === 'join' && contributeVisible && <Link className={styles.panelAction} href="/contribute" onClick={close}>{actionLabel}<ArrowUpLeft size={16} aria-hidden="true"/></Link>}</>}
            </div>
          </li>;
        })}</ul>
      </nav>

      <div className={styles.tools}>
        <form action="/search" role="search" className={styles.search}>
          <label htmlFor="header-search" className="sr-only">ابحث في منصة 967</label>
          <Search size={18} aria-hidden="true"/>
          <input id="header-search" name="q" type="search" maxLength={150} placeholder="ابحث عن موضوع، رقم، مكان…" autoComplete="off"/>
        </form>
        <Link href="/search" className={styles.iconLink} aria-label="البحث في المنصة" onClick={close}><Search size={20} aria-hidden="true"/></Link>
        {account && <Link href={account.href} className={styles.account} aria-current={path === account.href ? 'page' : undefined} onClick={close}><account.icon size={18} aria-hidden="true"/><span>{account.label}</span></Link>}
        <button ref={toggle} type="button" className={styles.menuToggle} aria-controls="main-navigation" aria-label={open ? 'إغلاق قائمة الأقسام' : 'فتح قائمة الأقسام'} aria-expanded={open} onClick={() => {opener.current = null; setOpen(value => !value);}}>
          {open ? <X size={22} aria-hidden="true"/> : <span className={styles.menuGlyph} aria-hidden="true"><i/><i/><i/><i/></span>}<span className={styles.menuLabel}>الأقسام</span>
        </button>
      </div>
    </div>

    <nav id="main-navigation" className={styles.sheet} data-open={open || undefined} aria-label="كل أقسام المنصة" hidden={!open}>
      {open && <div className={styles.sheetInner}>
        <Link href="/search" className={styles.sheetSearch} onClick={close}><Search size={19} aria-hidden="true"/>ابحث في كل المنصة</Link>
        <Link href="/" className={styles.sheetHome} aria-current={path === '/' ? 'page' : undefined} onClick={close}>الرئيسية</Link>
        <div className={styles.sheetGroups}>
          {tasks.map(task => <section key={task.id} className={styles.sheetGroup} data-tone={task.tone} aria-labelledby={'sheet-' + task.id}>
            <h2 id={'sheet-' + task.id}><i className={styles.dot} aria-hidden="true"/><span className={styles.sheetVerb}>{task.verb}</span><span className={styles.sheetSection}>{task.section}</span></h2>
            <ul>{task.links.map(([href, label]) => <li key={href}><Link href={href} aria-current={isActivePath(path, href) ? 'page' : undefined} onClick={close}>{label}</Link></li>)}</ul>
          </section>)}
        </div>
        {contributeVisible && <Link className={styles.sheetAction} href="/contribute" onClick={close}>{actionLabel}<ArrowUpLeft size={17} aria-hidden="true"/></Link>}
        {account && <Link className={styles.sheetAccount} href={account.href} onClick={close}><account.icon size={18} aria-hidden="true"/>{account.label}</Link>}
      </div>}
    </nav>
  </header>
  {withTabs && <nav ref={tabbar} className={styles.tabbar} aria-label="التنقل السريع" data-tabbar>
    <Link href="/" aria-current={path === '/' ? 'page' : undefined} onClick={close}><House size={22} aria-hidden="true"/><span>الرئيسية</span></Link>
    <Link href="/search" aria-current={path === '/search' ? 'page' : undefined} onClick={close}><Search size={22} aria-hidden="true"/><span>ابحث</span></Link>
    <button type="button" aria-controls="main-navigation" aria-expanded={open} onClick={event => {opener.current = event.currentTarget; setPanel(null); setOpen(value => !value);}}>{open ? <X size={22} aria-hidden="true"/> : <LayoutGrid size={22} aria-hidden="true"/>}<span>الأقسام</span></button>
    {isVisible('/read-later') && <Link href="/read-later" aria-current={path === '/read-later' ? 'page' : undefined} onClick={close}><Bookmark size={22} aria-hidden="true"/><span>محفوظاتي</span></Link>}
    <Link href={account?.href || '/login'} aria-current={account && path === account.href ? 'page' : undefined} onClick={close}>{account ? <account.icon size={22} aria-hidden="true"/> : <UserRound size={22} aria-hidden="true"/>}<span>{signedIn ? (canEdit ? 'التحرير' : 'حسابي') : 'دخول'}</span></Link>
  </nav>}
  </>;
}
