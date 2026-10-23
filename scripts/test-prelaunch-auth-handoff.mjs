// Regression found by the independent reviewer; all traffic stays on loopback.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.resolve('.audit-tools/package.json')),{chromium}=require('playwright');
const base='http://127.0.0.1:3122',fixture='http://127.0.0.1:3417';
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
await context.route('**/*',r=>[base,fixture].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.name));page.setDefaultTimeout(20000);
const report={environment:'Final production build + isolated fixture. Signup returns an intentionally simulated obfuscated user with no session; login uses real local Auth fixture.',passed:false};
try{
 await page.goto(base+'/debates/local-prerecorded',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'طرح سؤال',exact:true}).click();
 const draft='مسودة محفوظة بعد تسجيل بريد موجود دون جلسة';await page.locator('#question-body').fill(draft);
 await page.locator('.arena-composer').getByRole('link',{name:'أنشئ حساباً',exact:true}).click();await page.waitForURL('**/register?next=*');await page.getByRole('heading',{name:'إنشاء حساب',exact:true}).waitFor();
 await page.route('**/auth/v1/signup**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'99999999-9999-4999-8999-999999999999',aud:'authenticated',role:'authenticated',email:'user-d@example.test',app_metadata:{provider:'email',providers:['email']},user_metadata:{display_name:'مشارك'},identities:[],created_at:'2026-01-01T00:00:00Z'})}));
 await page.locator('input[name=display_name]').fill('مشارك محلي');await page.locator('input[name=email]').fill('user-d@example.test');await page.locator('input[name=password]').fill('Local-test-967!');await page.locator('input[name=accepted]').check();await page.getByRole('button',{name:'إنشاء حساب',exact:true}).click();await page.getByRole('status').filter({hasText:'تحقق من بريدك'}).waitFor();
 const saved=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('967:debate-draft:')).map(k=>JSON.parse(sessionStorage.getItem(k))));assert.equal(saved.length,1);assert.equal(saved[0].owner,'guest');assert.ok(saved[0].handoff);
 await page.getByRole('navigation',{name:'خيارات الحساب'}).getByRole('link',{name:'تسجيل الدخول',exact:true}).click();await page.waitForURL('**/login?next=*');await page.getByRole('heading',{name:'تسجيل الدخول',exact:true}).waitFor();await page.locator('input[name=email]').first().fill('user-d@example.test');await page.locator('input[name=password]').fill('Local-test-967!');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();await page.waitForURL('**/debates/local-prerecorded?draft=*#questions');await page.waitForFunction(text=>document.querySelector('#question-body')?.value===text,draft);
 assert.equal(await page.locator('.arena-post').filter({hasText:draft}).count(),0);assert.deepEqual(errors,[]);report.passed=true;report.checks=['Guest handoff remains unclaimed after signup without a session','Actual authenticated account restores the original draft','No automatic question publication','No runtime errors'];
}finally{report.runtimeErrors=errors;await writeFile('docs/audit/prelaunch-fixes-2026-10/evidence/auth-handoff-browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
