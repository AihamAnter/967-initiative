import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('hub: slim header, today\'s challenge first, then a 3×3 grid of the nine games', () => {
  const hub = read('app/games/page.jsx');
  assert.ok(hub.includes('<ArcadeIntro slim description='));
  assert.ok(hub.indexOf('<GamesHomeStatus initialDate={date}/>') < hub.indexOf('className={styles.selectGrid}'));
  assert.equal((hub.match(/<GamesHomeStatus/g) || []).length, 1);
  for (const id of ['quiz', 'place', 'timeline', 'map', 'who', 'bigger', 'connect', 'yemenword', 'object'])
    assert.ok(hub.includes("href:'/games/" + id + "'"), id);
  const css = read('app/games/games.module.css');
  assert.ok(css.includes('.selectGrid{grid-template-columns:repeat(3,minmax(0,1fr)) !important'));
  const intro = read('components/games/ArcadeIntro.jsx');
  assert.ok(intro.includes('{!compact&&!slim&&<div className={styles.heroFacts}>'));
});

test('every game opens on its arena and keeps the timer in view', () => {
  for (const file of ['components/games/ArcadeChallenge.jsx', 'components/games/ExtraArcadeChallenge.jsx']) {
    const source = read(file);
    assert.ok(source.includes('<div ref={arenaRef} className={styles.arena}>'), file);
    assert.ok(source.includes("arenaRef.current.scrollIntoView({block:'start',behavior:'instant'})"), file);
    assert.ok(source.includes('<GameTimer remaining={timer.remaining}'), file);
  }
  assert.ok(read('components/games/GameTimer.module.css').includes('.timer{position:sticky;bottom:'));
  // overflow:hidden on the arena would disable the pinned timer; clip keeps the rounded corners.
  assert.ok(read('components/games/ArcadeChallenge.module.css').includes('.arena{overflow:clip !important}'));
});

test('setup cards stay compact and photos never push answers off a phone screen', () => {
  for (const file of ['components/games/QuizGame.module.css', 'components/games/ArcadeChallenge.module.css'])
    assert.ok(read(file).includes('.filters{display:grid !important;grid-template-columns:1fr 1fr !important'), file);
  assert.ok(read('components/games/ArcadeChallenge.module.css').includes('.placePhoto img{max-height:min(40vh,340px)'));
  assert.ok(read('components/games/ExtraArcade.module.css').includes('.objectImage img{max-height:min(40vh,340px)'));
});
