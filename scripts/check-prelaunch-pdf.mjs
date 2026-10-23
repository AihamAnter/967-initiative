// Read-only reader regression on the final local production build.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve('.audit-tools/package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const page=await browser.newPage({viewport:{width:390,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.name));
await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const report={base:'http://127.0.0.1:3122',passed:false,checks:[]};
try{
 await page.goto(report.base+'/magazine/inline-issue',{waitUntil:'networkidle'});
 const input=page.locator('.pdf-page-jump input');await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.disabled===false,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('.paper-static img')?.complete===true);assert.equal(await input.inputValue(),'1');report.checks.push('The actual unchanged demo PDF loads and renders');
 await page.getByRole('button',{name:'الصفحة التالية',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.value==='2');
 await page.getByRole('group',{name:'قارئ مجلة 967: استخدم الأسهم للتنقل'}).focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.value==='3');report.checks.push('Next page and keyboard navigation work');
 await page.getByRole('button',{name:'تكبير',exact:true}).click();assert.match(await page.locator('.pdf-controls').innerText(),/115/);report.checks.push('Zoom reaches115%');
 await input.fill('٤');await page.locator('.pdf-page-jump button').click();await page.waitForFunction(()=>document.querySelector('.pdf-page-jump input')?.value==='4');report.checks.push('Arabic page jump reaches page4');
 await page.getByRole('textbox',{name:'البحث داخل العدد'}).fill('NO_MATCH_967');await page.locator('.pdf-find button').click();await page.locator('.pdf-find [role=status]').waitFor();assert.match(await page.locator('.pdf-find [role=status]').innerText(),/لم نجد النص/);report.checks.push('Reader search reports a genuine no-match');
 assert.deepEqual(errors,[]);report.passed=true;
}finally{report.runtimeErrors=errors;await writeFile('docs/audit/prelaunch-fixes-2026-10/evidence/pdf-browser.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
