// Safe local integration checks: public reads and requests rejected before any
// authenticated mutation. Never supply a real token or use this against prod.
import {mkdir,writeFile} from 'node:fs/promises';
import {defaultRankingIndicators} from '../lib/rankingCatalog.js';
import {getDefaultRankingYear,validateRankingDataset} from '../lib/rankings.js';

const base=new URL(process.env.RANKING_AUDIT_BASE||'http://127.0.0.1:3000');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||base.protocol!=='http:')throw new Error('Integration checks require a local HTTP server');
const results=[];
async function check(name,path,{status=200,method='GET',headers={},body,verify}={}){
  try{
    const started=performance.now();
    const response=await fetch(new URL(path,base),{method,headers,body,signal:AbortSignal.timeout(20000),redirect:'manual'});
    const raw=await response.text();
    let payload;try{payload=JSON.parse(raw);}catch{payload=null;}
    if(response.status!==status)throw Error(`Expected HTTP ${status}; got ${response.status}`);
    if(verify)verify(payload,response);
    const result={name,method,path,status:response.status,passed:true,durationMs:Math.round(performance.now()-started),bytes:Buffer.byteLength(raw),cacheControl:response.headers.get('cache-control'),robots:response.headers.get('x-robots-tag')};
    if(payload?.dataset){result.indicatorCode=payload.dataset.indicatorCode;result.values=payload.dataset.values.length;result.latestYemenYear=getDefaultRankingYear(payload.dataset);}
    results.push(result);console.log(`PASS ${name} (${response.status})`);
  }catch(error){results.push({name,method,path,passed:false,error:error.message});console.log(`FAIL ${name}: ${error.message}`);}
}

for(const indicator of defaultRankingIndicators.filter(item=>item.is_published)){
  await check(`published ${indicator.slug}`,`/api/rankings?indicator=${encodeURIComponent(indicator.slug)}`,{verify(payload,response){
    if(payload?.indicator?.slug!==indicator.slug||payload?.indicator?.code!==indicator.code||payload?.indicator?.is_published!==true)throw Error('Published indicator metadata mismatch');
    validateRankingDataset(payload.dataset,indicator.code);
    if(getDefaultRankingYear(payload.dataset)===null)throw Error('Published shipped indicator has no Yemen observations');
    if(response.headers.get('cache-control')!=='no-store')throw Error('API response must not be cached');
    if(!response.headers.get('x-robots-tag')?.includes('noindex'))throw Error('API indexing must be disabled');
  }});
}
for(const slug of ['literacy','unlisted-indicator','../population','https://evil.invalid',''])await check(`hidden or invalid ${slug||'(empty)'}`,`/api/rankings?indicator=${encodeURIComponent(slug)}`,{status:404});
await check('public API rejects POST','/api/rankings?indicator=population',{method:'POST',status:405});
for(const [path,methods]of [['/api/admin/rankings',['GET','POST']],['/api/admin/rankings/refresh',['POST']]]){
  for(const method of methods){
    await check(`no bearer ${method} ${path}`,path,{method,status:401,headers:method==='POST'?{'content-type':'application/json'}:{},body:method==='POST'?JSON.stringify({id:'00000000-0000-4000-8000-000000000001'}):undefined,verify(payload){if(typeof payload?.error!=='string')throw Error('Expected JSON authorization error');}});
    await check(`cross-origin ${method} ${path}`,path,{method,status:403,headers:{origin:'https://attacker.invalid',authorization:'Bearer invalid-for-local-audit',...(method==='POST'?{'content-type':'application/json'}:{})},body:method==='POST'?'{}':undefined});
  }
}
await check('malformed bearer rejected','/api/admin/rankings',{status:401,headers:{authorization:'not-a-bearer'}});
await check('malformed origin rejected','/api/admin/rankings/refresh',{method:'POST',status:403,headers:{origin:'not-a-url','content-type':'application/json'},body:'{}'});
await check('cross-site browser rejected','/api/admin/rankings',{status:403,headers:{'sec-fetch-site':'cross-site'}});
await check('admin DELETE unavailable','/api/admin/rankings',{method:'DELETE',status:405});
await check('refresh GET unavailable','/api/admin/rankings/refresh',{status:405});

const report={checkedAt:new Date().toISOString(),base:base.origin,scope:'Local integrated production build. Public reads and rejected unauthenticated/cross-origin requests only; no authenticated writes or live DB mutation.',total:results.length,passed:results.filter(item=>item.passed).length,failed:results.filter(item=>!item.passed).length,results};
await mkdir('docs/audit/evidence',{recursive:true});
await writeFile('docs/audit/evidence/rankings-http.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
if(report.failed)process.exitCode=1;
