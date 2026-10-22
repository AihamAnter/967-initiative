import test from 'node:test';
import assert from 'node:assert/strict';
import {canEditInlineTarget,createInlineTarget,inlineAdminHref,resolveInlineTarget} from '../lib/inlineEditorTargets.js';
import {contentPatch} from '../lib/inlineContentClient.js';

test('inline targets build exact existing editors without accepting foreign URLs or tab injection',()=>{
 const id='c0000000-0000-4000-8000-000000000001';
 for(const [kind,tab] of [['issue','issues'],['work','works'],['company','companies'],['professional','professionals'],['figure','figures'],['statistic','statistics'],['ranking','rankings']]){
  const target=createInlineTarget({kind,id,href:'/works/example',title:'Example'});
  assert.equal(target.adminHref,`/admin?tab=${tab}&item=${id}`);
 }
 assert.equal(createInlineTarget({kind:'unknown',id}),null);
 assert.equal(createInlineTarget({kind:'company',id:'bad&tab=admins',href:'//example.com'}).adminHref,'/admin?tab=companies');
 assert.equal(createInlineTarget({kind:'company',id,href:'//example.com'}).href,'/');
 assert.equal(createInlineTarget({kind:'company',id,href:'/\\example.com'}).href,'/');
});
test('map deep links select correct existing profile editor without exposing geometry writes',()=>{
 assert.equal(inlineAdminHref({kind:'district',id:'YE1101'}),'/admin?tab=map&item=YE1101&region=district');
 assert.equal(inlineAdminHref({kind:'governorate',id:'YE11'}),'/admin?tab=map&item=YE11&region=governorate');
});
test('demo targets and route-only fallbacks cannot activate incomplete editors',()=>{
 const id='c0000000-0000-4000-8000-000000000001';
 assert.equal(canEditInlineTarget(createInlineTarget({kind:'company',id,isDemo:true})),false);
 assert.equal(canEditInlineTarget(createInlineTarget({kind:'company',id})),true);
 assert.equal(canEditInlineTarget(resolveInlineTarget('/works/public-work')),false);
 assert.equal(canEditInlineTarget(resolveInlineTarget('/yemen-map/figures/public-figure')),false);
 assert.equal(canEditInlineTarget(resolveInlineTarget('/privacy')),true);
 assert.equal(canEditInlineTarget({kind:'page',slug:'../admin'}),false);
 assert.equal(canEditInlineTarget(null),false);
});
test('public routes resolve content and legal page links but never arbitrary admin pages',()=>{
 assert.equal(resolveInlineTarget('/magazine/issue-1').kind,'issue');
 assert.equal(resolveInlineTarget('/yemen-map/figures/figure-name').kind,'figure');
 assert.equal(resolveInlineTarget('/yemen-in-numbers/indicator/population').advanced,true);
 assert.equal(resolveInlineTarget('/privacy').adminHref,'/admin?tab=pages&item=privacy');
 assert.equal(resolveInlineTarget('/admin/users'),null);
 assert.equal(resolveInlineTarget('/works/%invalid'),null);
});
test('partial content updates retain omitted fields and preserve nested product metadata',()=>{
 const original={name:'Company',sources:['original'],products:[{name:'Product',description:'Old',custom:{source:'retained'},retail_price:12}]};
 const patch=contentPatch(original,{name:'Company revised'});
 assert.deepEqual(patch,{name:'Company revised'});
 assert.deepEqual({...original,...patch}.products,original.products);
 const products=original.products.map((product,index)=>index===0?{...product,description:'New'}:product);
 const updated={...original,...contentPatch(original,{products})};
 assert.deepEqual(updated.products[0].custom,{source:'retained'});
 assert.equal(updated.products[0].retail_price,12);
 assert.deepEqual(contentPatch(original,{name:original.name,products:original.products}),{});
});
