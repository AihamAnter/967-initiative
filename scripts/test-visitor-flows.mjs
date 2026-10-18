// Local, read-only visitor regression checks. Contact is mocked; WhatsApp is never opened.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3103';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=path.resolve('docs/audit/evidence/visitor-fixes');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(90000);
const report={base,startedAt:new Date().toISOString(),scenarios:[],layouts:[],axe:[],errors:[],consoleErrors:[],metrics:{}};
const detailRoutes=new Set();
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({message:message.text(),source:message.location().url});});
const go=async route=>{const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200,route);return response;};
const settled=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const scenario=async(name,run)=>{try{await run();report.scenarios.push({name,pass:true});}catch(error){report.scenarios.push({name,pass:false,error:error.message});}console.log(JSON.stringify(report.scenarios.at(-1)));};
await scenario('Contribution draft survives type changes, reload, and back; clear removes it',async()=>{
 await go('/contribute');report.metrics.formTop390=await page.locator('.contact-form').evaluate(el=>el.getBoundingClientRect().top);assert.ok(report.metrics.formTop390<500);
 await page.locator('[name="name"]').fill('اختبار محلي');await page.locator('[name="email"]').fill('visitor@example.invalid');await page.locator('textarea').fill('مسودة محلية لا تُرسل إلى الإنتاج.');
 await page.locator('.contribution-options a').filter({hasText:'اقتراح شركة أو منتج'}).click();await page.waitForURL(url=>url.searchParams.get('type')==='اقتراح شركة أو منتج');
 assert.equal(await page.locator('textarea').inputValue(),'مسودة محلية لا تُرسل إلى الإنتاج.');
 await page.locator('.contact-form select').selectOption('التطوع والمشاركة');await page.waitForURL(url=>url.searchParams.get('type')==='التطوع والمشاركة');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('textarea').inputValue(),'مسودة محلية لا تُرسل إلى الإنتاج.');assert.equal(await page.locator('.contact-form select').inputValue(),'التطوع والمشاركة');
 await page.locator('.contribution-options a').filter({hasText:'تصحيح معلومة'}).click();await page.waitForURL(url=>url.searchParams.get('type')==='تصحيح معلومة');await page.goBack({waitUntil:'networkidle'});
 assert.equal(await page.locator('textarea').inputValue(),'مسودة محلية لا تُرسل إلى الإنتاج.');
 await page.getByRole('button',{name:'مسح المسودة',exact:true}).click();assert.equal(await page.locator('textarea').inputValue(),'');assert.equal(await page.evaluate(()=>sessionStorage.getItem('967-contribution-draft-v1')),null);
});
await scenario('Mocked contact success clears the session draft without a real submission',async()=>{
 await page.route('**/api/contact',route=>route.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'}));
 await page.locator('[name="name"]').fill('اختبار محلي');await page.locator('[name="email"]').fill('visitor@example.invalid');await page.locator('textarea').fill('رسالة محلية معترضة لا تصل للخادم.');await page.locator('.contact-form select').selectOption({index:1});
 await page.locator('button[type="submit"]').click();await page.locator('.feedback.success').waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('967-contribution-draft-v1')),null);await page.unroute('**/api/contact');
});
await scenario('Search ranks direct names, matches separated words, and supports exact/excluded/title modes',async()=>{
 await go('/search?q='+encodeURIComponent('صنعاء'));assert.equal((await page.locator('.search-result h2').first().innerText()).trim(),'صنعاء');
 await go('/search?q='+encodeURIComponent('صنعاء نجار'));assert.ok(await page.locator('.search-result').count()>0);assert.ok((await page.locator('.search-results').innerText()).includes('الكروني'));
 await go('/search?q='+encodeURIComponent('صنعاء -الكروني'));assert.ok(!(await page.locator('.search-results').innerText()).includes('علي سعيد الكروني'));
 await go('/search?q='+encodeURIComponent('"نجار أثاث"'));assert.ok(await page.locator('.search-result').count()>0);
 await go('/search?q='+encodeURIComponent('صنعاء كلمةلاتوجد')+'&mode=any');assert.ok(await page.locator('.search-result').count()>0);
 await go('/search?q='+encodeURIComponent('صنعاء')+'&scope=title');for(const title of await page.locator('.search-result h2').allTextContents())assert.ok(title.includes('صنعاء'));
 await page.locator('.advanced-search-options select[name="mode"]').selectOption('any');await Promise.all([page.waitForURL(url=>url.searchParams.get('mode')==='any'),page.getByRole('button',{name:'تطبيق الخيارات',exact:true}).click()]);await page.waitForLoadState('networkidle');
 // A committed URL can precede the new streamed page. Wait for its actual links.
 await page.waitForFunction(()=>[...document.querySelectorAll('.search-filters a')].every(link=>new URL(link.href).searchParams.get('mode')==='any'));
 await Promise.all([page.waitForURL(url=>url.searchParams.get('type')==='places'),page.locator('.search-filters a').filter({hasText:'المحافظات والمديريات'}).click()]);await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).searchParams.get('scope'),'title');assert.equal(new URL(page.url()).searchParams.get('mode'),'any');assert.equal(await page.locator('input[name="type"]').inputValue(),'places');
 for(const [width,type] of [[320,'professionals'],[390,'all']]){
  await page.setViewportSize({width,height:844});await Promise.all([page.waitForURL(url=>url.searchParams.get('type')===type),page.locator(`.search-filters a[href*="type=${type}"]`).click()]);await page.waitForLoadState('networkidle');assert.equal(await page.locator('input[name="type"]').inputValue(),type);assert.equal(new URL(page.url()).searchParams.get('mode'),'any');assert.equal(new URL(page.url()).searchParams.get('scope'),'title');
 }
});
await scenario('Work filters and search survive detail/back and direct URL reload',async()=>{
 await go('/works');await page.locator('.filter-search input').fill('اليمنية العزلة');await settled();await page.locator('.filter-bar select').selectOption('يوتيوب');await settled();
 const link=page.locator('.work-card-click').first(),href=await link.getAttribute('href');detailRoutes.add(new URL(href,base).pathname);await link.click();await page.waitForURL(base+href);await page.goBack({waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('.filter-search input')?.value==='اليمنية العزلة');assert.equal(await page.locator('.filter-bar select').inputValue(),'يوتيوب');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.filter-search input')?.value==='اليمنية العزلة');assert.ok(await page.locator('.work-card').count()>0);
 const next=page.locator('.work-card-click').first(),nextHref=await next.getAttribute('href');await next.click();await page.waitForURL(base+nextHref);await page.getByRole('link',{name:'العودة إلى الأعمال',exact:true}).click();await page.waitForURL(url=>url.pathname==='/works');await page.waitForFunction(()=>document.querySelector('.filter-search input')?.value==='اليمنية العزلة');assert.equal(await page.locator('.filter-bar select').inputValue(),'يوتيوب');
});
await scenario('Directories match separate fields and service areas; WhatsApp uses the saved number',async()=>{
 await go('/yemeni-products');await page.locator('.products-search input').fill('صنعاء ماء');await settled();assert.ok(await page.locator('.company-card').count()>0);
 detailRoutes.add(new URL(await page.locator('.company-card').first().getAttribute('href'),base).pathname);
 await go('/professionals');await page.locator('select[aria-label="منطقة تقديم الخدمة"]').selectOption('صنعاء');await page.locator('.professionals-search input').fill('نجار صنعاء');await settled();assert.ok(await page.locator('.professional-card').count()>0);
 const wa=page.locator('.whatsapp-card-link').first();assert.equal(new URL(await wa.getAttribute('href')).hostname,'wa.me');assert.equal(new URL(await wa.getAttribute('href')).pathname,'/967777000456');
 const href=await page.locator('.professional-card-hitarea').first().getAttribute('href');detailRoutes.add(new URL(href,base).pathname);await page.locator('.professional-card-hitarea').first().click();await page.waitForURL(base+href);assert.ok(await page.getByRole('link',{name:'تواصل عبر واتساب',exact:true}).count());
});
await scenario('Atlas is visible early; display options work and a place opens its figures',async()=>{
 await go('/yemen-map');await page.locator('.ymap-canvas>svg').waitFor();report.metrics.mapTop390=await page.locator('.ymap-canvas').evaluate(el=>el.getBoundingClientRect().top);assert.ok(report.metrics.mapTop390<550);
 assert.equal(await page.locator('.figures-directory-shell').getAttribute('open'),null);
 await page.locator('.ymap-display-options summary').click();await page.getByRole('button',{name:'حجم أسماء كبير',exact:true}).click();assert.equal(await page.getByRole('button',{name:'حجم أسماء كبير',exact:true}).getAttribute('aria-pressed'),'true');
 await page.locator('.ymap-display-options summary').click();await page.locator('.ymap-search-wrap select').selectOption({label:'صنعاء'});await settled();assert.notEqual(await page.locator('.figures-directory-shell').getAttribute('open'),null);
});
await scenario('One-year indicator gives a brief explanation and no misleading trend chart',async()=>{
 await go('/yemen-in-numbers');const href=await page.locator('.stats-latest .stat-indicator-card').first().getAttribute('href');detailRoutes.add(href);await go(href);
 assert.ok((await page.locator('.indicator-reading-note').innerText()).length<300);assert.ok(await page.locator('.single-year-note').count());assert.equal(await page.locator('.recharts-wrapper').count(),0);
 assert.ok((await page.locator('.stat-source-list').innerText()).includes('worldpopulationreview.com'));assert.equal(await page.locator('.indicator-notes details').getAttribute('open'),null);
});
await scenario('Indicator search ranks its title ahead of a broad category mention',async()=>{
 await go('/yemen-in-numbers');await page.locator('.stat-search input').fill('السكان');await settled();
 await page.waitForFunction(()=>document.querySelector('.stat-explorer .stat-indicator-card h3')?.textContent.includes('سكان'));
 assert.ok((await page.locator('.stat-explorer .stat-indicator-grid h3').allTextContents()).includes('عدد سكان اليمن'));
 await page.locator('.stat-search input').fill('عدد سكان');await settled();assert.equal(await page.locator('.stat-explorer .stat-indicator-card').count(),1);
});
for(const route of ['/','/works','/professionals','/yemeni-products','/contribute','/yemen-map','/search?q='+encodeURIComponent('صنعاء'),'/yemen-in-numbers',...detailRoutes]){
 await go(route);
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await settled();
  const layout=await page.evaluate(()=>({document:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('a,button,input,select,textarea,summary')].filter(el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1||el.closest('.sr-only'))return false;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowX))return false;return b.left < -2 || b.right > innerWidth+2;}).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,60)}))}));
  report.layouts.push({route,width,...layout,pass:layout.document<=width+2&&!layout.clipped.length});
  if([390,1440].includes(width)){
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();report.axe.push({route,width,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>v.id)});
   await page.screenshot({path:path.join(out,route.split('?')[0].replaceAll('/','-').slice(1)||'home')+`-${width}.png`,fullPage:true});
  }
 }
 console.log(JSON.stringify({route,failedWidths:report.layouts.filter(x=>x.route===route&&!x.pass).map(x=>x.width)}));
}
await browser.close();report.finishedAt=new Date().toISOString();report.failures=report.scenarios.filter(x=>!x.pass).length+report.layouts.filter(x=>!x.pass).length+report.axe.reduce((n,x)=>n+x.violations.length,0)+report.errors.length+report.consoleErrors.length;
await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({scenarios:report.scenarios.length,layouts:report.layouts.length,axe:report.axe.length,metrics:report.metrics,errors:report.errors,consoleErrors:report.consoleErrors,failures:report.failures}));process.exitCode=report.failures?1:0;
