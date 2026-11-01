import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyGameForDate,dailyGameUrl,DAILY_GAME_TITLES,utcDay} from '../lib/dailyGame.js';
import {sectionIsVisible,pageIsVisible} from '../lib/pageVisibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

// Iteration 2 (Editorial, made 2026): the full games showcase is back on the
// home page as GamesArcade (components/front/FrontSections.jsx), keeping every
// link and stat of the original HomeGames component.

test('homepage promotes games in a large integrated section without removing editorial sections',()=>{
 const homepage=read('app/page.jsx');
 const showcase=read('components/front/FrontSections.jsx');
 assert.ok(homepage.includes("{visible('games')&&<section id=\"home-games\""));
 assert.ok(homepage.includes('<GamesArcade dailyHref={dailyGameUrl(today)}'));
 assert.ok(homepage.includes('<HomeSmartStart initialDate={utcDay()}'));
 assert.ok(homepage.indexOf('id="explore-knowledge"')<homepage.indexOf('id="home-games"'));
 assert.ok(homepage.indexOf('id="home-games"')<homepage.indexOf('id="explore-title"'));
 assert.ok(showcase.includes('aria-labelledby')||homepage.includes('aria-labelledby="home-games-title"'));
 assert.ok(showcase.includes('id="home-games-title"'));
 for(const id of ['featured-title','home-school-title','home-knowledge-title','explore-title','numbers-title','community-title','contact-title','id="about"','id="projects"'])
  assert.ok(homepage.includes(id),id);
});

test('games hidden by site visibility settings also hide homepage feature and personalized game tile',()=>{
 const homepage=read('app/page.jsx');
 const smart=read('components/home/HomeSmartStart.jsx');
 assert.ok(smart.includes("const showGames=isVisible('/games')"));
 assert.ok(smart.includes("{showGames&&<article"));
 assert.ok(smart.includes("{showGames?<Link"));
 assert.ok(homepage.includes("{visible('games')&&<section"));
 assert.equal(sectionIsVisible('games',{games:false}),false);
 assert.equal(pageIsVisible('/games',{games:false}),false);
 assert.equal(pageIsVisible('/games/map',{games:false}),false);
 assert.equal(sectionIsVisible('games',{}),true);
});

test('showcase links to the official UTC daily challenge and the real games instead of obsolete friend creation',()=>{
 const homepage=read('app/page.jsx');
 const showcase=read('components/front/FrontSections.jsx');
 assert.ok(homepage.includes('dailyGameUrl(today)'));
 assert.ok(homepage.includes('DAILY_GAME_TITLES[dailyGameForDate(today)]'));
 assert.ok(showcase.includes('href={dailyHref}'));
 assert.ok(showcase.includes('href="/games/leaderboard"'));
 assert.ok(showcase.includes('href="/games"'));
 assert.ok(!showcase.includes('href="/games/friends"'));
 for(const game of ['map','timeline','who'])assert.ok(showcase.includes("href: '/games/"+game+"'"),game);
 const date=utcDay(new Date('2026-11-03T23:50:00.000Z'));
 assert.equal(date,'2026-11-03');
 assert.equal(dailyGameUrl(date),'/games/'+dailyGameForDate(date)+'?mode=daily');
 assert.ok(DAILY_GAME_TITLES[dailyGameForDate(date)]);
});

test('home game summary reflects the actual current 967 systems without changing scoring rules',()=>{
 const showcase=read('components/front/FrontSections.jsx');
 const arcade=read('app/games/page.jsx');
 const badges=read('lib/gameAchievements.js');
 for(const numeral of ['9','14','7'])assert.ok(showcase.includes('<strong>'+numeral+'</strong>'),numeral);
 for(const token of ['تحدي اليوم','تحدَّ صديقك','منافسة أسبوعية','إلى أي مدى','اكتشف الألعاب التسع','اختر اللعبة'])
  assert.ok(showcase.includes(token),token);
 assert.ok(arcade.includes("id:'object'"));
 assert.ok(badges.includes('GAME_ACHIEVEMENTS'));
});

test('homepage games never renders Eastern Arabic or Persian numerals',()=>{
 for(const path of ['app/page.jsx','components/front/FrontSections.jsx','lib/navigation.js'])
  assert.equal(/[\u0660-\u0669\u06F0-\u06F9]/u.test(read(path)),false,path);
});

test('the homepage arcade is responsive, accessible and respects reduced motion',()=>{
 const css=read('app/front.module.css');
 const view=read('components/front/FrontSections.jsx');
 assert.ok(css.includes('@media (max-width: 1179px)'));
 assert.ok(css.includes('@media (max-width: 760px)'));
 assert.ok(css.includes('.arcadeGrid { grid-template-columns: minmax(0, 1fr); }'));
 assert.ok(css.includes('@media (prefers-reduced-motion: no-preference)'));
 assert.ok(read('app/foundation/tokens.css').includes('@media (prefers-reduced-motion: reduce)'));
 assert.ok(view.includes('aria-label="مميزات ألعاب 967"'));
 assert.ok(view.includes('aria-hidden="true"'));
 assert.ok(view.includes('className={styles.duel}'));
});
