import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {historyStarter,historyEras,historyKinds,historyEntryPath,historyYear} from '../lib/yemenHistory.js';
import {validateHistoryEntry,mergeHistoryCatalog,parseHistoryCatalog,HISTORY_CATALOG_KEY} from '../lib/historyRepository.js';
import {pageIsVisible,sectionIsVisible} from '../lib/pageVisibility.js';
import {buildSearchIndex} from '../lib/search.js';
import {buildSitemap,DEFAULT_SITE_ORIGIN} from '../lib/seo.js';
import {readingPathInfo,readingContentItem} from '../lib/readingList.js';
import {ADMIN_TAB_IDS} from '../lib/adminLists.js';

test('historical catalogue has six eras, independently sourced linked documents and no duplicate slugs',()=>{
 assert.equal(historyEras.length,6);
 assert.ok(historyStarter.length>=25);
 assert.ok(new Set(historyStarter.map(x=>x.slug)).size===historyStarter.length);
 const slugs=new Set(historyStarter.map(x=>x.slug));
 for(const item of historyStarter){
  assert.deepEqual(validateHistoryEntry(item),validateHistoryEntry(item));
  assert.ok(historyEras.some(e=>e.id===item.era));
  assert.ok(Object.hasOwn(historyKinds,item.kind));
  assert.ok(item.paragraphs.every(text=>text.length>45));
  assert.ok(item.sources.every(x=>x.title&&x.url.startsWith('https://')));
  assert.ok(item.related.every(slug=>slugs.has(slug)),item.slug+' has broken related link');
 }
 assert.equal(historyYear(-800),'800 ق.م');
 assert.equal(historyYear(1990),'1990م');
 assert.equal(historyEntryPath('saba'),'/yemen-history/saba');
});
test('history editor rejects unsafe inputs and draft material never reaches search or sitemap',()=>{
 const original=historyStarter.find(x=>x.slug==='saba');
 for(const patch of [{sources:[{title:'source',url:'javascript:alert(1)'}]},{slug:'../admin'},{era:'unknown'},{kind:'other'},{isPublished:'false'},{year:NaN},{paragraphs:[]},{sources:[]}])assert.throws(()=>validateHistoryEntry({...original,...patch}));
 const [hidden]=mergeHistoryCatalog([{...original,isPublished:false}]).filter(x=>x.slug==='saba');
 assert.equal(hidden.isPublished,false);
 const rows=mergeHistoryCatalog([{...original,isPublished:false}]);
 assert.equal(buildSearchIndex({history:rows}).some(x=>x.href==='/yemen-history/saba'),false);
 const urls=buildSitemap({history:rows},{VERCEL_ENV:'production',NODE_ENV:'production'}).map(x=>x.url);
 assert.ok(urls.includes(DEFAULT_SITE_ORIGIN+'/yemen-history'));
 assert.ok(!urls.includes(DEFAULT_SITE_ORIGIN+'/yemen-history/saba'));
 assert.ok(urls.includes(DEFAULT_SITE_ORIGIN+'/yemen-history/qataban'));
 assert.throws(()=>parseHistoryCatalog({value:{version:20,entries:[]}}));
 assert.equal(HISTORY_CATALOG_KEY,'yemen_history_catalog_v1');
});
test('history is a separate toggle, searchable, bookmarkable and editorially manageable',()=>{
 assert.equal(sectionIsVisible('history',{}),true);
 assert.equal(pageIsVisible('/yemen-history/saba',{history:false}),false);
 assert.equal(pageIsVisible('/yemen-map',{history:false}),true);
 assert.equal(pageIsVisible('/yemeni-figures',{history:false}),true);
 const items=buildSearchIndex({history:[historyStarter.find(x=>x.slug==='saba')]});
 assert.equal(items[0].type,'history');
 assert.equal(readingPathInfo('/yemen-history/saba')?.kind,'history');
 assert.deepEqual(readingContentItem({kind:'history',href:'/yemen-history/saba',title:'سبأ'}),{kind:'history',href:'/yemen-history/saba',title:'سبأ'});
 assert.ok(ADMIN_TAB_IDS.includes('history'));
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.ok(read('components/Header.jsx').includes("['/yemen-history', 'تاريخ اليمن']"));
 assert.ok(read('components/AdminDashboard.jsx').includes("<HistoryAdminPanel"));
 assert.ok(read('app/yemen-history/page.jsx').includes('<HistoryExplorer'));
 assert.ok(read('app/yemen-history/[slug]/page.jsx').includes('CorrectionLink'));
 assert.ok(read('app/api/admin/history/route.js').includes('authorizeEditorRequest'));
});
