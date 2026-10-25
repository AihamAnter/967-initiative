import test from 'node:test';
const ACTOR='a0000000-0000-4000-8000-000000000001';
import assert from 'node:assert/strict';
import {CONTENT_PAGES_KEY,createDefaultContentPages,validateContentPage,validateContentCatalog,resolveContentCatalog,mutateContentCatalog,contentPagePath,contentPagesForSearch,safeContentHref} from '../lib/contentPages.js';
import {readContentCatalog,writeContentPage} from '../lib/contentPageRepository.js';
import {authorizeEditorRequest} from '../lib/adminAuthorization.js';
import {buildSitemap} from '../lib/seo.js';
import {buildSearchIndex,matchesSearchResult} from '../lib/search.js';
import {defaultSiteSettings,SITE_CONTENT_KEY} from '../lib/siteSettings.js';

function memoryDb(initial=[],{readError=null,writeError=null,beforeWrite=null}={}){
 const store={rows:structuredClone(initial),writes:0};
 const db={from(table){assert.equal(table,'site_settings');let method='read',payload,filters={};const chain={select(){return chain;},in(){return Promise.resolve({data:structuredClone(store.rows),error:readError});},update(value){method='update';payload=value;return chain;},insert(value){method='insert';payload=value;return chain;},eq(key,value){filters[key]=value;return chain;},async maybeSingle(){assert.notEqual(method,'read');if(beforeWrite)await beforeWrite(store);if(writeError)return {data:null,error:writeError};if(method==='insert'&&store.rows.some(row=>row.key===payload.key))return {data:null,error:{code:'23505'}};const index=store.rows.findIndex(row=>row.key===filters.key&&row.updated_at===filters.updated_at);if(method==='update'&&index===-1)return {data:null,error:null};if(method==='insert')store.rows.push(structuredClone(payload));else store.rows[index]=structuredClone(payload);store.writes++;return {data:{updated_at:payload.updated_at},error:null};}};return chain;}};
 db.rpc=async(name,args)=>{assert.equal(name,'editorial_service_save');assert.equal(args.p_kind,'page');assert.equal(args.p_actor,ACTOR);assert.equal(args.p_id,CONTENT_PAGES_KEY);let query=db.from('site_settings');query=args.p_action==='create'?query.insert(args.p_data):query.update(args.p_data).eq('key',args.p_id).eq('updated_at',args.p_revision);const result=await query.select().maybeSingle();return {data:result.data?{record:result.data,revision:result.data.updated_at}:null,error:result.error||(!result.data?{code:'40001'}:null)};};
 return {db,store};
}

test('default pages preserve policies, seed editable FAQ and explicitly marked example staff',()=>{
 const pages=resolveContentCatalog([{key:SITE_CONTENT_KEY,value:{...defaultSiteSettings,aboutDescription:'نبذة معتمدة محفوظة'}}]);
 assert.equal(pages.length,5);assert.equal(pages.find(page=>page.slug==='about').summary,'نبذة معتمدة محفوظة');
 assert.equal(pages.find(page=>page.slug==='privacy').sections.length,7);
 assert.ok(pages.find(page=>page.slug==='help').faqs.length>=6);
 assert.ok(pages.find(page=>page.slug==='about').team.every(member=>member.isExample));
 assert.deepEqual(resolveContentCatalog([{key:CONTENT_PAGES_KEY,value:{version:1,pages:[]}}]),[]);
 assert.throws(()=>resolveContentCatalog([{key:CONTENT_PAGES_KEY,value:{version:2,pages:[]}}]),error=>error.status===503);
});

test('catalog validation rejects duplicate routes, traversal, invalid nested rows and oversized content',()=>{
 const page=createDefaultContentPages()[0];
 for(const slug of ['../admin','/about','About','a?x=1','a#x','__proto__'])assert.throws(()=>validateContentPage({...page,slug}));
 assert.throws(()=>validateContentCatalog([page,{...page,id:'another-id'}]),error=>error.status===409);
 assert.throws(()=>validateContentPage({...page,team:[...page.team,page.team[0]]}));
 assert.throws(()=>validateContentPage({...page,kind:'faq'}));
 assert.throws(()=>validateContentPage({...page,sections:[{id:'x',title:'عنوان',text:'ا'.repeat(6001)}]}));
 assert.throws(()=>validateContentPage({...page,team:[{...page.team[0],isExample:'false'}]}));
 const clean=validateContentPage({...page,secret:'must-not-store',team:[{...page.team[0],email:'private@example.invalid'}]});
 assert.ok(!Object.hasOwn(clean,'secret'));assert.ok(!Object.hasOwn(clean.team[0],'email'));
});

test('create/update/delete preserve other pages, enforce deletion role, and keep built-in URLs stable',()=>{
 const initial=createDefaultContentPages();const about=initial.find(page=>page.slug==='about');
 const edited=mutateContentCatalog(initial,'update',{...about,team:[{id:'real-member',name:'اسم جديد',actorId:ACTOR,role:'مهمة جديدة',bio:'نبذة',isExample:false}]},'admin','2026-10-19T00:00:00.000Z');
 assert.equal(edited.find(page=>page.id===about.id).team[0].name,'اسم جديد');assert.deepEqual(edited.find(page=>page.slug==='privacy'),initial.find(page=>page.slug==='privacy'));
 assert.throws(()=>mutateContentCatalog(initial,'delete',{id:about.id},'admin'),error=>error.status===403);
 assert.throws(()=>mutateContentCatalog(initial,'update',{...about,slug:'renamed'},'management'));
 const deleted=mutateContentCatalog(edited,'delete',{id:about.id},'management');assert.ok(!deleted.some(page=>page.slug==='about'));
 const custom={...about,id:'custom-page',slug:'our-story',kind:'article',team:[]};
 const added=mutateContentCatalog(deleted,'create',custom,'admin');assert.equal(contentPagePath(added.find(page=>page.id==='custom-page')),'/pages/our-story');
 assert.throws(()=>mutateContentCatalog(initial,'create',custom,'reader'),error=>error.status===403);
});

