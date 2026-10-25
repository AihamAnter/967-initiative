import test from 'node:test';
import assert from 'node:assert/strict';
import {contributionFilters,contributionEditorHref} from '../lib/editorialContributions.js';
import {handleContributionsRequest} from '../lib/contributionsApi.js';
test('periods use Yemen calendar days, custom inclusive end and validated filter values',()=>{
 const today=contributionFilters(new URLSearchParams('period=today'),new Date('2026-10-25T22:30:00Z'));assert.equal(today.from.toISOString(),'2026-10-25T21:00:00.000Z');assert.equal(today.to.toISOString(),'2026-10-26T21:00:00.000Z');
 const custom=contributionFilters(new URLSearchParams('period=custom&from=2026-10-01&to=2026-10-25'));assert.equal(custom.to.toISOString(),'2026-10-25T21:00:00.000Z');
 for(const q of ['period=custom&from=2026-02-30','period=custom&from=2026-10-25&to=2026-10-01','member=madeup','action=hack','section=private','sort=sql','page=-1'])assert.throws(()=>contributionFilters(new URLSearchParams(q)),q);
 assert.equal(contributionEditorHref({content_type:'figure',content_id:'local-id'}),'/admin?tab=figures&item=local-id');
});
test('contributions API requires verified confirmed editor and fails explicitly when migration is absent',async()=>{
 const user={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email_confirmed_at:'2026-01-01'},request=auth=>new Request('http://local.test/api/admin/contributions',{headers:auth?{Authorization:'Bearer fixture'}:{}});
 let role='admin',calls=0;const db={auth:{getUser:async()=>({data:{user}})},from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{role},error:null})}),rpc:async()=>{calls++;return {error:{code:'PGRST202'}};}};
 assert.equal((await handleContributionsRequest(request(false),()=>db)).status,401);
 role=null;assert.equal((await handleContributionsRequest(request(true),()=>db)).status,403);assert.equal(calls,0);
 role='admin';user.email_confirmed_at=null;assert.equal((await handleContributionsRequest(request(true),()=>db)).status,403);assert.equal(calls,0);
 user.email_confirmed_at='2026-01-01';const missing=await handleContributionsRequest(request(true),()=>db);assert.equal(missing.status,503);assert.ok((await missing.json()).error.includes('غير مفعّل'));assert.equal(calls,1);
 db.rpc=async()=>({data:{summary:{operations:0},activity:[]},error:null});const success=await handleContributionsRequest(request(true),()=>db);assert.equal(success.status,200);assert.match(success.headers.get('Cache-Control'),/no-store/);
});
