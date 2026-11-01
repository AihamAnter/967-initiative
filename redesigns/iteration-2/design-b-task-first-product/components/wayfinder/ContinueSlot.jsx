'use client';
import {useEffect, useState, useSyncExternalStore} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {Bookmark, Gamepad2, History, X} from 'lucide-react';
import {usePageVisibility} from '@/components/PageVisibilityProvider';
import useReadingList from '@/components/reading/useReadingList';
import {DAILY_GAME_TITLES, dailyGameForDate, dailyGameUrl, utcDay} from '@/lib/dailyGame';
import {RECENT_TRAIL_KEY, parseRecentTrail} from '@/lib/recentTrail';
import {browserSessionMayExist} from '@/lib/sessionHint';
import styles from './ContinueSlot.module.css';

// "من أين تحب أن تبدأ؟" — the server renders the guest cards (children) so the
// section is complete without JavaScript. Signed-in members get the existing
// account-aware summary (school resume, saved items, daily status) instead; it is
// only downloaded when a session may exist, so guests never pay for Supabase.
// Returning guests additionally see a "continue" strip from this device.
const HomeSmartStart = dynamic(() => import('@/components/home/HomeSmartStart'), {ssr: false, loading: () => <div className={styles.skeleton} aria-hidden="true"><span/><span/><span/></div>});
const noop = () => () => {};
const readTrail = () => {try {return localStorage.getItem(RECENT_TRAIL_KEY) || '';} catch {return '';}};

export default function ContinueSlot({initialDate, knowledgeHref = '/yemen-in-numbers', children}) {
  const {isVisible} = usePageVisibility();
  const {items: saved} = useReadingList();
  const [mode, setMode] = useState('guest');
  const [day, setDay] = useState(initialDate);
  const [cleared, setCleared] = useState(false);
  const trailRaw = useSyncExternalStore(noop, readTrail, () => null);

  useEffect(() => {
    let member = false;
    try {member = browserSessionMayExist(process.env.NEXT_PUBLIC_SUPABASE_URL, localStorage, location.href);} catch {}
    if (member) setMode('member');
    setDay(utcDay());
  }, []);

  if (mode === 'member') return <div className={styles.member}><HomeSmartStart initialDate={day} knowledgeHref={knowledgeHref}/></div>;

  const trail = cleared || trailRaw === null ? [] : parseRecentTrail(trailRaw).filter(item => isVisible(item.href));
  const last = trail[0];
  const lastSaved = saved.find(item => isVisible(item.href) && item.href !== last?.href);
  const game = dailyGameForDate(day);
  const showGame = isVisible('/games');

  return <>
    {children}
    {(last || lastSaved) && <div className={styles.slot} aria-labelledby="continue-title">
      <div className={styles.head}>
        <h3 id="continue-title">تابع من حيث توقفت</h3>
        {last && <button type="button" className={styles.clear} onClick={() => {try {localStorage.removeItem(RECENT_TRAIL_KEY);} catch {} setCleared(true);}}><X size={15} aria-hidden="true"/>امسح سجل التصفح</button>}
      </div>
      <ul className={styles.items}>
        {last && <li><Link href={last.href} className={styles.item} data-kind="recent"><History size={20} aria-hidden="true"/><span><small>آخر ما فتحته · {last.label}</small><strong>{last.title}</strong></span></Link></li>}
        {lastSaved && <li><Link href={lastSaved.href} className={styles.item} data-kind="saved"><Bookmark size={20} aria-hidden="true"/><span><small>من محفوظاتك على هذا الجهاز</small><strong>{lastSaved.title}</strong></span></Link></li>}
        {showGame && <li><Link href={dailyGameUrl(day)} className={styles.item} data-kind="game"><Gamepad2 size={20} aria-hidden="true"/><span><small>تحدي اليوم · يتجدد منتصف الليل UTC</small><strong>{DAILY_GAME_TITLES[game]}</strong></span></Link></li>}
      </ul>
    </div>}
  </>;
}
