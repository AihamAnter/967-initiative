// Read-only browser checks of actual public filters and result pagination.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {normalizeSearch} from '../lib/search.js';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const results=[];const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000';
const step=async(name,run)=>{try{results.push({name,pass:true,...await run()});}catch(error){results.push({name,pass:false,error:error.message});}};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const settled=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const total=async locator=>Number(normalizeSearch(await locator.innerText()).replace(/[^0-9]/g,''));
 for(const [route,areaSelector,selectSelector,totalSelector] of [
  ['/works','main','.filter-bar select','.results-line'],
  ['/professionals','.professionals-directory','select','.professionals-results strong'],
  ['/yemeni-products','.products-directory','select','.products-results-line strong'],
  ['/yemen-in-numbers','.stat-explorer','select','.stat-results-head strong'],
 ]){
  await page.goto(base+route,{waitUntil:'networkidle'});const area=page.locator(areaSelector);const count=()=>total(area.locator(totalSelector));const original=await count();
  const selects=area.locator(selectSelector);const originalValues=[];for(let i=0;i<await selects.count();i++)originalValues.push(await selects.nth(i).inputValue());
  for(let i=0;i<await selects.count();i++)await step(route+' filter '+(i+1),async()=>{
   const select=selects.nth(i),options=await select.locator('option').evaluateAll(items=>items.filter(x=>!x.disabled).map(x=>({value:x.value,label:x.textContent})));
   const option=options.find(x=>x.value!==originalValues[i]);if(!option)return {skipped:'Only one available option'};
   await select.selectOption(option.value);await settled();assert.equal(await select.inputValue(),option.value);const filtered=await count();assert.ok(filtered<=original);
   await area.locator('.filter-reset,.stat-clear').first().click();await settled();assert.equal(await count(),original);for(let j=0;j<originalValues.length;j++)assert.equal(await selects.nth(j).inputValue(),originalValues[j]);
   return {option:option.label,before:original,filtered,restored:await count()};
  });
 }
 await step('work topic buttons filter and reset',async()=>{
  await page.goto(base+'/works');const buttons=page.locator('.filter-tabs button');assert.ok(await buttons.count()>1);const button=buttons.nth(1),topic=(await button.innerText()).trim();await button.click();await settled();assert.equal(await button.getAttribute('aria-pressed'),'true');const cards=await page.locator('.work-card').allTextContents();assert.ok(cards.length&&cards.every(text=>text.includes(topic)));await page.locator('.filter-reset').click();assert.equal(await buttons.first().getAttribute('aria-pressed'),'true');return {topic,matched:cards.length};
 });
 await step('statistics next/previous and filter page reset',async()=>{
  await page.goto(base+'/yemen-in-numbers');const area=page.locator('.stat-explorer'),first=area.locator('.stat-indicator-card').first();const original=await first.getAttribute('href');await area.locator('.pagination button').last().click();await settled();assert.notEqual(await first.getAttribute('href'),original);await area.locator('.pagination button').first().click();await settled();assert.equal(await first.getAttribute('href'),original);
  await area.locator('.pagination button').last().click();const select=area.locator('select').first();await select.selectOption({index:1});await settled();const previous=area.locator('.pagination button').first();if(await previous.count())assert.equal(await previous.isDisabled(),true);return {firstPageRestored:true,filterStartsFirstPage:true};
 });
 await step('timeline units, selection limit and comparison mode',async()=>{
  await page.goto(base+'/yemen-in-numbers/timeline',{waitUntil:'networkidle'});const inputs=page.locator('.timeline-indicator-list input');const disabled=await page.locator('.timeline-indicator-list input:disabled').count();
  for(let n=0;n<3;n++){const compatible=page.locator('.timeline-indicator-list input:not(:checked):not(:disabled)');if(!await compatible.count())break;await compatible.first().check();await settled();}
  const selected=await page.locator('.timeline-indicator-list input:checked').count();assert.ok(selected>=1&&selected<=4);const units=await page.locator('.timeline-indicator-list label:has(input:checked) small').allTextContents();assert.equal(new Set(units).size,1);
  const percent=page.getByRole('button',{name:'نسبة التغير',exact:true});if(!await percent.isDisabled()){await percent.click();assert.equal(await percent.getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'القيمة الفعلية',exact:true}).click();assert.equal(await percent.getAttribute('aria-pressed'),'false');}
  return {selected,unit:units[0],incompatibleDisabled:disabled};
 });
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),base,checks:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};await writeFile('docs/audit/evidence/filters-after.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
