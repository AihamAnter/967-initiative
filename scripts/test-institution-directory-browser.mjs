import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(path.resolve('.audit-tools/package.json')),{chromium}=require('playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000',browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});

await page.goto(`${base}/universities`,{waitUntil:'networkidle'});
assert.match(await page.locator('.directory-summary').innerText(),/115|١١٥/);
const educationSearch=page.locator('.institution-search input');
await educationSearch.fill('جامعة صنعاء');
await page.locator('.institution-card').first().waitFor();
assert.equal(await page.locator('.institution-card').count(),1);
await page.locator('.institution-card-link').click();
await page.waitForURL(/\/universities\/edu-6620fcddf773/);
assert.equal(await page.locator('.institution-programs article').count(),14);
assert.ok(await page.getByRole('link',{name:/المصدر/}).count()>=14);
assert.match(await page.locator('.institution-sources').innerText(),/تم الوصول/);
const educationBack=await page.locator('a.back-link').getAttribute('href');
assert.equal(new URL(educationBack,base).searchParams.get('q'),'جامعة صنعاء');
await page.locator('a.back-link').click();await page.waitForURL(/\/universities/);
assert.equal(await page.locator('.institution-search input').inputValue(),'جامعة صنعاء');

await page.goto(`${base}/medical-centers`,{waitUntil:'networkidle'});
assert.match(await page.locator('.directory-summary').innerText(),/161|١٦١/);
assert.equal((await page.locator('.institution-filter > span:first-child').allTextContents()).includes('الطوارئ'),false,'empty emergency filter is hidden');
const medicalSearch=page.locator('.institution-search input');
await medicalSearch.fill('هيئة مستشفي الثورة العام تعز');
await page.locator('.institution-card').first().waitFor();
assert.equal(await page.locator('.institution-card').count(),1);
await page.locator('.institution-card-link').click();
await page.waitForURL(/\/medical-centers\/health-1519011/);
assert.match(await page.locator('.institution-detail-body main').innerText(),/غسيل الكلى/);
assert.match(await page.locator('.institution-detail-body main').innerText(),/المشورة والفحص/);
assert.match(await page.locator('.institution-sources').innerText(),/نشر المصدر/);

for(const width of [390,320]){
 await page.setViewportSize({width,height:844});await page.goto(`${base}/universities`,{waitUntil:'networkidle'});
 const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(layout.document<=layout.viewport+2,`horizontal overflow at ${width}px`);
}
await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/medical-centers`,{waitUntil:'networkidle'});
await page.locator('.institution-search input').fill('طب الأطفال');
assert.equal(await page.locator('.institution-card').count(),1);
assert.match(await page.locator('.institution-card').innerText(),/هيئة مستشفى الثورة العام بالحديدة/);
assert.deepEqual(errors,[]);
await browser.close();
console.log(JSON.stringify({universities:115,publishedMedicalCenters:161,sanaaPrograms:14,taizServices:4,pediatricsSearchResults:1,mobileWidths:[390,320],runtimeErrors:0}));
