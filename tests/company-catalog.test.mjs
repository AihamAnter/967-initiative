import test from 'node:test';
import assert from 'node:assert/strict';
import {yemeniCompaniesCatalog} from '../lib/yemeniCompaniesCatalog.js';
import {companyCatalogPayload,companyIdentity,prepareCompanyImport,insertCompanyCatalog} from '../lib/companyCatalogImport.js';
import {companySources,normalizeCompanySources,validateCompanySources} from '../lib/companySources.js';
import {mapYemeniCompany,toCompanyDirectoryCard} from '../lib/yemeniProducts.js';
import {buildSearchIndex,rankSearchResults} from '../lib/search.js';
import {buildSitemap} from '../lib/seo.js';

test('real catalog has over 100 distinct sourced enterprises, with no invented commercial fields',()=>{
 assert.ok(yemeniCompaniesCatalog.length>100);
 const plan=prepareCompanyImport(yemeniCompaniesCatalog);
 assert.equal(plan.pending.length,yemeniCompaniesCatalog.length);
 assert.equal(new Set(plan.pending.map(row=>companyIdentity(row.name))).size,plan.pending.length);
 assert.ok(new Set(plan.pending.map(row=>row.category)).size>=8);
 assert.ok(new Set(plan.pending.map(row=>row.location)).size>=7);
 for(const row of plan.pending){
  assert.equal(row.is_published,true);assert.equal(row.owner_name,'');assert.equal(row.ceo_name,'');assert.equal(row.team_size,'');assert.equal(row.image_url,null);
  assert.ok(!/تجريبي|قيد التحقق/.test(row.summary));
  assert.ok(row.products.length>0);
  for(const product of row.products){assert.ok(product.sources.length>0);assert.ok(product.sources.every(source=>source.reviewedAt==='2026-10-19'));assert.equal(product.retail_price,undefined);assert.equal(product.image_url,undefined);}
 }
 assert.throws(()=>prepareCompanyImport([...yemeniCompaniesCatalog,yemeniCompaniesCatalog[0]]),/مكررة/);
});

test('public mapping retains real provenance without claiming editor verification or demo status',()=>{
 const row=companyCatalogPayload(yemeniCompaniesCatalog.find(row=>row.slug==='shaphaco'));
 const company=mapYemeniCompany({...row,id:'stored-company'});
 assert.equal(company.isDemo,false);assert.equal(company.isVerified,false);
 assert.equal(company.databaseId,'stored-company');assert.equal(company.sources[0].type,'official-company');
 assert.equal(company.sources[0].reviewedAt,'2026-10-19');
 assert.deepEqual(company.productDetails.map(product=>product.name),['Ivysol','Proof Gel','Guafeen']);
 assert.deepEqual(company.productDetails[0].sources,company.sources);
 assert.deepEqual(mapYemeniCompany({slug:'old',products:[]}).sources,[]);
});

test('source editing validates and preserves provenance while rejecting executable links and bad dates',()=>{
 const source={title:'الموقع الرسمي',url:'https://example.org/about',type:'official-company',reviewedAt:'2026-10-19',secret:'discard'};
 assert.deepEqual(validateCompanySources([source]),[{title:source.title,url:source.url,type:source.type,reviewedAt:source.reviewedAt}]);
 for(const url of ['javascript:alert(1)','data:text/html,evil','//evil.example','https://user:pass@example.org'])assert.throws(()=>validateCompanySources([{...source,url}]));
 assert.throws(()=>validateCompanySources([{...source,reviewedAt:'2026-02-30'}]));
 assert.throws(()=>validateCompanySources([{title:'',url:''}]));
 assert.deepEqual(normalizeCompanySources(null),[]);
 assert.equal(companySources([...Array(15).fill({sources:[source]}),{sources:[{...source,url:'https://second.example/'}]}]).length,2);
});

test('import preserves existing content and skips matching slugs or normalized Arabic names on rerun',()=>{
 const existing=[{id:'existing',slug:'yemen-nectar',name:'رحيق اليمن',is_published:true,products:[{name:'عسل'}]}];
 const before=structuredClone(existing);
 const plan=prepareCompanyImport(yemeniCompaniesCatalog,existing);
 assert.equal(plan.pending.length,yemeniCompaniesCatalog.length);
 assert.deepEqual(existing,before);
 const row=yemeniCompaniesCatalog[0];
 assert.equal(prepareCompanyImport([row],[{slug:'some-editor-slug',name:row.name.replace(/إ/g,'ا')}]).pending.length,0);
 assert.equal(prepareCompanyImport([row],[{slug:row.slug,name:'اسم محرر مختلف',is_published:false}]).pending.length,0,'a hidden existing record must never be re-published');
 assert.equal(prepareCompanyImport(yemeniCompaniesCatalog,yemeniCompaniesCatalog).pending.length,0);
});

test('database import uses insert-on-conflict-do-nothing and never an update or delete',async()=>{
 const calls=[];const pending=[companyCatalogPayload(yemeniCompaniesCatalog[0])];
 const db={from(table){assert.equal(table,'yemeni_companies');return {upsert(rows,options){calls.push({rows,options});return {async select(){return {data:rows.map(row=>({slug:row.slug})),error:null};}};}};}};
 assert.deepEqual(await insertCompanyCatalog(db,pending),[{slug:pending[0].slug}]);
 assert.deepEqual(calls[0].options,{onConflict:'slug',ignoreDuplicates:true});
 assert.equal(calls.length,1);assert.deepEqual(await insertCompanyCatalog(db,[]),[]);assert.equal(calls.length,1);
 const broken={from(){return {upsert(){return {async select(){return {data:null,error:{message:'write failed'}};}};}};}};
 await assert.rejects(insertCompanyCatalog(broken,pending),/write failed/);
});

test('real entries participate in multiword search and sitemap as published content',()=>{
 const companies=yemeniCompaniesCatalog.map(row=>mapYemeniCompany(companyCatalogPayload(row)));
 const index=buildSearchIndex({companies});
 assert.equal(index.length,companies.length);
 assert.ok(rankSearchResults('شفاكو صنعاء',index).some(result=>result.href==='/yemeni-products/shaphaco'));
 assert.ok(rankSearchResults('الكوسفن PET',index).some(result=>result.href==='/yemeni-products/elko-seven'));
 const sitemap=buildSitemap({companies},{NEXT_PUBLIC_SITE_URL:'https://967.example',NODE_ENV:'production',VERCEL_ENV:'production'});
 for(const company of companies)assert.ok(sitemap.some(item=>item.url.endsWith('/yemeni-products/'+company.id)));
});

test('directory cards retain searchable products without transferring full profiles and repeated sources',()=>{
 const profiles=yemeniCompaniesCatalog.map(row=>mapYemeniCompany(companyCatalogPayload(row)));
 const cards=profiles.map(toCompanyDirectoryCard);
 assert.ok(JSON.stringify(cards).length<JSON.stringify(profiles).length/2);
 assert.equal(cards.length,profiles.length);
 for(let i=0;i<cards.length;i++){assert.deepEqual(cards[i].products,profiles[i].products);assert.equal(cards[i].id,profiles[i].id);assert.equal(cards[i].sources,undefined);assert.equal(cards[i].productDetails,undefined);}
});
