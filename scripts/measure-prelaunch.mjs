// Comparable local Lighthouse mobile lab samples, never field INP.
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {default:lighthouse}=await import(pathToFileURL(require.resolve('lighthouse')).href);
const {chromium}=require('playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3121',label=process.env.AUDIT_LABEL||'before';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local measurement only');
const out='docs/audit/prelaunch-fixes-2026-10/evidence';await mkdir(out,{recursive:true});
const port=Number(process.env.AUDIT_DEBUG_PORT||9224);
const chrome=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe'),args:['--remote-debugging-port='+port]});
const results=[];
try{
 for(const route of (process.env.AUDIT_ROUTES||'/,/search?q=967,/debates,/debates/local-prerecorded,/yemen-map,/magazine,/magazine/inline-issue,/yemen-in-numbers,/yemen-ranking,/yemeni-products,/professionals,/admin').split(',')){
  const {lhr}=await lighthouse(base+route,{port,output:'json',logLevel:'error',onlyCategories:['performance'],blockedUrlPatterns:['https://*'],maxWaitForLoad:15000});
  const metric=id=>lhr.audits[id]?.numericValue;
  const item={route,performance:lhr.categories.performance.score*100,fcpMs:metric('first-contentful-paint'),lcpMs:metric('largest-contentful-paint'),cls:metric('cumulative-layout-shift'),tbtMs:metric('total-blocking-time'),ttfbMs:lhr.audits['server-response-time']?.numericValue,transferBytes:metric('total-byte-weight'),javascriptBytes:lhr.audits['resource-summary']?.details?.items?.find(x=>x.resourceType==='script')?.transferSize,warnings:lhr.runWarnings,runtimeError:lhr.runtimeError||null};results.push(item);console.log(JSON.stringify(item));
  await writeFile(`${out}/${label}-lighthouse.json`,JSON.stringify({label,base,environment:'isolated local PostgreSQL fixture, production Next build, Lighthouse default mobile simulation, one lab sample per route; no field INP',results},null,2));
 }
}finally{await chrome.close();}
