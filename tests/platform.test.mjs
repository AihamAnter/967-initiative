import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIndicator} from '../lib/yemenNumbers.js';
import {fetchAllRows} from '../lib/pagination.js';
import {normalizeSearch, matchesSearch, matchesSearchResult, buildSearchIndex} from '../lib/search.js';
import {yemeniFiguresCatalog} from '../lib/yemeniFiguresCatalog.js';
import {formatNumber, formatYear, formatArabicDate} from '../lib/format.js';
import {mapProfessional} from '../lib/professionals.js';
import {mergePublicFigures} from '../lib/yemeniFigures.js';

test('latest indicator uses measurement year, skips missing values and preserves zero', () => {
  const indicator = normalizeIndicator({updated_at:'2026-10-16'}, [
    {year:2006,value:30,source_id:'a'}, {year:'2024',value:'0',source_id:'a'},
    {year:2025,value:null,source_id:'a'}, {year:2026,value:'',source_id:'a'},
    {year:2023,value:10,source_id:'a'}, {year:2027,value:400,source_id:'a',is_published:false},
    {year:2028,value:500,source_id:'a',national_scope:false}, {year:null,value:9,source_id:'a'},
  ]);
  assert.equal(indicator.latestValue.year, '2024');
  assert.equal(Number(indicator.latestValue.value), 0);
  assert.equal(indicator.firstValue.year, 2006);
  assert.equal(indicator.values.length, 3);
});
test('conflicting sources need an adopted series and empty indicators have no latest value', () => {
  const values=[{year:2024,value:1,source_id:'a'},{year:2025,value:2,source_id:'b'}];
  assert.equal(normalizeIndicator({},values).latestValue,null);
  assert.equal(normalizeIndicator({adopted_source_id:'a'},values).latestValue.value,1);
  assert.equal(normalizeIndicator({},[{year:2025,value:null}]).latestValue,null);
});
test('pagination gets every row despite a lower server row cap', async () => {
  const expected=Array.from({length:1203},(_,id)=>({id}));
  const rows=await fetchAllRows(()=>({range:async(start,end)=>({data:expected.slice(start,Math.min(start+200,end+1)),error:null})}));
  assert.deepEqual(rows,expected);
});
test('pagination surfaces connection failure instead of returning a partial series', async () => {
  await assert.rejects(fetchAllRows(()=>({range:async()=>({data:null,error:{message:'offline'}})})),/offline/);
});
test('Arabic search ignores diacritics, hamza variants, and numeral differences', () => {
  assert.equal(normalizeSearch('إِنْتَاج ٩٦٧'),normalizeSearch('انتاج 967'));
  assert.ok(matchesSearch('امراه يمنيه',['امرأة يَمَنيّة']));
  assert.ok(matchesSearch('اليمن انتاج',['إنتاج المعرفة في اليمن']));
});
test('search excludes drafts and private fields while labeling visible examples', () => {
  const items=buildSearchIndex({works:[{slug:'draft',is_published:false,title:'Draft'}],issues:[{slug:'demo',is_demo:true}],professionals:[{id:'public',fullName:'مهني',email:'private@example.org',phone:'123',services:[],skills:[],bio:'خبرة'}]});
  assert.equal(items.length,2);
  assert.equal(items.find(x=>x.type==='issues').isDemo,true);
  assert.ok(!JSON.stringify(items).includes('private@example.org'));
  assert.ok(!JSON.stringify(items).includes('123'));
});

test('every figure visible in Discover Yemen is searchable, including catalog examples',()=>{
  const items=buildSearchIndex({figures:yemeniFiguresCatalog});
  assert.equal(items.length,yemeniFiguresCatalog.length);
  for(const figure of yemeniFiguresCatalog){
    const match=items.find(x=>x.href==='/yemen-map/figures/'+encodeURIComponent(figure.slug));
    assert.ok(match&&matchesSearchResult(figure.fullName,match),figure.fullName);
    assert.equal(match.isDemo,Boolean(figure.isDemo));
  }
  assert.ok(items.some(x=>matchesSearchResult('أروى',x)));
});

test('all content categories and public detail text are searchable without contact leakage',()=>{
  const items=buildSearchIndex({
    works:[{slug:'work',title:'عمل',summary:'ملخص',category:'ثقافة'}],
    issues:[{slug:'issue',title:'عدد',contents:['موضوع الفهرس']}],
    indicators:[{slug:'indicator',name:'مؤشر',short_description:'مختصر',definition:'التعريف التفصيلي',measurement_method:'منهجية القياس'}],
    figures:[{slug:'figure',fullName:'اسم',shortBio:'سيرة',knownFor:'إنجاز معروف'}],
    companies:[{id:'company',name:'شركة',summary:'مختصر',story:'قصة المنشأة',productDetails:[{name:'منتج',description:'وصف المنتج التفصيلي'}],email:'private@example.com'}],
    professionals:[{id:'person',fullName:'مهني',serviceAreas:['سيئون'],languages:['الألمانية'],phone:'SECRET-PHONE'}],
    sections:[{name:'قسم',domains:[{slug:'domain',name:'مجال المرصد',description:'وصف المجال'},{slug:'draft',is_published:false,name:'مجال خاص'}]}],
    places:[{id:'YE1704',kind:'district',governorateId:'YE17',nameAr:'عبس',history:'تاريخ المنطقة'}],
    pages:[{title:'عن المبادرة',href:'/#about',keywords:'رؤية ورسالة'}],
  });
  assert.equal(new Set(items.map(x=>x.type)).size,9);
  for(const term of ['ثقافة','موضوع الفهرس','التعريف التفصيلي','منهجية القياس','إنجاز معروف','قصة المنشأة','وصف المنتج التفصيلي','سيئون','الألمانية','وصف المجال','تاريخ المنطقة','رؤية ورسالة'])assert.ok(items.some(x=>matchesSearchResult(term,x)),term);
  assert.ok(items.find(x=>x.type==='places').href.includes('district=YE1704'));
  for(const term of ['private@example.com','SECRET-PHONE','مجال خاص'])assert.ok(!items.some(x=>matchesSearchResult(term,x)),term);
});
test('reserved example email triggers review without mutating the source record', () => {
  const row={email:'name@example.com',is_verified:true,full_name:'Test'};
  const person=mapProfessional(row);
  assert.equal(person.isVerified,false);
  assert.equal(person.needsReview,true);
  assert.equal(person.email,null);
  assert.equal(row.is_verified,true);
  assert.equal(mapProfessional({...row,email:'name@real-domain.ye'}).isVerified,true);
});
test('years have no grouping, zero is present and missing numbers/dates stay missing', () => {
  assert.equal(formatYear(2006),'2006');
  assert.equal(formatYear('٢٠٢٤'),'2024');
  assert.equal(formatYear(null),'');
  assert.equal(formatNumber(0),'0');
  assert.equal(formatNumber(null),'');
  assert.equal(formatArabicDate(null),'');
});

test('catalog preserves existing profiles while CMS drafts and overrides remain authoritative',()=>{
 const catalog=[{slug:'draft',fullName:'hidden'},{slug:'published',fullName:'old'},{slug:'catalog-only',fullName:'retained'}];
 const merged=mergePublicFigures([{slug:'published',fullName:'new'}],catalog,[{slug:'draft',is_published:false},{slug:'published',is_published:true}]);
 assert.deepEqual(merged.map(x=>x.fullName),['new','retained']);
});
