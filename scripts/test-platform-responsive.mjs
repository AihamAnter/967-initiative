// Read-only, local production UI checks. Never submits a form or changes CMS data.
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(path.resolve('.audit-tools/package.json'));
const {chromium} = require('playwright');
const {default:AxeBuilder} = require('@axe-core/playwright');
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3102';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out = path.resolve('docs/audit/evidence/ux-refresh');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH || path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context = await browser.newContext({reducedMotion:'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const report = {base, startedAt:new Date().toISOString(), layouts:[], accessibility:[], scenarios:[], runtimeErrors:[], consoleErrors:[], requestFailures:[]};
page.on('pageerror', error => report.runtimeErrors.push({url:page.url(), message:error.message}));
page.on('console', message => {if(message.type()==='error') report.consoleErrors.push({url:page.url(), message:message.text(),source:message.location().url});});
page.on('requestfailed', request => {if(request.failure()?.errorText!=='net::ERR_ABORTED') report.requestFailures.push({url:request.url(),error:request.failure()?.errorText});});
const widths = [320,360,390,430,768,900,901,1024,1440,1920];
const routes = ['/', '/works','/magazine','/yemen-in-numbers','/yemen-ranking','/yemen-map','/yemeni-products','/professionals','/contribute','/search'];
for (const route of routes) {
  const response = await page.goto(base+route, {waitUntil:'networkidle',timeout:90000});
  assert.equal(response.status(),200,route);
  await page.evaluate(()=>document.fonts.ready);
  for (const width of widths) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const layout = await page.evaluate(()=>{
      const clipped = [...document.querySelectorAll('a,button,input,select,textarea,summary,.stat-card-value strong')].filter(el=>{
        const b = el.getBoundingClientRect();
        if (b.width<1 || b.height<1 || getComputedStyle(el).visibility==='hidden' || el.closest('.sr-only')) return false;
        for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement) if(['auto','scroll'].includes(getComputedStyle(p).overflowX)) return false;
        return b.left < -2 || b.right > innerWidth+2 || el.scrollWidth > el.clientWidth+2;
      }).map(el=>({tag:el.tagName,cls:typeof el.className==='string'?el.className:'svg',text:el.textContent.slice(0,80)}));
      return {documentWidth:document.documentElement.scrollWidth,clipped};
    });
    report.layouts.push({route,width,...layout,pass:layout.documentWidth<=width+2&&!layout.clipped.length});
    if (route==='/' && [320,390,768,1440,1920].includes(width)) {
      await page.screenshot({path:path.join(out,`after-home-${width}.png`),fullPage:true});
      await page.screenshot({path:path.join(out,`after-first-screen-${width}.png`)});
    }
    if ([390,1440].includes(width)) {
      const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      report.accessibility.push({route,width,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>v.id)});
    }
  }
  console.log(JSON.stringify({route,failedWidths:report.layouts.filter(x=>x.route===route&&!x.pass).map(x=>x.width)}));
}
const scenario = async (name, run) => {
  try {await run();report.scenarios.push({name,pass:true});} catch(error) {report.scenarios.push({name,pass:false,error:error.message});}
  console.log(JSON.stringify(report.scenarios.at(-1)));
};
await scenario('Home uses full collection width and readable mobile destinations',async()=>{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.setViewportSize({width:1920,height:1080});
  assert.equal(await page.locator('.home-hero-grid').evaluate(el=>el.clientWidth),1360);
  await page.setViewportSize({width:320,height:800});
  for(const link of await page.locator('.quick-link').all()) {
    assert.ok(await link.locator('span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=14));
    assert.ok(await link.evaluate(el=>el.clientHeight>=44));
  }
  const cover=page.locator('.home-issue-cover img');
  if(await cover.count())assert.ok(await cover.evaluate(el=>el.getBoundingClientRect().width>=150));
  for(const value of await page.locator('.stat-card-value strong').all())assert.ok(await value.evaluate(el=>el.scrollWidth<=el.clientWidth+2));
});
await scenario('Mobile navigation and keyboard focus restore at 320 and 390px',async()=>{
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:844});
    const menu=page.locator('.menu-toggle');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');
    assert.ok(await menu.evaluate(el=>document.activeElement===el));
    await menu.click();await page.locator('.mobile-navigation-groups a[href="/works"]').click();
    await page.waitForURL(base+'/works');assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }
});
await scenario('Search and directory filters recover from an empty result',async()=>{
  for(const [route,inputSelector,cardSelector] of [
    ['/works','.filter-search input','.work-card'],
    ['/magazine','.archive-tools input','.issue-card'],
    ['/professionals','.professionals-search input','.professional-card'],
    ['/yemeni-products','.products-search input','.company-card'],
    ['/yemen-in-numbers','.stat-search input','.stat-explorer .stat-indicator-card'],
  ]) {
    await page.goto(base+route,{waitUntil:'networkidle'});
    const input=page.locator(inputSelector);
    // Unpublished collections may legitimately be empty.
    if(!await input.count())continue;
    const before=await page.locator(cardSelector).count();
    await input.fill('zzzzzzzzzzzzzz');assert.equal(await page.locator(cardSelector).count(),0,route);
    await input.fill('');assert.equal(await page.locator(cardSelector).count(),before,route);
    const select=page.locator('main select').first();
    if(await select.count()&&await select.locator('option').count()>1){await select.selectOption({index:1});await select.selectOption({index:0});assert.equal(await page.locator(cardSelector).count(),before,route);}
  }
});
await scenario('A removed thumbnail leaves a readable editorial fallback and valid work link',async()=>{
  // Deliberate network error is isolated from the normal console checks.
  const isolated=await context.newPage();
  await isolated.route('**/_next/image?*',route=>route.abort('failed'));
  await isolated.goto(base+'/works',{waitUntil:'networkidle'});
  const card=isolated.locator('.work-card').filter({has:isolated.locator('.work-card-media img')}).first();
  // A valid collection may have no thumbnails. In that case check any fallback.
  const fallback=isolated.locator('.work-card-placeholder').first();
  assert.ok(await fallback.locator('strong').innerText());
  assert.ok((await isolated.locator('.work-card-click').first().getAttribute('href')).startsWith('/works/'));
  assert.equal(await card.count(),0,'failed provider images should be removed');
  await isolated.screenshot({path:path.join(out,'thumbnail-fallback.png'),fullPage:true});
  await isolated.close();
});
await scenario('Hero search submits an actual search and atlas links resolve',async()=>{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.home-hero input[name="q"]').fill('اليمن');
  await page.locator('.home-hero button[type="submit"]').click();
  await page.waitForURL(url=>url.pathname==='/search'&&url.searchParams.get('q')==='اليمن');
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('.home-map-visual').click();
  await page.waitForURL(base+'/yemen-map');await page.locator('.ymap-canvas > svg').waitFor({timeout:30000});
});
await browser.close();
report.finishedAt=new Date().toISOString();
report.failures=report.layouts.filter(x=>!x.pass).length+report.scenarios.filter(x=>!x.pass).length+report.accessibility.reduce((n,x)=>n+x.violations.length,0)+report.runtimeErrors.length+report.consoleErrors.length;
await writeFile(path.join(out,'responsive-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({layouts:report.layouts.length,axe:report.accessibility.length,scenarios:report.scenarios.length,runtimeErrors:report.runtimeErrors.length,consoleErrors:report.consoleErrors.length,failures:report.failures}));
process.exitCode=report.failures?1:0;
