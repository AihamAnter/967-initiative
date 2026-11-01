import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const detailPages=[
 ['history','app/yemen-history/[slug]/page.jsx'],
 ['figures','app/yemeni-figures/[slug]/page.jsx'],
 ['atlas','app/yemen-map/governorates/[id]/page.jsx'],
];

test('detail pages inherit the correct knowledge identity and provide a route back',()=>{
 for(const [area,path] of detailPages){
  const text=read(path);
  assert.ok(text.includes('<KnowledgeTheme area="'+area+'">'),path);
  assert.ok(text.includes('<KnowledgeNavigation/>'),path);
  assert.equal((text.match(/<KnowledgeTheme area=/g)||[]).length,1,path);
  assert.equal((text.match(/<\/KnowledgeTheme>/g)||[]).length,1,path);
  assert.equal((text.match(/<KnowledgeNavigation\/>/g)||[]).length,1,path);
  assert.ok(text.indexOf('</KnowledgeTheme>')>text.indexOf('<KnowledgeTheme area='),path);
  assert.ok(text.includes('ContextBackLink'),path);
 }
 const figure=read('app/yemeni-figures/[slug]/page.jsx');
 assert.ok(figure.indexOf('</KnowledgeTheme>')>figure.indexOf('export default async function YemeniFigureProfilePage'));
 assert.ok(!figure.slice(0,figure.indexOf('export default async function YemeniFigureProfilePage')).includes('</KnowledgeTheme>'));
});

test('historical types are classified visually without changing the timeline/filters',()=>{
 const explorer=read('components/history/HistoryExplorer.jsx');
 const timeline=read('components/history/HistoryTimeline.jsx');
 const cards=read('components/history/HistoryExplorer.module.css');
 const axis=read('components/history/HistoryTimeline.module.css');
 assert.ok(explorer.includes('data-history-kind={entry.kind}'));
 assert.ok(timeline.includes('data-history-kind={entry.kind}'));
 for(const type of ['state','event','society','heritage','place','theme'])assert.ok(cards.includes('data-history-kind="'+type+'"'),type);
 assert.ok(cards.includes('.eraSelected{background:var(--knowledge-soft'));
 assert.ok(cards.includes('.cardBottom a{color:var(--kind-ink);min-height:44px}'));
 assert.ok(cards.includes('@media(max-width:600px)'));
 assert.ok(axis.includes('.stopButton.selected .stopCard'));
 assert.ok(timeline.includes('aria-pressed={active}'));
 assert.ok(timeline.includes('scrollIntoView'));
 assert.ok(explorer.includes("useState('timeline')"));
 assert.ok(explorer.includes('history.replaceState'));
});

test('history dossiers keep citations, evidence and existing cross-section links',()=>{
 const p=read('app/yemen-history/[slug]/page.jsx');
 const css=read('app/yemen-history/HistoryPage.module.css');
 for(const token of ['HistoryMedia','HistoryEditAction','ContentReadingAction','CorrectionLink','CrossSectionPaths','item.sources.map','className={styles.articleAside}'])assert.ok(p.includes(token),token);
 for(const token of ['.articleHero{background:linear-gradient','.articleAside{border-color','.references{border-color','.locationGrid a{position:relative'])assert.ok(css.includes(token),token);
});

test('personality cards distinguish era/field and preserve actual verified portraits',()=>{
 const listing=read('components/yemen-map/YemeniFiguresDirectory.jsx');
 const figure=read('app/yemeni-figures/[slug]/page.jsx');
 const css=read('app/knowledge-content.css');
 for(const token of ['hasFigureImageProvenance(figure)','className="yfigure-era"','className="yfigure-meta"','className="yfigure-location"','SaveForLater','ActiveFilters','resetFilters','aria-label={`عرض صفحة'])assert.ok(listing.includes(token),token);
 assert.ok(figure.includes('hasFigureImageProvenance(figure,portrait)'));
 assert.ok(figure.includes('FigureDossier'));
 assert.ok(css.includes('[data-knowledge-area="figures"] .yfigure-meta span'));
 assert.ok(css.includes('[data-knowledge-area="figures"] .yfigure-era'));
 assert.ok(css.includes('[data-knowledge-area="figures"] .figure-profile-facts'));
 assert.ok(css.includes('[data-knowledge-area="figures"] .yfigure-card-hitarea:focus-visible'));
});

test('province entries are visually numbered, but links and map behavior are unchanged',()=>{
 const discovery=read('components/yemen-map/YemenDiscovery.jsx');
 const css=read('components/yemen-map/YemenDiscovery.module.css');
 const province=read('app/yemen-map/governorates/[id]/page.jsx');
 const provinceCss=read('app/yemen-map/governorates/[id]/GovernorateProfile.module.css');
 assert.ok(discovery.includes("yemenGovernorates.map((item,index)=>"));
 assert.ok(discovery.includes("String(index+1).padStart(2,'0')"));
 assert.ok(discovery.includes("href={'/yemen-map/governorates/'+item.id}"));
 assert.ok(discovery.includes('<YemenMap'));
 assert.ok(discovery.includes('onGovernorateExplore={explorePlace}'));
 assert.ok(css.includes('.governorateNumber{display:inline-grid'));
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(province.includes('CrossSectionPaths'));
 assert.ok(province.includes('governorateProfileSections'));
 assert.ok(province.includes('readPublicMapProfiles'));
 assert.ok(provinceCss.includes('.facts>div{background:#fff'));
});

test('atlas data panel remains functional and more readable with no pointer overrides',()=>{
 const panel=read('components/yemen-map/RegionInfoPanel.jsx');
 const css=read('app/knowledge-content.css');
 assert.ok(panel.includes('onDistrictSelect(district)'));
 assert.ok(panel.includes('onGovernorateBack'));
 assert.ok(panel.includes('profile.sources'));
 assert.ok(panel.includes('className="ymap-info-grid"'));
 for(const token of ['.ymap-info-head','.ymap-info-field','.ymap-district-list button','.ymap-info-panel footer'])assert.ok(css.includes('[data-knowledge-area="atlas"] '+token),token);
 assert.ok(!css.includes('pointer-events:none'));
 assert.ok(!css.includes('.ymap-canvas'));
 assert.ok(!css.includes('.ymap-stage'));
});

test('all stage-two styling is scoped; nothing changes editor, database or global color tokens',()=>{
 const css=read('app/knowledge-content.css');
 // Design B: legacy global sheets moved from the root layout to the legacy stack used by non-migrated routes.
 const layout=read('components/legacy/LegacyStyles.js');
 const root=read('app/knowledge-identity.css');
 assert.ok(layout.includes("import '@/app/knowledge-content.css';"));
 assert.ok(!css.includes(':root'));
 assert.ok(css.includes('[data-knowledge-area="atlas"]'));
 assert.ok(css.includes('[data-knowledge-area="figures"]'));
 assert.ok(!css.includes('.site-header'));
 assert.ok(!css.includes('.platform-footer'));
 assert.ok(root.includes('[data-knowledge-area="history"]'));
});
