import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('history, figures and map share the exact blue introductory design of the other knowledge pages',()=>{
 const shared=read('components/knowledge/KnowledgePageIntro.jsx');
 assert.ok(shared.includes("import PageIntro from '@/components/PageIntro'"));
 assert.ok(shared.includes("import '@/app/interior-design.css'"));
 assert.ok(shared.includes('className="interior-page" data-area="statistics"'));
 assert.ok(shared.includes('<PageIntro tone="blue"'));
 for(const path of ['app/yemen-history/page.jsx','app/yemeni-figures/page.jsx','app/yemen-map/page.jsx']){
  const content=read(path);
  assert.ok(content.includes("import KnowledgePageIntro from '@/components/knowledge/KnowledgePageIntro'"),path);
  assert.ok(content.includes('<KnowledgePageIntro'),path);
  assert.ok(content.includes('className="directory-summary"'),path);
  assert.ok(!content.includes('className="ymap-hero"'),path);
 }
 assert.ok(read('app/yemen-ranking/page.jsx').includes('<PageIntro tone="blue"'));
 assert.ok(read('app/yemen-in-numbers/page.jsx').includes('<PageIntro tone="blue"'));
});

test('navigation in the unified headers remains actionable and content remains unchanged',()=>{
 const history=read('app/yemen-history/page.jsx');
 assert.ok(history.includes('title="تاريخ اليمن"'));
 assert.ok(history.includes('href="#eras"'));
 assert.ok(history.includes('href="#history-compare-heading"'));
 assert.ok(history.includes('<HistoryExplorer'));
 const figures=read('app/yemeni-figures/page.jsx');
 assert.ok(figures.includes('title="شخصيات يمنية"'));
 assert.ok(figures.includes('href="#yemeni-figures"'));
 assert.ok(figures.includes('<YemeniFiguresExplorer'));
 const directory=read('components/yemen-map/YemeniFiguresDirectory.jsx');
 assert.ok(directory.includes('id="yemeni-figures"'));
 const map=read('app/yemen-map/page.jsx');
 assert.ok(map.includes('title="خريطة اليمن"'));
 assert.ok(map.includes('href="#map"'));
 assert.ok(map.includes('<YemenDiscovery'));
 const discovery=read('components/yemen-map/YemenDiscovery.jsx');
 assert.ok(discovery.includes('id="map"'));
 // Only the landing hero has changed, not the historical dossiers' styling.
 assert.ok(read('app/yemen-history/HistoryPage.module.css').includes('.articleHero{'));
 assert.ok(!read('app/yemen-history/HistoryPage.module.css').startsWith('.hero{'));
});
