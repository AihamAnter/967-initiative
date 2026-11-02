import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile tabs represent route groups and non-primary sections',()=>{
 const header=read('components/Header.jsx');
 const shell=read('app/foundation/shell.css');
 assert.ok(header.includes("mobileSectionActive('media')"));
 assert.ok(header.includes("mobileSectionActive('knowledge')"));
 assert.ok(header.includes("const mobileMenuSection = sections.find"));
 assert.ok(header.includes("mobileMenuSection?.label || 'القائمة'"));
 assert.ok(shell.includes('.ed-tabbar button[data-current]'));
});

test('reported accessibility violations have explicit fixes',()=>{
 const smart=read('components/home/HomeSmartStart.jsx');
 const games=read('app/games/page.jsx');
 const history=read('components/history/HistoryMedia.module.css');
 const numbers=read('app/yemen-in-numbers/numbers.css');
 assert.ok(smart.includes('role="status" aria-busy="true"'));
 assert.ok(!smart.includes('aria-busy="true" aria-label='));
 assert.ok(!games.includes("aria-label={'العب '+game.title}"));
 assert.ok(history.includes('text-decoration:underline'));
 assert.ok(numbers.includes('[class*="CrossSectionPaths_content"] small { color: var(--c-accent-strong); }'));
 assert.ok(numbers.includes('min-height: var(--target)'));
});

test('mobile discovery is compact without hiding desktop content or horizontal filters',()=>{
 const home=read('app/page.jsx');
 const front=read('app/front.module.css');
 const knowledge=read('components/knowledge/KnowledgeNavigation.module.css');
 const search=read('app/platform-refinements.css');
 assert.ok(home.includes('<MobileFold title="المزيد من طرق الاستكشاف"'));
 assert.ok(home.includes('<MobileFold title="عرض مختارات إضافية"'));
 assert.ok(front.includes('.front { --s-section: 40px; }'));
 assert.ok(knowledge.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(search.includes('.search-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
});
