// Safe local negative requests only. No valid message, token or CMS mutation.
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('API negative tests are local-only');
const checks=[];
const cases=[
 ['malformed JSON','/api/contact','POST','{',{},400],
 ['array JSON','/api/contact','POST','[]',{},400],
 ['null JSON','/api/contact','POST','null',{},400],
 ['foreign origin','/api/contact','POST','{}',{origin:'https://foreign.invalid'},403],
 ['malformed origin','/api/contact','POST','{}',{origin:'not-an-origin'},403],
 ['cross-site request','/api/contact','POST','{}',{'sec-fetch-site':'cross-site'},403],
 ['unsupported media','/api/contact','POST','{}',{'content-type':'text/plain'},415],
 ['oversized body','/api/contact','POST',JSON.stringify({x:'a'.repeat(13000)}),{},413],
 ['invalid fields','/api/contact','POST',JSON.stringify({name:'x',email:'invalid',type:'invalid',message:'x'}),{},400],
 ...['GET','POST','PATCH','DELETE'].map(method=>['unauthenticated admin '+method,'/api/admin/editors',method,method==='GET'?undefined:'{}',{},401]),
 ['admin foreign origin','/api/admin/editors','POST','{}',{origin:'https://foreign.invalid'},403],
];
for(let i=0;i<cases.length;i++){
 const [name,route,method,body,extra,expected]=cases[i];
 const response=await fetch(base+route,{method,headers:{'content-type':'application/json','x-real-ip':`203.0.113.${i+1}`,...extra},body,signal:AbortSignal.timeout(15000)});
 const json=await response.json();checks.push({name,status:response.status,expected,pass:response.status===expected&&typeof json.error==='string',cacheControl:response.headers.get('cache-control')});
}
for(let i=0;i<9;i++){
 const response=await fetch(base+'/api/contact',{method:'POST',headers:{'content-type':'application/json','x-real-ip':'198.51.100.99'},body:'{}'});
 if(i===8)checks.push({name:'per-process rate limit',status:response.status,pass:response.status===429&&Number(response.headers.get('retry-after'))>0});
}
for(const route of ['/', '/admin', '/demo/967-demo.pdf']){
 const response=await fetch(base+route,{method:'HEAD'});
 for(const [header,value] of [['x-content-type-options','nosniff'],['x-frame-options','DENY'],['referrer-policy','strict-origin-when-cross-origin']])checks.push({name:route+' '+header,pass:response.headers.get(header)===value});
 checks.push({name:route+' CSP',pass:response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")===true});
}
const report={checkedAt:new Date().toISOString(),base,checks:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,results:checks};
await mkdir('docs/audit/evidence',{recursive:true});await writeFile('docs/audit/evidence/security-http-after.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
