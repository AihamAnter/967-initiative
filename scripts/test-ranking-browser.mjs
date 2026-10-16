// Read-only ranking QA. Error/slow responses are intercepted locally; no CMS writes.
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {defaultRankingIndicators} from '../lib/rankingCatalog.js';
import {buildRanking, getDefaultRankingYear, getRankingYears, validateRankingDataset} from '../lib/rankings.js';
import {formatNumber} from '../lib/format.js';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local read-only QA only');
const out=path.resolve('docs/audit/evidence');await mkdir(out,{recursive:true});
const report={startedAt:new Date().toISOString(),base,api:[],scenarios:[],layouts:[],accessibility:[],runtimeErrors:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();page.setDefaultTimeout(15000);
page.on('pageerror',error=>report.runtimeErrors.push(error.message));
const datasets=new Map();
const scenario=async(name,run)=>{try{await run();report.scenarios.push({name,pass:true});}catch(error){report.scenarios.push({name,pass:false,error:error.message});}console.log(JSON.stringify(report.scenarios.at(-1)));};
const metric=()=>page.locator('.yr-metric-select select');
const year=()=>page.locator('.yr-controls>label').last().locator('select');
const allCategories=()=>page.locator('.yr-controls>label').first().locator('select').selectOption('all');
const waitMetric=async slug=>page.waitForFunction(slug=>new URLSearchParams(location.search).get('indicator')===slug&&!document.querySelector('.yr-state'),slug);
const expectHero=async(data,indicator,scope,selectedYear)=>{
  const rows=buildRanking(data,{year:selectedYear,scope,direction:indicator.direction});const yem=rows.find(item=>item.code==='YEM');
  if(yem){await page.waitForFunction(rank=>document.querySelector('.yr-rank-number')?.textContent===String(rank),yem.rank);assert.equal(await page.locator('.yr-country-value>strong').textContent(),formatNumber(yem.value,{maximumFractionDigits:3}));}
  else await page.locator('.yr-unavailable').waitFor();
};
try{
  await scenario('all published metric APIs return valid same-indicator snapshots; draft is hidden',async()=>{
    for(let index=0;index<defaultRankingIndicators.length;index+=4){await Promise.all(defaultRankingIndicators.slice(index,index+4).map(async indicator=>{
      const response=await context.request.get(base+'/api/rankings?indicator='+indicator.slug);const body=await response.json();
      report.api.push({slug:indicator.slug,published:indicator.is_published,status:response.status()});
      if(!indicator.is_published){assert.equal(response.status(),404);return;}
      assert.equal(response.status(),200,indicator.slug);validateRankingDataset(body.dataset,indicator.code);assert.equal(body.indicator.slug,indicator.slug);datasets.set(indicator.slug,body);
    }));}
    assert.equal(report.api.filter(item=>item.status===200).length,39);
  });
  const population=datasets.get('population');
  assert.ok(population,'Population snapshot required for browser scenarios');
  const latest=getDefaultRankingYear(population.dataset);
  await scenario('numeric Yemen rank and original value are rendered in SSR HTML',async()=>{
    const response=await context.request.get(base+'/yemen-ranking?indicator=population');const html=await response.text();
    const expected=buildRanking(population.dataset,{year:latest,scope:'world',direction:population.indicator.direction}).find(item=>item.code==='YEM');
    assert.equal(response.status(),200);assert.ok(html.includes('class="yr-rank-number">'+expected.rank+'</div>'),'Rank missing from SSR HTML');
    assert.ok(html.includes(formatNumber(expected.value,{maximumFractionDigits:3})),'Original value missing from HTML');
    const historyTitles=[...html.matchAll(/<circle[^>]*class="yr-history-point[^"]*"[^>]*><title>([^<]+)<\/title>/g)];
    assert.equal(historyTitles.length,population.dataset.values.filter(item=>item.country==='YEM').length,'Every SSR history point needs one nonempty title string to hydrate safely');
  });
  await page.goto(base+'/yemen-ranking?indicator=population',{waitUntil:'networkidle'});await waitMetric('population');
  await scenario('world and Arab rankings use the same chosen measurement year',async()=>{
    await expectHero(population.dataset,population.indicator,'world',latest);
    await page.locator('.yr-scope button').nth(1).click();await expectHero(population.dataset,population.indicator,'arab',latest);
    assert.equal(Number(await year().inputValue()),latest);assert.equal(new URL(page.url()).searchParams.get('scope'),'arab');
    const rows=buildRanking(population.dataset,{year:latest,scope:'arab',direction:population.indicator.direction});
    const other=rows.find(item=>item.code!=='YEM');await page.locator('.yr-compare-select select').selectOption(other.code);
    await page.waitForFunction(value=>document.querySelectorAll('.yr-comparison-values strong')[1]?.textContent===value,formatNumber(other.value,{maximumFractionDigits:3}));
    assert.equal(new URL(page.url()).searchParams.get('compare'),other.code);
  });
  await scenario('320, 390, 768 and 1440px controls remain inside the viewport; axe checks',async()=>{
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('.yr-explorer button,.yr-explorer input,.yr-explorer select')].filter(el=>{const b=el.getBoundingClientRect();if(b.width<1||b.height<1||el.closest('[hidden]')||el.closest('.yr-table-scroll'))return false;return b.left < -2 || b.right>innerWidth+2;}).map(el=>({tag:el.tagName,label:el.getAttribute('aria-label'),text:el.textContent}))}));
      report.layouts.push(layout);assert.ok(layout.documentWidth<=width+2&&!layout.clipped.length,JSON.stringify(layout));
      if(width<=390){const values=await page.locator('.yr-comparison-values strong').evaluateAll(elements=>elements.map(el=>({text:el.textContent,width:el.clientWidth,scroll:el.scrollWidth,whiteSpace:getComputedStyle(el).whiteSpace})));assert.ok(values.every(value=>value.scroll<=value.width+1&&value.whiteSpace==='nowrap'),'Mobile comparison numbers must fit unbroken: '+JSON.stringify(values));}
      if(width===390||width===1440){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();report.accessibility.push({width,violations:result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),incomplete:result.incomplete.map(item=>item.id)});await page.screenshot({path:path.join(out,`ranking-${width}.png`),fullPage:true});assert.equal(result.violations.length,0);}
    }
  });
  await scenario('full table searches countries, handles no results and returns keyboard focus to Yemen',async()=>{
    await page.locator('.yr-list-heading>button').click();await page.locator('.yr-table-scroll table').waitFor();
    const input=page.locator('.yr-list-tools input');await input.fill('YEM');assert.equal(await page.locator('.yr-table-scroll tbody tr').count(),1);
    await input.fill('zzzznoresults');await page.locator('.yr-table-scroll .yr-empty').waitFor();
    await page.locator('.yr-list-tools>button').click();await page.waitForFunction(()=>document.activeElement?.matches('tr.is-yemen'));
    assert.ok(await page.locator('.yr-table-scroll tbody tr').count()>1);await page.locator('.yr-list-heading>button').click();
  });
  await scenario('CSV contains exact visible-year values and PNG card downloads with metadata',async()=>{
    const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('.yr-actions button').nth(2).click()]);
    const csvPath=path.join(out,'ranking-data.csv');await csv.saveAs(csvPath);const text=await readFile(csvPath,'utf8');
    assert.ok(text.includes('YEM'));assert.ok(text.includes(String(latest)));assert.ok(text.includes(population.indicator.code));
    const [png]=await Promise.all([page.waitForEvent('download'),page.locator('.yr-actions button').nth(1).click()]);await png.saveAs(path.join(out,'ranking-card.png'));
    const bytes=await readFile(path.join(out,'ranking-card.png'));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length>15000);report.card={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length,year:latest,indicator:'population',scope:'arab'};
    assert.equal(await page.locator('.yr-card-metric').textContent(),population.indicator.name);
    assert.ok((await page.locator('.yr-card-category').textContent()).trim());
    await page.evaluate(()=>{window.rankingCardDrawnText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...args){window.rankingCardDrawnText.push(String(args[0]));return original.apply(this,args);};});
    const [summary]=await Promise.all([page.waitForEvent('download'),page.locator('.yr-save-card').click()]);
    assert.ok(summary.suggestedFilename().endsWith('-card.png'));
    await summary.saveAs(path.join(out,'ranking-summary-card.png'));
    const summaryBytes=await readFile(path.join(out,'ranking-summary-card.png'));
    assert.equal(summaryBytes.subarray(1,4).toString(),'PNG');assert.equal(summaryBytes.readUInt32BE(16),1200);
    assert.ok(summaryBytes.length>15000);
    const drawn=await page.evaluate(()=>window.rankingCardDrawnText);
    assert.ok(drawn.includes(population.indicator.name));
    assert.ok(drawn.includes((await page.locator('.yr-card-category').textContent()).trim()));
    assert.ok(drawn.some(text=>text.includes(String(latest))));
    assert.ok(drawn.includes(population.dataset.source.url));
    report.summaryCard={width:summaryBytes.readUInt32BE(16),height:summaryBytes.readUInt32BE(20),bytes:summaryBytes.length,indicator:population.indicator.slug};
  });
  await scenario('share link preserves year/scope/compare and denied clipboard exposes manual copy',async()=>{
    await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});});
    await page.locator('.yr-actions button').first().click();const field=page.locator('.yr-share-status input');await field.waitFor();const url=new URL(await field.inputValue());assert.equal(url.searchParams.get('year'),String(latest));assert.equal(url.searchParams.get('scope'),'arab');assert.ok(url.searchParams.get('compare'));
  });
  await scenario('year slider maps only actual years and browser Back restores metric state',async()=>{
    const range=page.locator('#ranking-year-range');await range.focus();await range.press('Home');assert.equal(Number(await year().inputValue()),getRankingYears(population.dataset).at(-1));
    await allCategories();await metric().selectOption('gdp');await waitMetric('gdp');const priorYear=await year().inputValue();
    await metric().selectOption('internet');await waitMetric('internet');await page.goBack();await waitMetric('gdp');assert.equal(await year().inputValue(),priorYear);
  });
  await scenario('a Yemen-missing year is explicit and latest-Yemen recovery works',async()=>{
    await page.goto(base+'/yemen-ranking?indicator=gdp',{waitUntil:'networkidle'});const data=datasets.get('gdp');
    const absent=getRankingYears(data.dataset).find(candidate=>!data.dataset.values.some(item=>item.country==='YEM'&&item.year===candidate));
    assert.ok(absent,'GDP needs a year with others but no Yemen to exercise absence');await year().selectOption(String(absent));await page.locator('.yr-unavailable').waitFor();assert.equal(await page.locator('.yr-rank-number').count(),0);
    await page.locator('.yr-unavailable button').click();await expectHero(data.dataset,data.indicator,'world',getDefaultRankingYear(data.dataset));
  });
  await scenario('fetch failure and invalid data show retry; later selection wins slow responses',async()=>{
    await page.goto(base+'/yemen-ranking?indicator=population',{waitUntil:'networkidle'});await allCategories();let attempts=0;
    await page.route('**/api/rankings?indicator=gdp',async route=>{attempts++;await route.fulfill({status:attempts===1?503:200,contentType:'application/json',body:JSON.stringify(attempts===1?{error:'تعذر التحميل مؤقتاً'}:datasets.get('gdp'))});});
    await metric().selectOption('gdp');await page.locator('.yr-error').waitFor();await page.locator('.yr-error button').click();await waitMetric('gdp');assert.equal(attempts,2);await page.unroute('**/api/rankings?indicator=gdp');
    const broken=structuredClone(datasets.get('internet'));broken.dataset.indicatorCode='WRONG.CODE';
    await page.route('**/api/rankings?indicator=internet',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(broken)}));await metric().selectOption('internet');await page.locator('.yr-error').waitFor();await page.unroute('**/api/rankings?indicator=internet');
    await page.goto(base+'/yemen-ranking?indicator=population',{waitUntil:'networkidle'});await allCategories();
    await page.route('**/api/rankings?indicator=gdp',async route=>{await new Promise(resolve=>setTimeout(resolve,800));try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(datasets.get('gdp'))});}catch{}});
    await metric().selectOption('gdp');await page.locator('.yr-state').waitFor();await metric().selectOption('internet');await waitMetric('internet');await page.waitForTimeout(1000);assert.equal(await metric().inputValue(),'internet');assert.equal(await page.locator('.yr-story h2').textContent(),datasets.get('internet').indicator.name);await page.unroute('**/api/rankings?indicator=gdp');
  });
}finally{
  report.completedAt=new Date().toISOString();await writeFile(path.join(out,'ranking-browser.json'),JSON.stringify(report,null,2));await browser.close();
}
const failures=report.scenarios.filter(item=>!item.pass).length+report.runtimeErrors.length;
console.log(JSON.stringify({scenarios:report.scenarios.length,failures,apis:report.api.length,layouts:report.layouts.length,axe:report.accessibility.length,card:report.card}));process.exitCode=failures?1:0;
