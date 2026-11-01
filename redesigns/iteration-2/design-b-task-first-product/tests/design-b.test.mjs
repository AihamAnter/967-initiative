import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {imageDelivery, imageRemotePatterns} from '../lib/imagePolicy.js';
import {NAV_TASKS, activeTask, isActivePath, navTasks} from '../lib/navigation.js';
import {addToRecentTrail, parseRecentTrail, recentTrailEntry, RECENT_TRAIL_LIMIT} from '../lib/recentTrail.js';
import {pageIsVisible} from '../lib/pageVisibility.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('one image policy: optimizer only for allowlisted host AND path, never for unsafe URLs', () => {
  const patterns = imageRemotePatterns('https://abc.supabase.co');
  assert.equal(imageDelivery('/images/logo.png', patterns), 'local');
  assert.equal(imageDelivery('https://i.ytimg.com/vi/x/hqdefault.jpg', patterns), 'optimize');
  assert.equal(imageDelivery('https://upload.wikimedia.org/wikipedia/commons/a/b.jpg', patterns), 'optimize');
  assert.equal(imageDelivery('https://abc.supabase.co/storage/v1/object/public/covers/a.jpg', patterns), 'optimize');
  // Allowed host, path outside the allowlist: rendered directly instead of throwing in next/image.
  assert.equal(imageDelivery('https://abc.supabase.co/storage/v1/object/private/a.jpg', patterns), 'direct');
  assert.equal(imageDelivery('https://i.ytimg.com/an_webp/x.webp', patterns), 'direct');
  assert.equal(imageDelivery('https://example.com/a.jpg', patterns), 'direct');
  for (const bad of ['http://i.ytimg.com/vi/x.jpg', 'javascript:alert(1)', '//evil.test/a.png', 'not a url', '', null, 'https://u:p@i.ytimg.com/vi/x.jpg', '/a\\b.png'])
    assert.equal(imageDelivery(bad, patterns), null, String(bad));
  assert.ok(read('next.config.mjs').includes('imageRemotePatterns(process.env.NEXT_PUBLIC_SUPABASE_URL)'));
});

test('optional home and detail sections fail alone, inside their own boundaries', () => {
  const home = read('app/page.jsx');
  assert.ok(home.includes('const settle = promise => promise.then('));
  assert.equal((home.match(/<SectionBoundary /g) || []).length, 3);
  assert.equal((home.match(/<Suspense /g) || []).length, 3);
  assert.ok(!home.includes('Promise.all([\n    getWorks'));
  const detail = read('app/works/[slug]/page.jsx');
  // The record is resolved (404/redirect) before anything streams; only related works stream.
  assert.ok(detail.indexOf('if (!work) notFound();') < detail.indexOf('<Suspense'));
  assert.ok(detail.includes('<SectionBoundary name="related-works"'));
  assert.ok(read('components/ui/SafeImage.jsx').includes("if (!delivery || failed === src) return fallback;"));
});

test('six task verbs are the single navigation vocabulary, filtered by visibility', () => {
  assert.deepEqual(NAV_TASKS.map(task => task.verb), ['اقرأ وشاهد', 'استكشف اليمن', 'تعلّم', 'العب', 'اعثر على خدمة', 'شارك']);
  const all = NAV_TASKS.flatMap(task => task.links.map(([href]) => href));
  assert.equal(new Set(all).size, all.length, 'no destination appears under two tasks');
  const hidden = navTasks({isVisible: href => pageIsVisible(href, {statistics: false, games: false})});
  assert.ok(!hidden.some(task => task.id === 'play'));
  const explore = hidden.find(task => task.id === 'explore');
  assert.ok(!explore.links.some(([href]) => href === '/yemen-in-numbers'));
  assert.notEqual(explore.href, '/yemen-in-numbers', 'primary tap falls back to a visible sibling');
  const join = navTasks({contentLinks: [{slug: 'about', title: 'من نحن', href: '/about'}, {slug: 'terms', title: 'الشروط', href: '/terms'}]}).find(task => task.id === 'join');
  assert.ok(join.links.some(([href]) => href === '/about'));
  assert.ok(!join.links.some(([href]) => href === '/terms'));
  assert.equal(activeTask('/yemen-in-numbers/indicator/x', NAV_TASKS), 'explore');
  assert.equal(activeTask('/school/writing/musnad', NAV_TASKS), 'learn');
  assert.equal(isActivePath('/works', '/#projects'), false);
  for (const file of ['components/Header.jsx', 'components/Footer.jsx', 'components/wayfinder/TaskLauncher.jsx'])
    assert.ok(read(file).includes('navTasks('), file);
});

