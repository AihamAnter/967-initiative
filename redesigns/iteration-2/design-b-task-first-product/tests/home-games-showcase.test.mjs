import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyGameForDate,dailyGameUrl,DAILY_GAME_TITLES,utcDay} from '../lib/dailyGame.js';
import {sectionIsVisible,pageIsVisible} from '../lib/pageVisibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('homepage promotes games in a large integrated section without removing editorial sections',()=>{
 const homepage=read('app/page.jsx');
 const block=read('components/wayfinder/HomeSections.jsx');
 assert.ok(homepage.includes("{visible('games') && <GamesBlock dailyGame={dailyGameForDate(today)} dailyHref={dailyGameUrl(today)}/>}"));
 assert.ok(homepage.indexOf('<KnowledgeBlock')<homepage.indexOf('<GamesBlock'));
 assert.ok(homepage.indexOf('<GamesBlock')<homepage.indexOf('<CuriosityDoors'));
 assert.ok(block.includes('id="home-games"'));
 assert.ok(block.includes('aria-labelledby="home-games-title"'));
 assert.ok(block.includes('DAILY_GAME_TITLES[dailyGame]'));
 for(const token of ['ألعاب متنوعة','شارة وإنجازًا','ثوانٍ لكل سؤال يومي','تحدَّ صديقك','منافسة أسبوعية ومهمات متجددة'])assert.ok(block.includes(token),token);
 assert.ok(!homepage.includes('styles.homeGamesContent'),'old green banner should not appear');
});

test('games hidden by site visibility settings also hide homepage feature and personalized game tile',()=>{
 const homepage=read('app/page.jsx');
 const slot=read('components/wayfinder/ContinueSlot.jsx');
 assert.ok(homepage.includes("{visible('games') && <GamesBlock"));
 assert.ok(homepage.includes("showGames={visible('games')}"));
 const smart=read('components/home/HomeSmartStart.jsx');
 assert.ok(homepage.includes("const isVisible = href => pageIsVisible(href.split('?')[0], settings.pageVisibility"));
 assert.ok(slot.includes("{showGame && <li>"));
 assert.ok(smart.includes("const showGames=isVisible('/games')"));
 assert.ok(smart.includes("{showGames&&<article"));
 assert.ok(smart.includes("{showGames?<Link"));
 assert.equal(sectionIsVisible('games',{games:false}),false);
 assert.equal(pageIsVisible('/games',{games:false}),false);
 assert.equal(pageIsVisible('/games/map',{games:false}),false);
 assert.equal(sectionIsVisible('games',{}),true);
});

test('showcase links to the official UTC daily challenge and the real games instead of obsolete friend creation',()=>{
 const showcase=read('components/home/HomeGames.jsx');
 assert.ok(showcase.includes('dailyGameForDate(today)'));
 assert.ok(showcase.includes('dailyGameUrl(today)'));
 assert.ok(showcase.includes('DAILY_GAME_TITLES[dailyGame]'));
 assert.ok(showcase.includes('href={dailyHref}'));
 assert.ok(showcase.includes('href="/games/leaderboard"'));
 assert.ok(showcase.includes('href="/games"'));
 assert.ok(!showcase.includes('href="/games/friends"'));
 for(const game of ['map','timeline','who'])assert.ok(showcase.includes("href:'/games/"+game+"'"),game);
 const date=utcDay(new Date('2026-11-03T23:50:00.000Z'));
 assert.equal(date,'2026-11-03');
 assert.equal(dailyGameUrl(date),'/games/'+dailyGameForDate(date)+'?mode=daily');
 assert.ok(DAILY_GAME_TITLES[dailyGameForDate(date)]);
});

test('home game summary reflects the actual current 967 systems without changing scoring rules',()=>{
 const showcase=read('components/home/HomeGames.jsx');
 const arcade=read('app/games/page.jsx');
 const badges=read('lib/gameAchievements.js');
 assert.ok(showcase.includes('9</strong>'));
 assert.ok(showcase.includes('14</strong>'));
 assert.ok(showcase.includes('7</strong>'));
 for(const token of ['تحدي اليوم','تحدَّ صديقك','منافسة أسبوعية','href="/games"'])
  assert.ok(showcase.includes(token),token);
 assert.ok(arcade.includes("id:'object'"));
 assert.ok(badges.includes('GAME_ACHIEVEMENTS'));
});

test('homepage games never renders Eastern Arabic or Persian numerals',()=>{
 const showcase=read('components/home/HomeGames.jsx');
 assert.equal(/[\u0660-\u0669\u06F0-\u06F9]/u.test(showcase),false);
 for(const numeral of ['9','14','7'])assert.ok(showcase.includes('<strong>'+numeral+'</strong>'));
});

test('the homepage arcade showcase is responsive, accessible and respects reduced motion',()=>{
 const css=read('components/home/HomeGames.module.css');
 const view=read('components/home/HomeGames.jsx');
 assert.ok(css.includes('@media(max-width:1080px)'));
 assert.ok(css.includes('@media(max-width:820px)'));
 assert.ok(css.includes('@media(max-width:600px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('.showcase{display:grid'));
 assert.ok(css.includes('grid-template-columns:1fr'));
 assert.ok(view.includes('aria-label="مميزات ألعاب 967"'));
 assert.ok(view.includes('aria-hidden="true"'));
 assert.ok(view.includes('className={styles.duel}'));
});
