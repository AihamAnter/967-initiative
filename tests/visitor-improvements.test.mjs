import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch,matchesSearchResult,parseSearchQuery,rankSearchResults} from '../lib/search.js';
import {listStateSearch,readListState,listReturnPath,collectionDefaults} from '../lib/listState.js';
import {whatsappUrl} from '../lib/contactLinks.js';
import {mapProfessional} from '../lib/professionals.js';
import {indicatorReading,sourceLabel} from '../lib/indicatorPresentation.js';

test('separated Arabic words match across fields and in either order',()=>{
  assert.ok(matchesSearch('صنعاء نجار',['نجّار أثاث','يخدم صنعاء']));
  assert.ok(matchesSearch('صنعاء،نجار',['نجار أثاث','صنعاء']));
  assert.ok(!matchesSearch('صنعاء طبيب',['نجار أثاث','صنعاء']));
  assert.ok(matchesSearch('صنعاء طبيب',['نجار أثاث','صنعاء'],{mode:'any'}));
});
test('exact phrases and exclusions never join unrelated fields',()=>{
  assert.ok(matchesSearch('"الطاقة الشمسية" -عدن',['خدمات الطاقة الشمسية في صنعاء']));
  assert.ok(!matchesSearch('"الطاقة الشمسية"',['الطاقة','الشمسية']));
  assert.ok(!matchesSearch('طاقة',['طاقة شمسية عدن'],{exclude:'عدن'}));
  assert.ok(!matchesSearch('الطاقة الشمسية',['الشمسية والطاقة'],{mode:'phrase'}));
  assert.deepEqual(parseSearchQuery('"الطاقة الشمسية" -"ملف تجريبي"'),{terms:['الطاقه الشمسيه'],excluded:['ملف تجريبي']});
});
test('an exact place name ranks above mentions and all filters use the same matching',()=>{
  const items=[{title:'علي',description:'من صنعاء',href:'/a'},{title:'صنعاء',description:'محافظة',href:'/b'},{title:'محافظة صنعاء',href:'/c'}];
  assert.equal(rankSearchResults('صنعاء',items)[0].href,'/b');
  assert.equal(rankSearchResults('صنعاء',items,{scope:'title'}).length,2);
  assert.ok(!matchesSearchResult('صنعاء',items[0],{scope:'title'}));
  assert.equal(items[0].href,'/a','ranking must not mutate the original index');
});
test('Arabic definite articles find the plain word while quoted terms stay exact',()=>{
  const items=[{title:'مشاركة النساء',meta:'السكان'}, {title:'عدد سكان اليمن',description:'تقدير سنوي'}];
  assert.equal(rankSearchResults('السكان',items)[0].title,'عدد سكان اليمن');
  assert.ok(matchesSearch('السكان','عدد سكان اليمن'));
  assert.ok(!matchesSearch('"السكان"','عدد سكان اليمن'));
  assert.ok(!matchesSearch('السكان','عدد سكان اليمن',{mode:'phrase'}));
});
test('list state round trips Arabic filters and retains unrelated URL parameters',()=>{
  const defaults={q:'',platform:'الكل',page:1};
  const state={q:'اليمن صنعاء',platform:'يوتيوب',page:2};
  const query=listStateSearch('?keep=1',state,defaults);
  assert.deepEqual(readListState(query,defaults),state);
  assert.equal(new URLSearchParams(query).get('keep'),'1');
  assert.equal(readListState('?page=Infinity',defaults).page,1);
  assert.equal(readListState('?page=-5',defaults).page,1);
  assert.equal(listStateSearch(query,defaults,defaults),'?keep=1');
});
test('detail return links retain filters but never accept an external or unrelated destination',()=>{
  const defaults=collectionDefaults.works;
  const url=listReturnPath('/works?q=اليمن&page=2&unexpected=secret','/works',defaults,'#works-results');
  assert.ok(url.includes('page=2'));
  assert.equal(new URL(url,'https://local.invalid').searchParams.get('q'),'اليمن');
  assert.ok(!url.includes('unexpected'));
  for(const value of ['https://evil.test/works','//evil.test/works','/admin','javascript:alert(1)'])assert.equal(listReturnPath(value,'/works',defaults),'/works');
});
test('WhatsApp uses the explicit valid number without exposing demo or example email',()=>{
  assert.equal(whatsappUrl('+٩٦٧ ٧٧٧ ٠٠٠ ٤٥٦'),'https://wa.me/967777000456');
  assert.equal(whatsappUrl('00967777000456'),'https://wa.me/967777000456');
  assert.equal(whatsappUrl('777000456'),'https://wa.me/967777000456');
  for(const number of [null,'123','javascript:alert(1)','https://evil.test'])assert.equal(whatsappUrl(number),null);
  const row={email:'test@example.com',whatsapp:'+967777000456',is_verified:true};
  const person=mapProfessional(row);
  assert.equal(person.whatsapp,row.whatsapp);
  assert.equal(person.email,null);
  assert.equal(person.needsReview,true);
  assert.equal(person.isVerified,false);
  assert.equal(mapProfessional({...row,is_demo:true}).whatsapp,null);
});
test('short indicator reading preserves zero, the year, and the absence of a trend',()=>{
  const indicator={unit:'نسمة',values:[{year:2026,value:0}],latestValue:{year:2026,value:0,value_status:'estimated'}};
  const text=indicatorReading(indicator);
  assert.ok(text.includes('0 نسمة في 2026'));
  assert.ok(text.includes('تقديرية'));
  assert.ok(text.includes('لا يمكن استنتاج اتجاه زمني'));
  assert.equal(sourceLabel({name:'عدد السكان',url:'https://www.example.org/yemen'},'عدد السكان'),'example.org');
  assert.equal(sourceLabel({name:'جهة معتمدة',url:'https://example.org'},'عدد السكان'),'جهة معتمدة');
});