test('recent trail stays local, keeps only public detail pages, and is bounded', () => {
  const entry = recentTrailEntry('/yemen-in-numbers/indicator/population', 'عدد السكان | مبادرة 967', 1);
  assert.deepEqual({href: entry.href, title: entry.title, kind: entry.kind}, {href: '/yemen-in-numbers/indicator/population', title: 'عدد السكان', kind: 'indicator'});
  assert.equal(recentTrailEntry('/account', 'حسابي'), null);
  assert.equal(recentTrailEntry('/works', 'الأعمال'), null, 'collections are not detail pages');
  assert.equal(recentTrailEntry('/works/x', 'مبادرة 967 | صوت ومعرفة ومجتمع'), null, 'default title (e.g. 404) is ignored');
  let items = [];
  for (let i = 0; i < 10; i++) items = addToRecentTrail(items, recentTrailEntry('/works/w' + i, 'عمل ' + i, i));
  assert.equal(items.length, RECENT_TRAIL_LIMIT);
  assert.equal(items[0].href, '/works/w9');
  assert.deepEqual(parseRecentTrail(JSON.stringify([{href: 'https://evil.test', title: 'x', at: 1}, ...items])).length, RECENT_TRAIL_LIMIT);
  assert.deepEqual(parseRecentTrail('{bad json'), []);
});

test('root layout ships only fonts, tokens and base; legacy stack is scoped to non-migrated routes', () => {
  const root = read('app/layout.jsx');
  const imports = [...root.matchAll(/^import '(\.\/[^']+\.css)';$/gm)].map(match => match[1]);
  assert.deepEqual(imports, ['./fonts.css', './ui-tokens.css', './ui-base.css']);
  for (const route of ['app/works/layout.jsx', 'app/yemen-in-numbers/layout.jsx'])
    assert.ok(!read(route).includes('LegacyStyles') && !read(route).includes('interior-design.css'), route);
  for (const route of ['app/games/layout.jsx', 'app/school/layout.jsx', 'app/magazine/layout.jsx', 'app/yemen-in-numbers/timeline/layout.jsx', 'app/yemen-in-numbers/[slug]/layout.jsx', 'app/search/layout.jsx'])
    assert.ok(read(route).includes("import '@/components/legacy/LegacyStyles';"), route);
  const tokens = read('app/ui-tokens.css');
  assert.ok(tokens.includes('--ui-target:44px'));
  assert.ok(tokens.includes('@media (prefers-reduced-motion:reduce)'));
  // Two font weights only (400/700) across the redesigned CSS.
  for (const file of ['app/ui-base.css', 'components/shell/Header.module.css', 'components/wayfinder/Cards.module.css', 'app/home.module.css'])
    assert.ok(!/font-weight:\s*(500|600|800|900)/.test(read(file)), file);
});

test('server-side lists keep shareable URL state and send one page of cards', () => {
  const works = read('app/works/page.jsx');
  assert.ok(works.includes('readListState(params.toString(), collectionDefaults.works)'));
  assert.ok(works.includes('getWorks(WORK_CARD_FIELDS)'));
  assert.ok(works.includes('matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)'));
  assert.ok(works.includes('id="works-results"'));
  const numbers = read('app/yemen-in-numbers/page.jsx');
  assert.ok(numbers.includes('visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)'));
  assert.ok(numbers.includes('id="indicators"'));
  assert.ok(!numbers.includes('StatisticsExplorer'), 'no full-series client explorer');
});

