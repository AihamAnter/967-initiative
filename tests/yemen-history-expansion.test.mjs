import test from 'node:test';
import assert from 'node:assert/strict';
import {historyStarter,historyEras,historyEntryPath,historyBySlug} from '../lib/yemenHistory.js';
import {mergeHistoryCatalog,validateHistoryEntry} from '../lib/historyRepository.js';
import {originsExpansion} from '../lib/historyExpansionOrigins.js';
import {ancientExpansion} from '../lib/historyExpansionAncient.js';
import {islamExpansion} from '../lib/historyExpansionIslam.js';
import {dynastyExpansion} from '../lib/historyExpansionDynasties.js';
import {empiresExpansion} from '../lib/historyExpansionEmpires.js';
import {modernExpansion} from '../lib/historyExpansionModern.js';
import {buildSearchIndex} from '../lib/search.js';
import {buildSitemap,DEFAULT_SITE_ORIGIN} from '../lib/seo.js';

test('expanded Yemen history spans six eras and includes at least 170 distinct substantial dossiers',()=>{
 const expansions={origins:originsExpansion,ancient:ancientExpansion,islam:islamExpansion,dynasties:dynastyExpansion,empires:empiresExpansion,modern:modernExpansion};
 assert.deepEqual(Object.keys(expansions),historyEras.map(x=>x.id));
 for(const [era,items] of Object.entries(expansions)){
  assert.ok(items.length>=12,`${era} has too few new topics`);
  assert.ok(items.every(x=>x.era===era),era);
 }
 assert.ok(historyStarter.length>=170,`Only ${historyStarter.length} history entries loaded`);
 const slugs=new Set(historyStarter.map(x=>x.slug));
 assert.equal(slugs.size,historyStarter.length,'duplicate historical slug');
 for(const entry of historyStarter){
  assert.doesNotThrow(()=>validateHistoryEntry(entry),entry.slug);
  assert.ok(entry.paragraphs.length>=2,entry.slug+' missing narrative');
  assert.ok(entry.paragraphs.every(x=>x.length>45),entry.slug+' has a placeholder paragraph');
  assert.ok(entry.summary.length>=25,entry.slug+' has a placeholder summary');
  assert.ok(entry.sources.length>=1,entry.slug+' has no references');
  assert.ok(entry.sources.every(x=>x.title&&/^https:\/\//.test(x.url)),entry.slug+' source is invalid');
  assert.ok(entry.related.every(x=>slugs.has(x)&&x!==entry.slug),entry.slug+' related record missing');
  assert.ok(Number.isInteger(entry.year)&&entry.year<=2026&&entry.year>=-30000,entry.slug+' year out of bounds');
  assert.equal(historyBySlug(entry.slug).title,entry.title);
 }
 assert.ok(['saba','sirwah','qanah-port','yu-firids','mamluks-yemen','coffee-terraces','war-1994','un-truce-2022'].every(x=>slugs.has(x)));
});

test('historic admin overrides survive catalogue expansion and drafts are excluded from search and sitemap',()=>{
 const target=historyBySlug('saba'),reference=historyBySlug('portuguese-red-sea');
 const catalog=mergeHistoryCatalog([{...target,summary:'تحرير إداري محفوظ من قبل فريق المبادرة مع بقاء بقية المواد الجديدة متاحة.',isPublished:false}]);
 assert.equal(catalog.length,historyStarter.length);
 assert.equal(catalog.find(x=>x.slug==='saba').isPublished,false);
 assert.equal(catalog.find(x=>x.slug==='portuguese-red-sea').title,reference.title);
 const search=buildSearchIndex({history:catalog});
 assert.equal(search.some(x=>x.href===historyEntryPath('saba')),false);
 assert.equal(search.some(x=>x.href===historyEntryPath('portuguese-red-sea')),true);
 const sitemap=buildSitemap({history:catalog},{NODE_ENV:'production',VERCEL_ENV:'production'}).map(x=>x.url);
 assert.ok(!sitemap.includes(DEFAULT_SITE_ORIGIN+historyEntryPath('saba')));
 assert.ok(sitemap.includes(DEFAULT_SITE_ORIGIN+historyEntryPath('portuguese-red-sea')));
});

test('publication covers not only kings and wars but daily life, archaeology, cities and women',()=>{
 const kinds=new Set(historyStarter.map(e=>e.kind));
 assert.ok(['state','event','society','heritage','place','theme'].every(kind=>kinds.has(kind)));
 const subjects=['rawk-statuettes','timna','islamic-manuscripts','jibla-capital','ottoman-taxation','women-in-national-dialogue'];
 assert.ok(subjects.every(slug=>historyBySlug(slug)),subjects.filter(slug=>!historyBySlug(slug)).join(','));
});
