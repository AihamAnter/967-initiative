import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyGameForDate,dailyGameUrl,DAILY_GAME_TITLES,utcDay} from '../lib/dailyGame.js';
import {sectionIsVisible,pageIsVisible} from '../lib/pageVisibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('homepage promotes games in a large integrated section without removing editorial sections',()=>{
 const homepage=read('app/page.jsx');
 const showcase=read('components/home/HomeGames.jsx');
 assert.ok(homepage.includes("import HomeGames from '@/components/home/HomeGames'"));
 assert.ok(homepage.includes("{visible('games')&&<HomeGames/>}"));
 assert.ok(homepage.includes('href="#home-games"'));
 assert.ok(homepage.indexOf('<HomeKnowledge items={knowledgeLinks}/>')<homepage.indexOf('<HomeGames/>'));
 assert.ok(homepage.indexOf('<HomeGames/>')<homepage.indexOf('className={styles.discovery}'));
 assert.ok(showcase.includes('id="home-games"'));
 assert.ok(showcase.includes('aria-labelledby="home-games-title"'));
 assert.ok(showcase.includes('id="home-games-title"'));
 assert.ok(!homepage.includes('styles.homeGamesContent'),'old green banner should not appear');
 for(const section of ['styles.hero','styles.discovery','styles.moreContent','styles.numbers','styles.community','styles.participate','styles.about'])
  assert.ok(homepage.includes(section),section);
});

test('games hidden by site visibility settings also hide homepage feature and hero shortcut',()=>{
 const homepage=read('app/page.jsx');
 assert.ok(homepage.includes("{visible('games')&&<NextLink href=\"#home-games\""));
 assert.ok(homepage.includes("{visible('games')&&<HomeGames/>}"));
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
 const hero=read('app/home.module.css');
 const view=read('components/home/HomeGames.jsx');
 assert.ok(css.includes('@media(max-width:1080px)'));
 assert.ok(css.includes('@media(max-width:820px)'));
 assert.ok(css.includes('@media(max-width:600px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('.showcase{display:grid'));
 assert.ok(css.includes('grid-template-columns:1fr'));
 assert.ok(hero.includes('.heroGameShortcut'));
 assert.ok(view.includes('aria-label="مميزات ألعاب 967"'));
 assert.ok(view.includes('aria-hidden="true"'));
 assert.ok(view.includes('className={styles.duel}'));
});
