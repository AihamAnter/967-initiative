import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyGameUrl,utcDay} from '../lib/dailyGame.js';
import {pageIsVisible} from '../lib/pageVisibility.js';
import {readingListItem} from '../lib/readingList.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Design B home (iteration 2): smart start follows the hero and the six-verb dock, and keeps guest, sign-in and member states',()=>{
 const page=read('app/page.jsx');
 const slot=read('components/wayfinder/ContinueSlot.jsx');
 const sections=read('components/wayfinder/HomeSections.jsx');
 const smart=read('components/home/HomeSmartStart.jsx');
 assert.ok(page.includes("import ContinueSlot from '@/components/wayfinder/ContinueSlot'"));
 assert.ok(page.indexOf('role="search"')<page.indexOf('<TaskLauncher'));
 assert.ok(page.indexOf('<TaskLauncher')<page.indexOf('id="home-start-title"'));
 assert.ok(page.indexOf('id="home-start-title"')<page.indexOf('id="picks-title"'));
 assert.ok(page.includes('<ContinueSlot initialDate={today}'));
 assert.ok(page.includes('<SmartStartGuest '));
 for(const item of ['ابدأ بالتعلم','اكتشف اليمن','جرّب ألعاب 967','تسجيل الدخول'])assert.ok(sections.includes(item),item);
 for(const anchor of ['id="contact"','id="about"','id="projects"'])assert.ok((page+sections).includes(anchor),anchor);
 // Members keep the account-aware summary; it is only downloaded when a session may exist.
 assert.ok(slot.includes("dynamic(() => import('@/components/home/HomeSmartStart'), {ssr: false"));
 assert.ok(slot.includes('browserSessionMayExist(process.env.NEXT_PUBLIC_SUPABASE_URL, localStorage, location.href)'));
 assert.ok(slot.includes("if (mode === 'member') return"));
 assert.ok(smart.includes('aria-labelledby="home-start-title"'));
});

test('signed-out visitors see direct public destinations without account information',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 assert.ok(smart.includes(':user?<div className={styles.grid}>'));
 for(const item of ['ابدأ بالتعلم','اكتشف اليمن','جرّب ألعاب 967','تسجيل الدخول'])assert.ok(smart.includes(item));
 assert.ok(smart.includes("const showSchool=isVisible('/school')"));
 assert.ok(smart.includes("const showGames=isVisible('/games')"));
 assert.equal(pageIsVisible('/school',{school:false}),false);
 assert.equal(pageIsVisible('/games',{games:false}),false);
});

test('member summaries come from existing private owner-verified APIs, not browser scores',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 const routes=['/api/school/dashboard','/api/games/my-overview','/api/account/workspace'];
 for(const route of routes)assert.ok(smart.includes(route),route);
 assert.ok(smart.includes("headers:{Authorization:'Bearer '+token}"));
 assert.ok(smart.includes("cache:'no-store'"));
 assert.ok(smart.includes('controller.abort()'));
 assert.ok(smart.includes("user?.id"));
 assert.ok(smart.includes('storedCards.userId===user?.id'));
 assert.ok(smart.includes('old.userId===user.id'));
 assert.ok(smart.includes("event==='SIGNED_OUT'||event==='SIGNED_IN'"));
 assert.ok(!smart.includes('localStorage'));
 assert.ok(!smart.includes('question_bank'));
 assert.ok(!smart.includes('getUserMetadata'));
});

test('saved-item links are validated before display; hidden content is filtered',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 assert.ok(smart.includes('.map(readingListItem).filter(item=>item&&isVisible(item.href))'));
 assert.ok(smart.includes("latestSaved?.href||'/read-later'"));
 assert.equal(readingListItem({kind:'work',href:'https://evil.example',title:'Bad'}),null);
 assert.equal(readingListItem({kind:'work',href:'/works/film-one?access_token=private',title:'Bad'}),null);
 assert.deepEqual(readingListItem({kind:'work',href:'/works/film-one',title:'Good'}),{kind:'work',href:'/works/film-one',title:'Good'});
});

test('daily challenge uses UTC and never claims an attempt on homepage',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 const date=utcDay(new Date('2026-11-03T23:55:00Z'));
 assert.equal(dailyGameUrl(date).includes('?mode=daily'),true);
 assert.ok(smart.includes('dailyGameUrl(day)'));
 assert.ok(smart.includes("setInterval(update,60000)"));
 assert.ok(smart.includes('daily?.finished'));
 assert.ok(smart.includes('daily?.used'));
 assert.ok(!smart.includes("method:'POST'"));
 assert.ok(!smart.includes('game_daily_attempts'));
});

test('loading and error states are separate for each account system',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 const css=read('components/home/HomeSmartStart.module.css');
 assert.ok(smart.includes("school:{status:'loading'},games:{status:'loading'},reading:{status:'loading'}"));
 assert.ok(smart.includes("update(name,'error',null)"));
 assert.ok(smart.includes('إعادة المحاولة'));
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert.ok(css.includes('@media(max-width:950px)'));
 assert.ok(css.includes('@media(max-width:600px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes(':focus-visible'));
});
