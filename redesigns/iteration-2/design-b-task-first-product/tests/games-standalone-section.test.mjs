import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NAV_TASKS,navTasks} from '../lib/navigation.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

// Design B: navigation is one shared vocabulary (lib/navigation.js). Games keeps
// its own top-level task ("العب") in header, mobile sheet, home launcher and footer.
test('Games 967 is a standalone global navigation section, never a Knowledge submenu',()=>{
 const ids=NAV_TASKS.map(task=>task.id);
 const explore=NAV_TASKS.find(task=>task.id==='explore');
 const play=NAV_TASKS.find(task=>task.id==='play');
 assert.ok(explore.links.some(([href])=>href==='/yemen-history'));
 assert.ok(!explore.links.some(([href])=>href.startsWith('/games')));
 assert.equal(play.href,'/games');
 assert.equal(play.section,'ألعاب 967');
 assert.ok(ids.indexOf('explore')<ids.indexOf('play'));
 assert.ok(ids.indexOf('play')<ids.indexOf('find'));
});

test('main desktop and mobile navigation retain exactly one games entry and active subpages',()=>{
 const header=read('components/Header.jsx');
 assert.equal(NAV_TASKS.filter(task=>task.links.some(([href])=>href==='/games')).length,1);
 assert.ok(header.includes('navTasks({isVisible, contentLinks})'));
 assert.ok(header.includes('activeTask(path, tasks)'));
 assert.ok(header.includes("aria-current={isActivePath(path, href) ? 'page' : undefined}"));
 assert.ok(!navTasks({isVisible:href=>!href.startsWith('/games')}).some(task=>task.id==='play'));
 const css=read('components/shell/Header.module.css');
 assert.ok(css.includes('.trigger[data-current]::after'));
 assert.ok(css.includes('@media (max-width:1023px)'));
});

test('footer has a separate Games 967 heading with working destination routes',()=>{
 const footer=read('components/Footer.jsx');
 const play=NAV_TASKS.find(task=>task.id==='play');
 assert.ok(footer.includes('navTasks({isVisible: visible, contentLinks})'));
 assert.ok(footer.includes('<h3 id={\'footer-\' + task.id}>{task.verb}<span>{task.section}</span></h3>'));
 for(const href of ['/games','/games/leaderboard','/games/achievements'])assert.ok(play.links.some(([link])=>link===href),href);
 assert.ok(read('components/shell/Footer.module.css').includes('@media (max-width:560px)'));
});

test('homepage games entry has its own name and visibility control',()=>{
 const home=read('app/page.jsx');
 const slot=read('components/wayfinder/ContinueSlot.jsx');
 assert.ok(home.includes('<TaskLauncher isVisible={isVisible} contentLinks={contentLinks}/>'));
 assert.ok(slot.includes("const showGame = isVisible('/games');"));
 assert.ok(slot.includes('dailyGameUrl(day)'));
 assert.ok(!/[٠-٩۰-۹]/u.test(slot));
});
