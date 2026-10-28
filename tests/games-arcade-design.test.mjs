import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Games 967 has a standalone dark arcade design, not a copied Knowledge header',()=>{
 const hub=read('app/games/page.jsx');
 const quiz=read('app/games/quiz/page.jsx');
 const intro=read('components/games/ArcadeIntro.jsx');
 const css=read('app/games/games.module.css');
 for(const body of [hub,quiz]){
  assert.ok(body.includes('<ArcadeIntro'), 'arcade intro must be shared across games and quiz');
  assert.ok(!body.includes('KnowledgePageIntro'), 'games should not inherit editorial Knowledge banner');
  assert.ok(body.includes('className={styles.root}'));
 }
 assert.ok(intro.includes('<h1 className={styles.heroTitle}>'));
 assert.ok(intro.includes('aria-label="مسار الصفحة"'));
 assert.ok(intro.includes('aria-hidden="true"'));
 assert.ok(css.includes('--arc-bg:#080c1a'), 'dark tokens must be scoped to games');
 assert.ok(css.includes('background:radial-gradient'));
 assert.ok(css.includes('@keyframes arcSpin'));
 assert.ok(css.includes('@keyframes arcFloat'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('.heroCompact'));
});

test('Arcade landing links to four playable modes and all daily challenges',()=>{
 const hub=read('app/games/page.jsx');
 assert.ok(hub.includes('href="/games/quiz"'));
 assert.ok(hub.includes('href={dailyUrl}'));
 assert.ok(hub.includes("href:'/games/place'"));
 assert.ok(hub.includes("href:'/games/timeline'"));
 assert.ok(hub.includes("href:'/games/map'"));
 assert.ok(hub.includes('<Link href={featured.href}'));
 assert.ok(hub.includes('<Link href={game.href}'));
 assert.ok(!hub.includes('active:false'));
 assert.ok(hub.includes('href={dailyUrl} className={styles.dailyStrip}'));
});

test('Quiz play still uses scoring, explanation, sharing, persistence and mobile-ready motion settings',()=>{
 const code=read('components/games/QuizGame.jsx');
 const css=read('components/games/QuizGame.module.css');
 const route=read('app/games/quiz/page.jsx');
 for(const codeToken of ['buildQuizRound','dailySeed(date)','scoreRound(round,answers)','localStorage.setItem','setResult(summary)','onClick={()=>choose(index)}','aria-pressed={selected}','current.source.url','navigator.share','questionTitleRef']){
  assert.ok(code.includes(codeToken),codeToken);
 }
 assert.ok(route.includes('<QuizGame'));
 assert.ok(route.includes('sectionIsVisible(\'games\''));
 assert.ok(css.includes('.playScore'));
 assert.ok(css.includes('.option.right'));
 assert.ok(css.includes('.option.wrong'));
 assert.ok(css.includes('.finishSparks'));
 assert.ok(css.includes('@media(max-width:610px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
