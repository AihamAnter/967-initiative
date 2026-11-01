import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('quiz returns the player to the question and timer on start and every transition',()=>{
 const code=read('components/games/QuizGame.jsx');
 const css=read('components/games/QuizGame.module.css');
 assert.ok(code.includes('playRef=useRef(null)'));
 assert.ok(code.includes("scrollIntoView({block:'start',behavior:'auto'})"));
 assert.ok(code.includes('[runId,step,round.length,result]'));
 assert.ok(code.includes('className={styles.play} ref={playRef}'));
 assert.ok(css.includes('scroll-margin-top:98px'));
 assert.ok(css.includes('scroll-margin-top:88px'));
});

test('map game offers zoom, native panning, and a confirmed touch-friendly alternative',()=>{
 const board=read('components/games/ArcadeBoards.jsx');
 const css=read('components/games/ArcadeChallenge.module.css');
 for(const token of ['mapZoomControls','setZoom','تكبير الخريطة','اختيار بديل مناسب للمس','تأكيد الاختيار','region.nameAr'])assert.ok(board.includes(token),token);
 assert.ok(css.includes('overflow:auto'));
 assert.ok(css.includes('touch-action:pan-x pan-y'));
 assert.ok(css.includes('.mapAlternative{display:grid'));
 assert.ok(css.includes('min-height:48px'));
});

test('game selection is presented before account, weekly, and achievement sections',()=>{
 const page=read('app/games/page.jsx');
 const css=read('app/games/games.module.css');
 const grid=page.indexOf('className={styles.selectGrid}');
 const player=page.indexOf('<GamesHomeStatus initialDate={date}/>');
 const weekly=page.indexOf('<WeeklyArcade/>');
 const achievements=page.indexOf('<GameAchievementGallery preview/>');
 assert.ok(grid>0&&grid<player&&player<weekly&&weekly<achievements);
 assert.equal((page.match(/className=\{styles\.secondarySection\}/g)||[]).length,3);
 assert.ok(page.includes('href={todayGame}'));
 assert.ok(css.includes('.secondarySection>summary'));
});

test('school and homepage tablet layouts have balanced final rows',()=>{
 const school=read('app/school/page.jsx');
 const schoolCss=read('app/school/school.module.css');
 const startCss=read('components/home/HomeSmartStart.module.css');
 assert.ok(school.includes('href="#school-paths"'));
 assert.ok(school.includes('id="school-paths"'));
 assert.ok(schoolCss.includes('.categoryLater{grid-column:1/-1'));
 assert.ok(startCss.includes('.grid>*:last-child:nth-child(odd){grid-column:1/-1}'));
 assert.ok(startCss.includes('.grid>*:last-child:nth-child(odd){grid-column:auto}'));
});

test('mobile navigation and footer groups are compact disclosures',()=>{
 const header=read('components/Header.jsx');
 const footer=read('components/Footer.jsx');
 const css=read('app/phase5-navigation.css');
 assert.ok(header.includes('<details className="mobile-navigation-group"'));
 assert.ok(header.indexOf('className="mobile-search-link"')<header.indexOf('className="mobile-navigation-groups"'));
 assert.ok(header.includes("querySelectorAll('.mobile-navigation-group[open]')"));
 assert.ok(footer.includes('className="footer-link-group"'));
 assert.ok(footer.includes('<FooterGroup title="مدرسة 967">'));
 assert.ok(css.includes('.footer-link-group:not([open])>.footer-group-links{display:none}'));
 assert.ok(css.includes('.mobile-navigation-group>summary'));
});

test('debate poll copy is specific and card covers do not crop participants',()=>{
 const interaction=read('components/debates/DebateInteraction.jsx');
 const cover=read('components/debates/DebateCover.css');
 const migration=read('supabase/migrations/20261031232335_fix_debate_poll_copy.sql');
 assert.ok(interaction.includes("anchor==='polls'"));
 assert.ok(interaction.includes('سجّل الدخول لاختيار موقفك وحفظ صوتك'));
 assert.ok(cover.includes('.debate-card-art .debate-cover>img{object-fit:contain'));
 assert.ok(migration.includes("debate.slug = 'yemen-digital-services-test'"));
 assert.ok(migration.includes("set label = 'أؤيد التحول الرقمي الكامل خلال خمس سنوات'"));
 assert.ok(migration.includes('and option.position = 0'));
});
