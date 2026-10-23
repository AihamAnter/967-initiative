// Read-only local visual/network evidence. Never sends a form or contacts production.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3120';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local evidence only');
const label=process.env.AUDIT_LABEL||'before',out='docs/audit/prelaunch-fixes-2026-10/evidence';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({reducedMotion:'reduce'});
await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
const page=await context.newPage(),report={label,base,build:label==='before'?'6158419 production build in isolated source snapshot':'current production build',measurements:[],runtimeErrors:[]};
page.on('pageerror',e=>report.runtimeErrors.push(e.name));
try{
 for(const [name,url] of [['home','/'],['debates','/debates'],['recording','/debates/local-prerecorded'],['magazine','/magazine'],['contribute','/contribute'],['search','/search?q='+encodeURIComponent('محلي')],['account','/login'],['map','/yemen-map']]){
  let bytes=0,requests=0;const responseListener=async r=>{const len=Number(r.headers()['content-length']);if(Number.isFinite(len))bytes+=len;requests++;};page.on('response',responseListener);
  const start=Date.now();const response=await page.goto(base+url,{waitUntil:'networkidle',timeout:90000});
  report.measurements.push({name,status:response.status(),navigationMs:Date.now()-start,requests,declaredBytes:bytes,...await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfbMs:n.responseStart-n.requestStart,domContentLoadedMs:n.domContentLoadedEventEnd-n.startTime,resourceBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0)};})});
  page.off('response',responseListener);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await page.screenshot({path:`${out}/${label}-${name}-${width}.png`});}
 }
 await writeFile(`${out}/${label}-network.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
