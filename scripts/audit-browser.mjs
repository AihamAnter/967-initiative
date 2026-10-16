// Optional isolated QA tooling: npm install --prefix .audit-tools --no-package-lock playwright @axe-core/playwright
// Read-only browsing. Contact success is intercepted locally; never writes a CMS record.
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(path.resolve('.audit-tools/package.json'));
const {chromium} = require('playwright');
const {default: AxeBuilder} = require('@axe-core/playwright');
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
const label = process.env.AUDIT_LABEL || 'after';
const out = path.resolve('docs/audit/evidence');
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:process.env.AUDIT_CHROME_PATH || path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context = await browser.newContext({reducedMotion:'reduce', viewport:{width:1440,height:1000}});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const report = {base,label,startedAt:new Date().toISOString(),routes:[],layouts:[],accessibility:[],interactions:[],runtimeErrors:[]};
if(process.env.AUDIT_INTERACTIONS_ONLY==='1'){
  const previous=JSON.parse(await readFile(path.join(out,`browser-${label}.json`),'utf8'));
  for(const key of ['routes','layouts','accessibility','runtimeErrors'])report[key]=previous[key];
  report.layoutCheckedAt=previous.layoutCheckedAt||previous.startedAt;
  report.note='Layout/axe evidence retained from the same production build; interactions rerun after correcting test assumptions.';
}
page.on('pageerror', error => report.runtimeErrors.push({url:page.url(),message:error.message}));
const widths = [320,360,390,430,768,1024,1440,1920];
const staticRoutes = ['/', '/works','/magazine','/magazine/demo','/yemen-in-numbers','/yemen-in-numbers/timeline','/yemen-map','/yemeni-products','/professionals','/search','/contribute','/admin'];
const sitemapResponse = await context.request.get(base+'/sitemap.xml');
const sitemap = await sitemapResponse.text();
const publishedPaths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(item=>new URL(item[1]).pathname);
const prefixes=['/works/','/magazine/','/professionals/','/yemeni-products/','/yemen-map/figures/','/yemen-in-numbers/indicator/','/yemen-in-numbers/'];
for(const prefix of prefixes) {
  const route=publishedPaths.find(p=>p.startsWith(prefix) && (prefix!=='/yemen-in-numbers/' || !p.includes('/indicator/')&&!p.endsWith('/timeline')));
  if(route&&!staticRoutes.includes(route)) staticRoutes.push(route);
}
if(!staticRoutes.some(p=>p.startsWith('/yemen-map/figures/')))staticRoutes.push('/yemen-map/figures/arwa-al-sulayhi');
for(const route of process.env.AUDIT_INTERACTIONS_ONLY==='1'?[]:staticRoutes) {
  try {
    const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:90000});
    const structure=await page.evaluate(()=>({title:document.title,h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,dir:document.documentElement.dir,canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content}));
    report.routes.push({route,status:response.status(),...structure});
    for(const width of widths) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.left < -2||b.right>innerWidth+2)&&getComputedStyle(el).position!=='absolute'&&getComputedStyle(el).position!=='fixed';}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className?.baseVal??el.className}))}));
      const clippedControls=await page.locator('a,button,input,select,textarea,summary').evaluateAll(elements=>elements.filter(el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1||getComputedStyle(el).visibility==='hidden'||el.closest('.sr-only'))return false;if(b.left>=-2&&b.right<=innerWidth+2)return false;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowX))return false;return true;}).map(el=>({tag:el.tagName,cls:el.className,label:el.getAttribute('aria-label')})));
      report.layouts.push({route,width,pass:layout.document<=width+2&&!clippedControls.length,...layout,clippedControls});
      if(width===390||width===1440) {
        const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
        report.accessibility.push({route,width,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,15)})),incomplete:result.incomplete.map(v=>v.id)});
        if(['/', '/magazine/demo','/yemen-map','/contribute'].includes(route))await page.screenshot({path:path.join(out,`${label}-${route==='/'?'home':route.slice(1).replaceAll('/','-')}-${width}.png`),fullPage:true});
      }
    }
    console.log(JSON.stringify({route,status:response.status(),overflow:report.layouts.filter(x=>x.route===route&&!x.pass).map(x=>x.width),axe:report.accessibility.filter(x=>x.route===route).map(x=>({width:x.width,violations:x.violations.map(v=>v.id)}))}));
  } catch(error) {report.routes.push({route,error:error.message});console.log(JSON.stringify({route,error:error.message}));}
}
const scenario = async (name, run) => {try{await run();report.interactions.push({name,pass:true});}catch(error){report.interactions.push({name,pass:false,error:error.message});}console.log(JSON.stringify(report.interactions.at(-1)));};
await scenario('mobile menu opens, Escape closes, keyboard focus returns',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(base);
  const menu=page.locator('.menu-toggle');await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');await assert.doesNotReject(()=>menu.evaluate(el=>{if(document.activeElement!==el)throw Error('focus not restored');}));
});
await scenario('Arabic search finds figure and empty search recovers',async()=>{
  await page.goto(base+'/search?q='+encodeURIComponent('أروى')+'&type=figures');await page.locator('a.search-result').first().waitFor();
  assert.ok((await page.locator('a.search-result').first().getAttribute('href')).includes('arwa-al-sulayhi'));
  await page.goto(base+'/search?q=zzzzzzzzzzzzzz&type=works');assert.equal(await page.locator('a.search-result').count(),0);
});
await scenario('PDF loads, navigation works and page input accepts a complete number',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/magazine/demo');const field=page.locator('.pdf-page-jump input');await field.waitFor();
  await field.waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.disabled===false,null,{timeout:30000});
  await field.fill('٣');await field.press('Enter');await field.blur();assert.equal(Number(await field.inputValue()),3);
  await page.getByRole('button',{name:'الصفحة التالية',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.value==='4');
  assert.ok(await page.locator('canvas,img[src^="blob:"],img[src^="data:"]').count()>0);
});
await scenario('map loads, zoom/reset and governorate selection work',async()=>{
  await page.goto(base+'/yemen-map');await page.locator('.ymap-canvas > svg').waitFor({timeout:30000});
  const map=page.locator('.ymap-canvas > svg');const before=await map.getAttribute('viewBox');await page.getByRole('button',{name:'تكبير',exact:true}).click();
  await page.waitForFunction(old=>document.querySelector('.ymap-canvas > svg')?.getAttribute('viewBox')!==old,before);
  await page.getByRole('button',{name:'عرض اليمن كاملة',exact:true}).click();
  const region=page.locator('.ymap-canvas > svg [role="button"]').first();await region.focus();await region.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="العودة إلى المستوى السابق"]')?.disabled);
  assert.ok(await page.locator('.ymap-district').count()>0);
  await page.getByRole('button',{name:'إخفاء حدود المديريات',exact:true}).click();assert.equal(await page.locator('.ymap-district').count(),0);
  await page.getByRole('button',{name:'إظهار حدود المديريات',exact:true}).click();assert.ok(await page.locator('.ymap-district').count()>0);
  const district=page.locator('.ymap-district').first();await district.focus();await district.press('Enter');assert.equal(await district.getAttribute('aria-pressed'),'true');
  const search=page.getByRole('textbox',{name:'ابحث عن محافظة أو مديرية',exact:true});await search.fill('عبس');await page.locator('.ymap-search-results button').first().waitFor();await search.press('ArrowDown');assert.ok(await page.locator('.ymap-search-results button').first().evaluate(el=>el===document.activeElement));await page.keyboard.press('Escape');assert.equal(await search.inputValue(),'');
});
await scenario('contact UI reports mocked success without sending a message',async()=>{
  assert.ok(new URL(base).hostname==='127.0.0.1'||new URL(base).hostname==='localhost','UI mock only allowed locally');
  await page.route('**/api/contact',route=>route.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'}));
  await page.goto(base+'/contribute');const form=page.locator('form').filter({has:page.locator('textarea')});
  await form.locator('input[name="name"]').fill('اختبار محلي');await form.locator('input[name="email"]').fill('qa@example.invalid');await form.locator('textarea').fill('اختبار محلي للواجهة لا يرسل رسالة حقيقية.');
  const select=form.locator('select');if(await select.count())await select.selectOption({index:1});
  await form.locator('button[type="submit"]').click();await page.getByText('تم استلام رسالتك للمراجعة. شكراً لمساهمتك.').waitFor({timeout:10000});
  await page.unroute('**/api/contact');
});
await scenario('desktop dropdown Escape and direct detail/back navigation',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/works');const summary=page.locator('.nav-group > summary').first();await summary.click();await page.keyboard.press('Escape');assert.ok(await summary.evaluate(el=>el===document.activeElement));
  const card=page.locator('a.work-card-click').first();const href=await card.getAttribute('href');await card.click();await page.waitForURL(base+href);assert.equal(await page.locator('h1').count(),1);await page.goBack();assert.equal(new URL(page.url()).pathname,'/works');
});
await scenario('content searches produce empty states and recover',async()=>{
  for(const [route,inputSelector,cardSelector] of [
    ['/works','.filter-search input','.work-grid > article'],
    ['/magazine','.archive-tools input','.issue-card'],
    ['/professionals','.professionals-search input','.professional-card'],
    ['/yemeni-products','.products-search input','.company-card'],
    ['/yemen-in-numbers','.stat-search input','.stat-explorer .stat-indicator-card'],
  ]){
    await page.goto(base+route);const input=page.locator(inputSelector);await input.fill('zzzzzzzzzzzzzz');assert.equal(await page.locator(cardSelector).count(),0,route);await input.fill('');assert.ok(await page.locator(cardSelector).count()>0,route);
  }
});
await scenario('PDF readable text, multi-digit clamp, spread and download',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/magazine/demo');const field=page.locator('.pdf-page-jump input');await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.disabled===false,null,{timeout:30000});
  const count=Number((await page.locator('.pdf-page-jump label').innerText()).match(/\d+/g).at(-1));assert.ok(count>1);
  await field.fill('999');await field.press('Enter');await field.blur();const spreadLast=count%2===0?count:count-1;assert.equal(Number(await field.inputValue()),spreadLast);await page.locator('.pdf-accessible-text summary').click();await page.locator('.pdf-accessible-text section').first().waitFor();
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('button[aria-label="عرض صفحتين"]')?.disabled===true);
  await field.fill(String(count));await field.press('Enter');await field.blur();assert.equal(Number(await field.inputValue()),count);
  await field.fill('2.5');await field.blur();assert.equal(Number(await field.inputValue()),count);
  const file=await context.request.get(base+'/demo/967-demo.pdf');assert.ok(file.ok());assert.equal((await file.body()).subarray(0,5).toString(),'%PDF-');
});
await scenario('PDF failure offers retry and recovers',async()=>{
  await page.route('**/demo/967-demo.pdf',route=>route.abort('failed'));await page.goto(base+'/magazine/demo');await page.locator('.pdf-state[role="alert"]').waitFor({timeout:30000});await page.unroute('**/demo/967-demo.pdf');await page.locator('.pdf-state').getByRole('button',{name:'إعادة المحاولة'}).click();await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.disabled===false,null,{timeout:30000});
});
await scenario('map network failure offers retry and recovers',async()=>{
  await page.route('**/data/yemen-map/yemen-boundaries.json',route=>route.abort('failed'));await page.goto(base+'/yemen-map');await page.getByText('تعذر تحميل الخريطة',{exact:true}).waitFor();await page.unroute('**/data/yemen-map/yemen-boundaries.json');await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).click();await page.locator('.ymap-canvas > svg').waitFor();
});
await scenario('share handles a denied clipboard with a selectable link',async()=>{
  const route=publishedPaths.find(p=>p.startsWith('/yemen-in-numbers/indicator/'));assert.ok(route);await page.goto(base+route);
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});});
  await page.getByRole('button',{name:'مشاركة المؤشر',exact:true}).click();await page.locator('.share-fallback input').waitFor();assert.equal(await page.locator('.share-fallback input').inputValue(),base+route);
});
await scenario('timeline table and CSV/PNG exports match visible data',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/yemen-in-numbers/timeline');await page.locator('.timeline-chart svg').first().waitFor();await page.locator('.timeline-data summary').click();assert.ok(await page.locator('.timeline-data tbody tr').count()>0);
  for(const [name,file] of [['تنزيل CSV','timeline-after.csv'],['تنزيل الرسم كصورة','timeline-after.png']]){
    const downloadPromise=page.waitForEvent('download',{timeout:20000});await page.getByRole('button',{name,exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,file));assert.equal(await download.failure(),null);
  }
});
await scenario('contact non-JSON error and network failure preserve the message',async()=>{
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
  for(const mode of ['503','offline']){
    await page.route('**/api/contact',route=>mode==='503'?route.fulfill({status:503,contentType:'text/html',body:'Unavailable'}):route.abort('failed'));
    await page.goto(base+'/contribute');const form=page.locator('.contact-form');await form.locator('[name="name"]').fill('اختبار محلي');await form.locator('[name="email"]').fill('qa@example.invalid');await form.locator('select').selectOption({index:1});const message='اختبار محلي دون إرسال بيانات إلى الخادم.';await form.locator('textarea').fill(message);await form.locator('button[type="submit"]').click();await form.locator('[role="alert"]').waitFor();assert.equal(await form.locator('textarea').inputValue(),message);await page.unroute('**/api/contact');
  }
});
await browser.close();
report.completedAt=new Date().toISOString();
await writeFile(path.join(out,`browser-${label}.json`),JSON.stringify(report,null,2));
const failures=report.routes.filter(x=>x.error||x.status!==200).length+report.layouts.filter(x=>!x.pass).length+report.interactions.filter(x=>!x.pass).length+report.runtimeErrors.length+report.accessibility.reduce((n,x)=>n+x.violations.length,0);
console.log(JSON.stringify({label,routes:report.routes.length,layouts:report.layouts.length,accessibility:report.accessibility.length,failures,axeViolations:report.accessibility.reduce((n,x)=>n+x.violations.length,0)}));
process.exitCode=failures?1:0;

