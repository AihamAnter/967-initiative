import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('folds are visible on desktop and expandable only on mobile with accessible controls',()=>{
 const fold=read('components/mobile/MobileFold.jsx');
 const css=read('components/mobile/MobileFold.module.css');
 for(const token of ['aria-expanded={open}','aria-controls={id}','type="button"','hashchange','decodeURIComponent(hash)','ref.current?.contains(target)'])
  assert.ok(fold.includes(token),token);
 assert.ok(css.includes('.trigger{display:none}'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('.closed>.content{display:none}'));
 assert.ok(css.includes('.trigger:focus-visible'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(!fold.includes('localStorage'));
});

test('learner can continue before browsing optional stats and long secondary sections',()=>{
 const page=read('components/school/SchoolDashboard.jsx');
 const resume=page.indexOf('data.resume?<div className={styles.resume}');
 const xp=page.indexOf('<section className={styles.xpPanel}');
 const stats=page.indexOf('<div className={styles.stats}>');
 const habits=page.indexOf('<div className={styles.habitGrid}>');
 const courses=page.indexOf('<div className={styles.courses}>');
 const review=page.indexOf("MobileFold title={'مراجعة الأخطاء");
 const competition=page.indexOf('MobileFold title="الإنجازات ولوحة المتصدرين"');
 assert.ok(resume>0&&resume<xp&&xp<stats&&stats<habits&&habits<courses&&courses<review&&review<competition);
 assert.ok(page.includes('data.courses.find(course=>course.slug===item.course)?.title'));
 assert.ok(page.includes('data.resume.stage?.href'));
 assert.ok(page.includes('<SchoolCompetition achievements={data.achievements}/>'));
 assert.ok(page.includes('setDailyGoal(goal)'));
 assert.ok(page.includes('role="progressbar"'));
});

test('debate search and stage stay visible while optional filters can be expanded',()=>{
 const page=read('components/debates/DebateExplorer.jsx');
 const css=read('app/debates.css');
 const interior=read('app/interior-design.css');
 const search=page.indexOf('<label className="debate-search">');
 const stage=page.indexOf('<label>المرحلة<select');
 const toggle=page.indexOf('className="debate-mobile-filter-toggle"');
 const extra=page.indexOf('id="debate-more-filters"');
 const category=page.indexOf('<label>التصنيف<select');
 const type=page.indexOf('<label>النوع<select');
 const sort=page.indexOf('<label>الترتيب<select');
 assert.ok(search>0&&search<stage&&stage<toggle&&toggle<extra&&extra<category&&category<type&&type<sort);
 assert.ok(page.includes('aria-expanded={filtersOpen}'));
 assert.ok(page.includes("Boolean(seed.category||seed.type||seed.sort!=='newest')"));
 assert.ok(page.includes('setFiltersOpen(Boolean(next.category||next.type||next.sort!==\'newest\'))'));
 assert.ok(page.includes('<ActiveFilters'));
 assert.ok(css.includes('.debate-extra-fields[data-open=false]{display:none}'));
 assert.ok(interior.includes('.interior-page .debate-filters .debate-extra-fields[data-open=false]{display:none}'));
 assert.ok(interior.includes('.interior-page .debate-filters{grid-template-columns:minmax(0,1fr)'));
});

test('debate participant links stay available and nested debate interaction is unchanged',()=>{
 const page=read('app/debates/[slug]/page.jsx');
 const fold=page.indexOf('<MobileFold title={\'المشاركون ومواقفهم');
 assert.ok(fold>0);
 assert.ok(page.indexOf('<section id="participants"',fold)>fold);
 assert.ok(page.indexOf('</MobileFold>',fold)>fold);
 assert.ok(page.indexOf('<DebateInteraction debate={d}/>')>fold);
 for(const id of ['#participants','#discussion','#polls'])assert.ok(page.includes(id));
 assert.ok(page.includes('<DebateDisclosure id="about"'));
 assert.ok(page.includes('<DebateDisclosure id="axes"'));
 assert.ok(read('app/interior-design.css').includes('.interior-page .debate-detail-nav{display:flex;flex-wrap:nowrap;overflow-x:auto'));
});

test('homepage retains navigation with compact school grid and phone snap rails',()=>{
 const home=read('app/page.jsx');
 const sections=read('components/wayfinder/HomeSections.jsx');
 const css=read('components/wayfinder/HomeSections.module.css');
 const launcher=read('components/wayfinder/TaskLauncher.module.css');
 const start=read('components/home/HomeSmartStart.module.css');
 for(const href of ['/school/writing','/school/nature','/school/logic','/school/civic'])assert.ok(sections.includes("href: '"+href+"'"),href);
 assert.ok(home.includes('<TaskLauncher isVisible={isVisible} contentLinks={contentLinks}/>'));
 assert.ok(home.includes('<ContinueSlot initialDate={today}'));
 assert.ok(css.includes('.tracks{grid-template-columns:1fr 1fr;gap:10px}'));
 assert.ok(css.includes('.track small{display:none}'));
 assert.ok(css.includes('scroll-snap-type:x mandatory'));
 assert.ok(launcher.includes('scroll-snap-type:x mandatory'));
 assert.ok(start.includes('.card{display:grid;grid-template-columns:38px minmax(0,1fr)'));
});

test('game preview rail keeps all three playable links and communicates scrolling',()=>{
 const game=read('components/home/HomeGames.jsx');
 const css=read('components/home/HomeGames.module.css');
 for(const href of ['/games/map','/games/timeline','/games/who'])assert.ok(game.includes("href:'"+href+"'"));
 assert.ok(game.includes('اسحب البطاقات لمشاهدة ألعاب إضافية'));
 assert.ok(css.includes('scroll-snap-type:x mandatory'));
 assert.ok(css.includes('grid-auto-flow:column'));
 assert.ok(css.includes('overflow-x:auto'));
 assert.ok(css.includes('.mobileSwipeHint{display:none}'));
 assert.ok(css.includes('.mobileSwipeHint{display:block'));
 assert.ok(game.includes('href={dailyHref}'));
 assert.ok(game.includes('href="/games"'));
});

test('controls and key actions remain keyboard or touch accessible',()=>{
 const css=read('app/school/dashboard/dashboard.module.css');
 const debate=read('app/debates.css');
 const fold=read('components/mobile/MobileFold.module.css');
 assert.ok(css.includes('.goalChoices button{min-height:44px}'));
 assert.ok(debate.includes('.debate-mobile-filter-toggle{display:flex'));
 assert.ok(debate.includes('min-height:44px'));
 assert.ok(fold.includes('min-height:48px'));
 assert.ok(fold.includes(':focus-visible'));
});
