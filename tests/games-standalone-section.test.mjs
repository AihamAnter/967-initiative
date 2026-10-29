import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Games 967 is a standalone global navigation section, never a Knowledge submenu',()=>{
 const header=read('components/Header.jsx');
 const knowledge=header.match(/\{label: 'المعرفة', links: (.*?)\},/s)?.[1]||'';
 const games="{label: 'ألعاب 967', standalone: true, links: [['/games', 'ألعاب 967']]}";
 assert.ok(knowledge.includes("'/yemen-history'"));
 assert.ok(!knowledge.includes("'/games'"));
 assert.ok(header.includes(games));
 assert.ok(header.indexOf("{label: 'المعرفة'")<header.indexOf(games));
 assert.ok(header.indexOf(games)<header.indexOf("{label: 'الأدلة'"));
});

test('main desktop and mobile navigation retain exactly one games entry and active subpages',()=>{
 const header=read('components/Header.jsx');
 const css=read('app/platform-refinements.css');
 assert.ok(header.includes('group.standalone ? <Link'));
 assert.ok(header.includes('className={`nav-home nav-games'));
 assert.ok(header.includes("active('/games')"));
 assert.ok(header.includes("href=\"/games\""));
 assert.ok(header.includes('groups.filter(group=>!group.standalone).map'));
 assert.ok(header.includes("group.links.filter(([href])=>isVisible(href))"));
 assert.ok(css.includes('.platform-nav>.nav-games'));
 assert.ok(css.includes('@media(max-width:900px)'));
});

test('footer has a separate Games 967 heading with working destination routes',()=>{
 const footer=read('components/Footer.jsx');
 const css=read('app/platform-refinements.css');
 const heading=footer.indexOf('<h3>ألعاب 967</h3>');
 const knowledge=footer.indexOf('<h3>المحتوى والمعرفة</h3>');
 const guides=footer.indexOf('<h3>الأدلة والمجتمع</h3>');
 assert.ok(knowledge>=0&&heading>knowledge&&guides>heading);
 assert.ok(footer.includes('<Link href="/games">جميع الألعاب</Link>'));
 assert.ok(footer.includes('<Link href="/games/leaderboard">لوحة المتصدرين</Link>'));
 assert.ok(footer.includes('<Link href="/games/achievements">الشارات والإنجازات</Link>'));
 assert.ok(!footer.slice(knowledge,heading).includes('href="/games"'));
 assert.ok(css.includes('grid-template-columns:minmax(250px,1.45fr) repeat(4,minmax(0,1fr))'));
 assert.ok(css.includes('@media(max-width:420px)'));
});

test('homepage games showcase has its own name, contrast and visibility control',()=>{
 const home=read('app/page.jsx');
 const knowledge=read('components/home/HomeKnowledge.jsx');
 const games=read('components/home/HomeGames.jsx');
 const css=read('components/home/HomeGames.module.css');
 assert.ok(home.includes("{visible('games')&&<HomeGames/>}"));
 assert.ok(home.indexOf('<HomeKnowledge items={knowledgeLinks}/>')<home.indexOf('<HomeGames/>'));
 assert.ok(games.includes('<h2 id="home-games-title">ألعاب <span>967</span></h2>'));
 assert.ok(games.includes('id="home-games"'));
 assert.ok(knowledge.includes('id="explore-knowledge"'));
 assert.ok(css.includes('background:#fffaf2;border-block:1px'));
 assert.ok(!/[\u0660-\u0669\u06F0-\u06F9]/u.test(games));
});