test('iteration 2: the home keeps every section of the original home (content parity)', () => {
  const home = read('app/page.jsx') + read('components/wayfinder/HomeSections.jsx');
  const parity = {
    '1 hero': ['settings.heroEyebrow', 'settings.heroTitle', 'settings.heroDescription', 'role="search"'],
    '2 smart start': ['من أين تحب أن تبدأ؟', 'ابدأ بالتعلم', 'اكتشف اليمن', 'جرّب ألعاب 967', 'سجّل الدخول لتظهر لك متابعة التعلم', '<ContinueSlot'],
    '3 picks': ['من 967، إليك.', '<LeadWork', '<IssuePick', '<DebatePick', '<NumberCard indicator={population}/>'],
    '4 school': ['id="home-school"', 'مدرسة 967', "'/school/writing'", "'/school/nature'", "'/school/logic'", "'/school/civic'", 'جميع المسارات'],
    '5 knowledge': ['id="explore-knowledge"', 'استكشف المعرفة', 'visibleHomeKnowledge(settings.pageVisibility', 'ابحث في المعرفة'],
    '6 games': ['id="home-games"', 'إلى أي مدى <em>تعرف اليمن؟</em>', 'href={dailyHref}', "'/games/map'", "'/games/timeline'", "'/games/who'", 'href="/games/leaderboard"', 'اكتشف الألعاب التسع', 'تصفح جميع الألعاب', 'اختر اللعبة'],
    '7 curiosity': ['فضولك، يحدد البداية.', 'شاهد حكاية', 'خذ وقتك للقراءة', 'افهم الصورة', "title: 'خريطة اليمن'", 'صُنع في اليمن', 'ابحث في كل المنصة'],
    '8 numbers': ['لنفهم الواقع،', 'نقترب من أرقامه.', 'استكشف المؤشرات', 'أين يقف اليمن عالميًا؟', 'highlightsOf(result.value).slice(1)'],
    '9 community': ['أشياء تُصنع. ومهارات تُنجز.', '<CompanyCard', '<ProfessionalCard', 'وكل مكان، له حكاية.'],
    '10 contribute': ['id="contact"', 'settings.participationTitle', 'settings.participationButtonLabel'],
    '11 about/projects': ['id="about"', 'مساحة تتسع لنا جميعًا.', 'id="projects"', 'مسارات نعمل على تطويرها.', '967 في الشارع', 'مشاريع مجتمعية'],
  };
  for (const [section, tokens] of Object.entries(parity)) for (const token of tokens) assert.ok(home.includes(token), section + ': ' + token);
});

test('iteration 2: light and dark tokens, motion that respects reduced-motion, no chart library on home', () => {
  const tokens = read('app/ui-tokens.css');
  assert.ok(tokens.includes('@media (prefers-color-scheme:dark)'));
  assert.ok(tokens.includes(':root:has(.ui-page)'));
  for (const world of ['read', 'explore', 'learn', 'play', 'find', 'join']) assert.ok(tokens.includes('--ui-' + world + '-a:'), world);
  const base = read('app/ui-base.css');
  assert.ok(base.includes('animation-timeline:view()'));
  assert.ok(base.includes('@view-transition{navigation:auto}'));
  assert.ok(base.includes('@media (prefers-reduced-motion:no-preference)'));
  assert.ok(read('components/shell/Header.module.css').includes('.header::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--ui-glass);backdrop-filter'));
  const home = read('app/page.jsx') + read('components/wayfinder/HomeSections.jsx') + read('components/wayfinder/Sparkline.jsx');
  assert.ok(!/recharts|IndicatorChart/.test(home));
  assert.ok(!/[٠-٩۰-۹]/u.test(home), 'Latin digits only');
});
