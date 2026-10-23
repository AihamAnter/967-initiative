import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPublicSources} from '../lib/publicSourceCollection.js';
import {operationalEvent,operationalRoute,recordOperationalEvent} from '../lib/operationalEvents.js';
import {createTelemetryHandler} from '../lib/clientTelemetry.js';
import {buildSearchIndex} from '../lib/search.js';
import {searchProjections} from '../lib/searchProjections.js';
import {mapYemeniCompany} from '../lib/yemeniProducts.js';
import {mapYemeniFigure} from '../lib/yemeniFigures.js';
import {mapProfessional} from '../lib/professionals.js';

test('K-01/K-02 rejected and slow sources retain other data and report incomplete coverage',async()=>{
 const failures=[],calls=[];
 const result=await collectPublicSources({works:()=>{calls.push('works');return [{slug:'public'}];},issues:()=>{throw Error('private failure text');},debates:()=>new Promise(()=>{})},{timeoutMs:20,onUnavailable:name=>failures.push(name)});
 assert.deepEqual(result.data,{works:[{slug:'public'}]});assert.deepEqual(result.unavailable.sort(),['debates','issues']);assert.deepEqual(failures.sort(),['debates','issues']);assert.deepEqual(calls,['works']);
});
test('K-01/L-08 source collection preserves zero-argument request-cache keys',async()=>{
 let argumentsReceived=-1;
 const result=await collectPublicSources({settings:function(){argumentsReceived=arguments.length;return {title:'published'};}});
 assert.equal(argumentsReceived,0);assert.equal(result.data.settings.title,'published');
});
test('K-01 search projections preserve published indexed text while excluding unrelated payload',()=>{
 const rows={works:{id:'w',slug:'w',title:'عنوان',summary:'وصف',category:'حوار',platform:'فيديو',published_at:'2026',is_published:true,debate_id:null,thumbnail_url:'large-image',external_url:'private-unused'},issues:{id:'i',slug:'i',title:'مجلة',summary:'نص',number:1,issue_date:'2026-01-01',is_published:true,pdf_url:'large-pdf'},figures:{id:'f',slug:'f',full_name:'شخصية',known_for:'معروف',field:'أدب',governorate_name:'تعز',era:'معاصر',birth_year:1900,short_bio:'نبذة',timeline:[{year:2000,title:'عمل'}],is_published:true,image_url:'large-image'},companies:{id:'c',slug:'c',name:'شركة',legal_name:'شركة يمنية',category:'تقنية',location:'عدن',entity_type:'شركة',summary:'تعريف',story:'قصة',impact:'أثر',strengths:['مهارة'],markets:['سوق'],products:[{name:'منتج',description:'وصف',format:'عبوة'}],is_published:true,email:'not-indexed@example.test'},professionals:{id:'p',slug:'p',full_name:'مهني',profession_title:'مطور',category:'تقنية',location:'صنعاء',service_areas:['تعز'],service_mode:'حضوري',availability:'متاح',bio:'سيرة',services:['برمجة'],skills:['دقة'],languages:['العربية'],is_published:true,phone:'+967000000'}};
 const project=(row,fields)=>Object.fromEntries(fields.split(',').map(k=>[k,row[k]]));
 const map=(name,row)=>name==='companies'?mapYemeniCompany(row):name==='figures'?mapYemeniFigure(row):name==='professionals'?mapProfessional(row):row;
 for(const [name,row]of Object.entries(rows))assert.deepEqual(buildSearchIndex({[name]:[map(name,project(row,searchProjections[name]))]}),buildSearchIndex({[name]:[map(name,row)]}),name);
 assert.ok(JSON.stringify(Object.fromEntries(Object.entries(rows).map(([name,row])=>[name,project(row,searchProjections[name])]))).length<JSON.stringify(rows).length);
});
test('S-07 structured diagnostics discard identities, queries, errors, secrets and raw messages',()=>{
 const sensitive='password=SECRET user@example.test anonymous body vote option session token';
 const fields={source:'database',route:'/debates/private-person?q='+sensitive,status:503,durationMs:3100,error:new Error(sensitive),message:sensitive,token:sensitive,user_id:sensitive};
 const result=operationalEvent('database_failure',fields);assert.equal(result.route,'/debates/[record]');assert.equal(result.status,503);assert.equal(JSON.stringify(result).includes('SECRET'),false);assert.equal('error'in result,false);
 assert.equal(operationalRoute('/api/admin/debates?token=SECRET'),'/api/admin/debates');assert.equal(operationalRoute('https://private.test/SECRET'),'unknown');assert.equal(operationalEvent('untrusted-event',fields),null);
 const logs=[];recordOperationalEvent('api_failure',fields,s=>logs.push(JSON.parse(s)));assert.equal(logs.length,1);
});
test('S-07 browser telemetry validates origin and size, bounds log volume and discards payload',async()=>{
 let now=0;const logs=[],handler=createTelemetryHandler({now:()=>now,log:(event,fields)=>logs.push(operationalEvent(event,fields))});
 const request=(body,headers={})=>new Request('http://localhost/api/telemetry',{method:'POST',headers:{'content-type':'application/json',origin:'http://localhost',...headers},body:JSON.stringify(body)});
 assert.equal((await handler(request({event:'client_error',route:'/login',message:'SECRET',kind:'error'}))).status,204);
 assert.equal(JSON.stringify(logs).includes('SECRET'),false);
 assert.equal((await handler(request({event:'client_error',route:'/'},{origin:'https://evil.test'}))).status,403);
 assert.equal((await handler(request({event:'arbitrary',route:'/'}))).status,400);
 assert.equal((await handler(request({event:'client_error',route:'/',large:'x'.repeat(900)}))).status,413);
 for(let i=0;i<80;i++)await handler(request({event:'api_failure',route:'/api/debates',status:503}));
 assert.equal(logs.length,60);now=60001;await handler(request({event:'client_error',route:'/'}));assert.equal(logs.length,61);
});