test('repository persists new catalog and later updates without touching other site settings',async()=>{
 const {db,store}=memoryDb([{key:SITE_CONTENT_KEY,value:{heroTitle:'محفوظ'},updated_at:'2026-10-01T00:00:00.000Z'}]);
 const current=await readContentCatalog(db);assert.equal(current.revision,null);
 const first={...current.pages[0],title:'عنوان محفوظ عبر الإدارة'};
 const result=await writeContentPage(db,{action:'update',input:first,revision:null,actorId:ACTOR,role:'admin'},()=>Date.parse('2026-10-18T12:00:00.000Z'));
 assert.equal(store.writes,1);assert.equal(store.rows.find(row=>row.key===SITE_CONTENT_KEY).value.heroTitle,'محفوظ');
 assert.equal((await readContentCatalog(db)).pages.find(page=>page.id===first.id).title,first.title);
 await assert.rejects(writeContentPage(db,{action:'delete',input:{id:first.id},revision:null,actorId:ACTOR,role:'management'}),error=>error.status===409);
 assert.equal(store.writes,1);
 const next=await writeContentPage(db,{action:'delete',input:{id:first.id},revision:result.revision,actorId:ACTOR,role:'management'},()=>Date.parse(result.revision));
 assert.notEqual(next.revision,result.revision);assert.ok(!next.pages.some(page=>page.id===first.id));
});

test('concurrent writers and service errors never overwrite a newer catalog or restore defaults',async()=>{
 const stamp='2026-10-18T00:00:00.000Z';const pages=createDefaultContentPages();
 const {db,store}=memoryDb([{key:CONTENT_PAGES_KEY,value:{version:1,pages},updated_at:stamp}],{beforeWrite(store){store.rows[0].updated_at='2026-10-19T00:00:00.000Z';}});
 await assert.rejects(writeContentPage(db,{action:'update',input:{...pages[0],title:'stale'},revision:stamp,actorId:ACTOR,role:'admin'}),error=>error.status===409);assert.equal(store.writes,0);assert.equal(store.rows[0].value.pages[0].title,pages[0].title);
 const broken=memoryDb([],{readError:{code:'42501'}});await assert.rejects(readContentCatalog(broken.db),error=>error.status===503);assert.equal(broken.store.writes,0);
 const corrupt=memoryDb([{key:CONTENT_PAGES_KEY,value:{invalid:true},updated_at:stamp}]);await assert.rejects(readContentCatalog(corrupt.db),error=>error.status===503);
});

test('deleted managed pages leave sitemap and search; changed FAQ and staff text are discoverable',()=>{
 const pages=createDefaultContentPages();const about=pages.find(page=>page.slug==='about');about.team[0].role='مسؤول الأرشيف الفريد';
 const index=buildSearchIndex({pages:contentPagesForSearch(pages)});assert.ok(index.some(item=>matchesSearchResult('الأرشيف الفريد',item)));
 const remaining=mutateContentCatalog(pages,'delete',{id:'privacy'},'management');
 const map=buildSitemap({contentPages:remaining},{NODE_ENV:'production'}).map(item=>new URL(item.url).pathname);
 assert.ok(map.includes('/help'));assert.ok(!map.includes('/privacy'));
 assert.ok(!contentPagesForSearch(remaining).some(page=>page.href==='/privacy'));
 const changedKind={...about,slug:'custom-text',kind:'article'};assert.ok(!contentPagesForSearch([changedKind])[0].keywords.includes('الأرشيف الفريد'));
});

test('audited page writes require the server-identified actor',async()=>{
 const {db,store}=memoryDb();const page=createDefaultContentPages()[0];
 await assert.rejects(writeContentPage(db,{action:'update',input:page,revision:null,role:'admin'}),error=>error.status===403);
 assert.equal(store.writes,0);
});

test('content links reject executable, credentialed and protocol-relative URLs',()=>{
 assert.equal(safeContentHref('/privacy-requests?type=طلب#contribution-form').split('?')[0],'/privacy-requests');
 assert.equal(safeContentHref('https://example.com/policy'),'https://example.com/policy');
 for(const href of ['javascript:alert(1)','data:text/html,abc','//evil.test/a','/\\evil.test','https://user:pass@evil.test','https://evil.test\n/x','relative-name'])assert.equal(safeContentHref(href),null,href);
});

test('page administration checks origin, session and server role before access',async()=>{
 const request=(headers={})=>new Request('https://site.test/api/admin/pages',{headers});
 const makeDb=role=>({auth:{getUser:async()=>({data:{user:{id:'known-user',email_confirmed_at:'2026-01-01'}},error:null})},from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:role?{role}:null,error:null})};}});
 await assert.rejects(authorizeEditorRequest(request(),makeDb('management')),error=>error.status===401);
 await assert.rejects(authorizeEditorRequest(request({authorization:'Bearer fake',origin:'https://evil.test'}),makeDb('management')),error=>error.status===403);
 for(const role of [null,'reader'])await assert.rejects(authorizeEditorRequest(request({authorization:'Bearer fake'}),makeDb(role)),error=>error.status===403);
 const auth=await authorizeEditorRequest(request({authorization:'Bearer fake'}),makeDb('admin'));assert.equal(auth.role,'admin');
 await assert.rejects(authorizeEditorRequest(request({authorization:'Bearer fake'}),{auth:{getUser:async()=>({data:{user:null},error:{status:401}})}}),error=>error.status===401);
});
