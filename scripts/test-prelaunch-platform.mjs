// Production-build QA against the isolated fixture; only fixture controls mutate.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3117',fixture='http://127.0.0.1:3417';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out='docs/audit/prelaunch-fixes-2026-10/evidence';await mkdir(out,{recursive:true});
const state=await fetch(fixture+'/fixture/state').then(r=>r.json());assert.equal(state.production,false);
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});
await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const page=await context.newPage();page.setDefaultTimeout(20000);
const report={base,environment:'local isolated fixture; Chromium only',routes:[],layouts:[],accessibility:[],zoom:[],checks:[],runtimeErrors:[],hydrationErrors:[]};
page.on('pageerror',e=>report.runtimeErrors.push({kind:e.name}));
page.on('console',m=>{if(m.type()==='error'&&/hydrat|did not match|server rendered/i.test(m.text()))report.hydrationErrors.push({error:'hydration mismatch'});});
const control=(name,body)=>fetch(fixture+'/fixture/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
try{
 const routes=['/','/debates','/debates/local-prerecorded','/works','/works/inline-work','/magazine','/magazine/inline-issue','/yemen-in-numbers','/yemen-ranking','/yemen-map','/yemen-map/figures/inline-figure','/yemeni-products','/yemeni-products/inline-company','/professionals','/professionals/inline-professional','/search?q=967','/contribute','/login','/register','/account','/admin'];
 for(const route of routes){
  const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200,route);await page.evaluate(()=>document.fonts.ready);report.routes.push({route,status:response.status()});
  for(const width of[320,360,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.layouts.push({route,width,overflow});assert.equal(overflow,false,route+' @'+width);if([320,390,768,1440].includes(width))await page.screenshot({path:out+'/platform-'+route.replace(/[^a-z0-9]+/gi,'-')+'-'+width+'.png'});}
  for(const width of[390,1440]){await page.setViewportSize({width,height:1000});const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const violations=scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));report.accessibility.push({route,width,violations});assert.deepEqual(violations,[],route+' axe');}
  await page.setViewportSize({width:390,height:1000});await page.addStyleTag({content:'html {font-size:200% !important}'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' 200% text');report.zoom.push({route,textPercent:200,overflow:false});
 }
 await page.goto(base+'/',{waitUntil:'networkidle'});await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('skip-link')),true);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id==='content'||location.hash==='#content'),true);report.checks.push('U-04 keyboard skip link reaches main content');
 // Same published data, source projection only: compare actual upstream bytes.
 const query='/search?q='+encodeURIComponent('محلي');
 const metricsFor=async address=>{await fetch(fixture+'/fixture/metrics?reset');const r=await fetch(address+query);assert.equal(r.status,200);await r.text();return (await fetch(fixture+'/fixture/metrics').then(r=>r.json())).tables;};
 report.searchPayload={before:await metricsFor('http://127.0.0.1:3121'),after:await metricsFor(base)};
 await control('fail-source',{table:'works',fail:true});
 try{
  const sitemap=await fetch(base+'/sitemap.xml'),xml=await sitemap.text();assert.equal(sitemap.status,200);assert.ok(xml.includes('/magazine/inline-issue'));assert.ok(!xml.includes('/works/inline-work'));assert.ok(!xml.includes('/admin'));assert.ok(!xml.includes('/debates/local-draft'));report.checks.push('K-02 failed works source retains other public sitemap links and excludes private routes');
  await page.goto(base+query,{waitUntil:'networkidle'});assert.match(await page.locator('body').innerText(),/النتائج الحالية جزئية/);assert.ok(await page.locator('.search-result').count());report.checks.push('K-01 failed source displays partial search results and a retry link');
 }finally{await control('fail-source',{table:'works',fail:false});}
 const missing=await fetch(base+'/debates/this-debate-does-not-exist');assert.equal(missing.status,404);report.checks.push('S-08 missing debate returns HTTP404');
 const llms=await fetch(base+'/llms.txt').then(r=>r.text());assert.ok(llms.includes('/debates'));report.checks.push('S-08 llms reading guide includes debates');
 await page.goto(base+'/contribute',{waitUntil:'networkidle'});
 const telemetry=page.waitForRequest(r=>r.url().endsWith('/api/telemetry')&&r.method()==='POST');await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'PRIVATE-FORM-CONTENT password token vote'})));const request=await telemetry;assert.equal(request.postData().includes('PRIVATE'),false);assert.equal((await request.response()).status(),204);report.checks.push('S-07 browser error reaches local structured telemetry without raw error or form data');
 assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.hydrationErrors,[]);
}finally{
 await writeFile(out+'/platform-browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({routes:report.routes.length,layouts:report.layouts.length,axe:report.accessibility.length,zoom:report.zoom.length,checks:report.checks,runtimeErrors:report.runtimeErrors,hydrationErrors:report.hydrationErrors}));
}
