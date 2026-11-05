import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {historyStarter,historyBySlug} from '../lib/yemenHistory.js';
import {validateHistoryEntry} from '../lib/historyRepository.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sites=[
 ['whc-shibam-1982',1982,'YE19'],
 ['whc-sanaa-1986',1986,'YE13'],
 ['whc-zabid-1993',1993,'YE18'],
 ['whc-socotra-2008',2008,'YE32'],
 ['whc-marib-2023',2023,'YE26'],
];

test('five UNESCO knowledge milestones have valid sourced historical dossiers',()=>{
 assert.ok(historyStarter.length>=177);
 const slugs=new Set(historyStarter.map(item=>item.slug));
 assert.equal(slugs.size,historyStarter.length);
 for(const [slug,year,governorate] of sites){
  const item=historyBySlug(slug);
  assert.ok(item,slug);
  assert.equal(item.year,year);
  assert.equal(item.governorate,governorate);
  assert.ok(item.paragraphs.length>=3,slug);
  assert.ok(item.sources.some(source=>source.url.startsWith('https://whc.unesco.org/')),slug);
  assert.ok(item.summary.length>35,slug);
  assert.ok(item.related.every(value=>slugs.has(value)),slug);
  assert.doesNotThrow(()=>validateHistoryEntry(item),slug);
 }
});

test('knowledge navigation presents five visible destinations with mobile scroll',()=>{
 const nav=read('components/knowledge/KnowledgeNavigation.jsx');
 const css=read('components/knowledge/KnowledgeNavigation.module.css');
 assert.ok(nav.includes('KNOWLEDGE_AREAS.filter(area=>isVisible(area.href))'));
 assert.ok(nav.includes("aria-current={selected?'page':undefined}"));
 assert.ok(nav.includes('styles.copy'));
 assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('scroll-snap-type:x proximity'));
 assert.ok(css.includes('min-height:71px'));
 assert.ok(css.includes('var(--c-surface)'));
});

test('source-linked UNESCO discovery cards use the correct atlas regional links',()=>{
 const guide=read('components/knowledge/KnowledgeGuides.jsx');
 for(const [,year,region] of sites){
  assert.ok(guide.includes("region:'"+region+"'"),region);
  assert.ok(guide.includes("year:'"+year+"'"),String(year));
 }
 assert.ok(guide.includes('https://whc.unesco.org/en/statesparties/ye/'));
 assert.ok(guide.includes("'/yemen-map?region='+item.region+'#map'"));
 assert.ok(guide.includes('تاريخ الإدراج ليس تاريخ تأسيس الموقع'));
 assert.ok(guide.includes('KnowledgeReadingGuide'));
});

test('knowledge listing pages show guides while keeping existing tools',()=>{
 const history=read('app/yemen-history/page.jsx');
 const figures=read('app/yemeni-figures/page.jsx');
 const numbers=read('app/yemen-in-numbers/page.jsx');
 const ranking=read('app/yemen-ranking/page.jsx');
 const map=read('components/yemen-map/YemenDiscovery.jsx');
 assert.ok(history.includes('<KnowledgeReadingGuide kind="history"/>')&&history.includes('<HistoryExplorer'));
 assert.ok(figures.includes('<KnowledgeReadingGuide kind="figures"/>')&&figures.includes('<YemeniFiguresExplorer'));
 assert.ok(numbers.includes('<KnowledgeReadingGuide kind="statistics"/>')&&numbers.includes('<StatisticsExplorer'));
 assert.ok(ranking.includes('<KnowledgeReadingGuide kind="ranking"/>')&&ranking.includes('<YemenRankingExplorer'));
 assert.ok(map.includes('<HeritageTrail/>')&&map.includes('<YemenMap'));
 assert.ok(map.includes('visibleGovernorates.map(item=>'));
 assert.ok(map.includes('onGovernorateExplore={explorePlace}'));
});

test('details offer readable in-page navigation and preserve evidence',()=>{
 const history=read('app/yemen-history/[slug]/page.jsx');
 const figures=read('app/yemeni-figures/[slug]/page.jsx');
 const governorate=read('app/yemen-map/governorates/[id]/page.jsx');
 assert.ok(history.includes('readingMinutes'));
 assert.ok(history.includes('id="history-reading"'));
 assert.ok(history.includes('id="history-related"'));
 assert.ok(history.includes('item.sources.map'));
 assert.ok(figures.includes('figure-profile-reading-path')&&figures.includes('id="figure-profile-content"'));
 assert.ok(figures.includes('FigureDossier')&&figures.includes('hasFigureImageProvenance'));
 assert.ok(governorate.includes('id="province-sources"'));
 assert.ok(governorate.includes('districtDisclosure'));
 assert.ok(governorate.includes('readPublicMapProfiles'));
});

test('knowledge visuals scope colors, offer mobile layouts and honor reduced motion',()=>{
 const css=read('app/knowledge-experience.css');
 const theme=read('components/knowledge/KnowledgeTheme.jsx');
 const guide=read('components/knowledge/KnowledgeGuides.module.css');
 const history=read('components/history/HistoryExplorer.module.css');
 for(const area of ['history','figures','atlas','statistics','ranking'])
  assert.ok(css.includes('[data-knowledge-area'),area);
 assert.ok(theme.includes("import '@/app/knowledge-experience.css'"));
 assert.ok(css.includes('var(--c-bg)'));
 assert.ok(css.includes('var(--c-surface)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(guide.includes('prefers-reduced-motion:reduce'));
 assert.ok(history.includes('@media(max-width:650px)'));
 assert.ok(!css.includes('.admin-page'));
});
