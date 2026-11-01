import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homeKnowledgeDestinations, visibleHomeKnowledge} from '../lib/homeKnowledge.js';
import {pageIsVisible} from '../lib/pageVisibility.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('homepage knowledge directory links to all five existing Knowledge routes without duplication',()=>{
 assert.deepEqual(homeKnowledgeDestinations.map(x=>x.href),[
  '/yemen-history','/yemen-map','/yemeni-figures','/yemen-in-numbers','/yemen-ranking',
 ]);
 assert.equal(new Set(homeKnowledgeDestinations.map(x=>x.href)).size,5);
 for(const entry of homeKnowledgeDestinations){
  assert.ok(entry.title.length>=8,entry.href);
  assert.ok(entry.description.length>38,entry.href);
  assert.equal(pageIsVisible(entry.href,{}),true,entry.href);
 }
});

test('each knowledge card respects individual publication and visibility controls',()=>{
 assert.equal(visibleHomeKnowledge().length,5);
 const hidden={history:false,figures:false,ranking:false};
 assert.deepEqual(visibleHomeKnowledge(hidden).map(x=>x.href),['/yemen-map','/yemen-in-numbers']);
 assert.equal(visibleHomeKnowledge({history:false,atlas:false,figures:false,statistics:false,ranking:false}).length,0);
 assert.deepEqual(visibleHomeKnowledge({atlas:false}).map(x=>x.href),['/yemen-history','/yemeni-figures','/yemen-in-numbers','/yemen-ranking']);
});

// Iteration 2: the knowledge hub is KnowledgeBento in components/front/FrontSections.jsx.
test('homepage renders the knowledge hub before generic shortcuts and retains existing sections',()=>{
 const page=read('app/page.jsx');
 const hub=read('components/front/FrontSections.jsx');
 assert.ok(page.includes("import {visibleHomeKnowledge} from '@/lib/homeKnowledge'"));
 assert.ok(page.includes('visibleHomeKnowledge(settings.pageVisibility,settings.contentPages||[])')||page.includes('visibleHomeKnowledge(settings.pageVisibility, settings.contentPages||[])'));
 assert.ok(page.indexOf('<KnowledgeBento items={knowledgeLinks}/>')<page.indexOf('<DiscoverRail'));
 assert.ok(page.includes('id="explore-knowledge"'));
 assert.ok(page.includes('id="home-knowledge-title"'));
 assert.ok(page.includes('aria-labelledby="home-knowledge-title"'));
 assert.ok(hub.includes("items.find(item => item.id === 'history') || items[0]"));
 assert.ok(page.includes('knowledgeLinks.length > 0 &&'));
 assert.ok(hub.includes('data-knowledge-id={item.id}'));
 assert.ok(hub.includes('href={featured.href}'));
});

test('homepage knowledge hub supports responsive phones and reduced-motion visitors',()=>{
 const css=read('app/front.module.css');
 assert.ok(css.includes('.knowledgeGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr))'));
 assert.ok(css.includes('@media (max-width: 1179px)'));
 assert.ok(css.includes('@media (max-width: 760px)'));
 assert.ok(css.includes('scroll-snap-type: x mandatory'));
 assert.ok(read('app/foundation/base.css').includes('prefers-reduced-motion: reduce'));
 assert.ok(css.includes('.kFeature'));
});
