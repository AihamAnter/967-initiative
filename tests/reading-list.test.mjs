import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReadingList,readingListItem,readingContentItem,readingPathInfo,publicReadingHref,READING_LIST_LIMIT} from '../lib/readingList.js';

test('saved reading entries require matching public paths and bounded plain titles',()=>{
  const entry=readingListItem({kind:'issue',href:'/magazine/'+encodeURIComponent('اليمن'),title:'  مجلة اليمن  ',privateField:'discard'});
  assert.deepEqual(entry,{kind:'issue',href:'/magazine/'+encodeURIComponent('اليمن'),title:'مجلة اليمن'});
  assert.equal(readingListItem({kind:'work',href:'/works/one',title:'x'.repeat(500)}).title.length,180);
  for(const href of ['https://evil.test/works/one','//evil.test/works/one','/admin','/works/../admin','/works/%2e%2e','/works/one?token=secret','/works/one#anchor','/works/%2fadmin','/works/%5cadmin','/works/%00','/works/%zz'])assert.equal(readingListItem({kind:'work',href,title:'sample'}),null,href);
  assert.equal(readingListItem({kind:'issue',href:'/works/one',title:'sample'}),null);
  assert.equal(readingListItem({kind:'work',href:'/works/one',title:'  '}),null);
});

test('saved content types and legacy public page bookmarks remain readable',()=>{
  const examples={work:'/works/film',issue:'/magazine/issue-2',figure:'/yemen-map/figures/arwa',company:'/yemeni-products/tehama',professional:'/professionals/ali',indicator:'/yemen-in-numbers/indicator/population',domain:'/yemen-in-numbers/population',debate:'/debates/discussion',speaker:'/debates/speakers/ali',ranking:'/yemen-ranking',map:'/yemen-map',timeline:'/yemen-in-numbers/timeline',search:'/search',page:'/pages/about-us'};
  for(const [kind,href] of Object.entries(examples)){
    assert.equal(readingPathInfo(href)?.kind,kind,href);
    assert.deepEqual(readingListItem({kind,href,title:'عنوان'}),{kind,href,title:'عنوان'});
  }
  for(const href of ['/','/works','/magazine','/yemeni-products','/professionals','/yemen-in-numbers','/debates','/debates/suggest','/about','/help','/privacy','/terms','/privacy-requests','/contribute']) assert.equal(readingPathInfo(href)?.kind,'page',href);
  assert.equal(readingListItem({kind:'company',href:examples.figure,title:'عنوان'}),null);
});

test('new saves accept individual topics and profiles, never directories or general pages',()=>{
  for(const [kind,href] of [['company','/yemeni-products/tehama'],['figure','/yemen-map/figures/arwa'],['professional','/professionals/ali'],['work','/works/film'],['issue','/magazine/issue-2'],['indicator','/yemen-in-numbers/indicator/population'],['debate','/debates/discussion'],['speaker','/debates/speakers/ali']]){
    const item={kind,href,title:'عنوان'};
    assert.deepEqual(readingContentItem(item),item);
  }
  for(const href of ['/','/yemeni-products','/professionals','/works','/magazine','/yemen-map','/yemen-in-numbers','/yemen-in-numbers/population','/yemen-in-numbers/timeline','/yemen-ranking','/debates','/debates/suggest','/search','/about','/help','/contribute','/pages/about-us']){
    const item={kind:readingPathInfo(href).kind,href,title:'صفحة سابقة'};
    assert.equal(readingContentItem(item),null,href);
    assert.deepEqual(parseReadingList(JSON.stringify([item])),[item]);
  }
});

test('private, administrative, authentication and unsupported destinations cannot become saved pages',()=>{
  for(const href of ['/admin','/admin/tasks','/account','/account/activity','/login','/register','/forgot-password','/update-password','/auth/callback','/read-later','/api/public','/missing','https://example.com','//example.com','/pages/%2e%2e','/pages/%2Fadmin','/professionals/%00']){
    assert.equal(readingPathInfo(href),null,href);
    assert.equal(publicReadingHref(href),null,href);
    assert.equal(readingListItem({kind:'page',href,title:'عنوان'}),null,href);
  }
});

test('saved views preserve relevant public filters and strip return URLs and unrelated parameters',()=>{
  assert.equal(publicReadingHref('/professionals','page=1&location=عدن&q=نجار&token=secret&from=/admin'),'/professionals?q='+encodeURIComponent('نجار')+'&location='+encodeURIComponent('عدن'));
  assert.equal(publicReadingHref('/yemen-ranking','compare=SAU&scope=arab&year=2023&indicator=population'),'/yemen-ranking?indicator=population&year=2023&scope=arab&compare=SAU');
  assert.equal(publicReadingHref('/yemeni-products/tehama','from=/yemeni-products?category=food&token=secret'),'/yemeni-products/tehama');
  assert.equal(publicReadingHref('/contribute','email=private@example.com&message=private'),'/contribute');
  assert.equal(readingListItem({kind:'company',href:'/yemeni-products/tehama?token=secret',title:'عنوان'}),null);
  const filtered={kind:'page',href:'/professionals?location='+encodeURIComponent('عدن')+'&q='+encodeURIComponent('نجار'),title:'مهنيون'};
  assert.equal(readingListItem(filtered).href,publicReadingHref('/professionals',filtered.href.split('?')[1]));
});

test('existing work and magazine saves survive alongside new content and canonical duplicates collapse',()=>{
  const legacy=[{kind:'work',href:'/works/one',title:'عمل'},{kind:'issue',href:'/magazine/issue-2',title:'مجلة'}];
  const company={kind:'company',href:'/yemeni-products/tehama',title:'شركة'};
  const list=parseReadingList(JSON.stringify([...legacy,company,{...company,href:company.href+'/'},{kind:'figure',href:'/yemen-map/figures/arwa',title:'أروى'}]));
  assert.deepEqual(list.slice(0,3),[...legacy,company]);
  assert.equal(list.length,4);
  assert.equal(readingListItem({kind:'figure',href:'/yemen-map/figures/'+encodeURIComponent('الملكة أروى'),title:'الملكة أروى'}).title,'الملكة أروى');
});

test('corrupt browser storage, duplicates, unexpected fields and oversized lists never leak into reading links',()=>{
  for(const value of [null,'','not json','{}','42','null'])assert.deepEqual(parseReadingList(value),[]);
  const work={kind:'work',href:'/works/one',title:'عمل'};
  assert.deepEqual(parseReadingList(JSON.stringify([work,{...work,title:'duplicate'},null,{href:'javascript:alert(1)'}])),[work]);
  const many=Array.from({length:120},(_,i)=>({...work,href:'/works/item-'+i}));
  assert.equal(parseReadingList(JSON.stringify(many)).length,READING_LIST_LIMIT);
});
