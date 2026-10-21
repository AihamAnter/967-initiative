// Runs only against the isolated loopback fixture described in docs/debates.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(path.resolve('.audit-tools/package.json'))('playwright');
const base='http://127.0.0.1:3117',fixture='http://127.0.0.1:3417';
const state=await fetch(fixture+'/fixture/state').then(r=>r.json());assert.equal(state.production,false);
const user=state.users.find(u=>!u.role),session=await fetch(fixture+'/fixture/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id})}).then(r=>r.json());
await fetch(fixture+'/fixture/clear-rate',{method:'POST'});
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const results=[],runtime=[],external=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:1000}});await context.addInitScript(s=>localStorage.setItem('sb-127-auth-token',JSON.stringify(s)),session);const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>runtime.push(e.message));page.on('request',r=>{if(!['localhost','127.0.0.1'].includes(new URL(r.url()).hostname))external.push(r.url());});
 await page.goto(base+'/debates/local-prerecorded');await page.waitForFunction(()=>document.querySelector('#comment-body')&&!document.querySelector('#comment-body').disabled);
 const errors=()=>page.locator('.debate-interactions [aria-invalid=true]');
 // A native validity inspection must not present errors on untouched forms.
 await page.evaluate(()=>document.querySelectorAll('.debate-interactions form').forEach(f=>f.checkValidity()));assert.equal(await errors().count(),0);
 await page.getByRole('button',{name:'طرح سؤال',exact:true}).click();await page.locator('#questions textarea').focus();await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();await page.locator('#comment-body').focus();await page.locator('.arena-heading h2').click();assert.equal(await errors().count(),0);results.push('Native validity checks and focus changes leave untouched forms neutral');
 // An intentional empty submission must still highlight its own required field.
 await page.getByRole('button',{name:'طرح سؤال',exact:true}).click();await page.getByRole('button',{name:'إرسال السؤال للمراجعة'}).click();await page.locator('#questions textarea[aria-invalid=true]').waitFor();assert.equal(await errors().count(),1);assert.equal(await page.locator('#comments [aria-invalid=true],.debate-poll [aria-invalid=true]').count(),0);
 await page.locator('#questions textarea').fill('سؤال مستقل للتأكد من عدم تلوين النماذج الأخرى');assert.equal(await errors().count(),0);results.push('An empty question submission validates only the question form; correction clears it');
 // Preserve a draft in another form throughout a successful comment submission.
 const draft=await page.locator('#questions textarea').inputValue();await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();await page.locator('#comment-body').fill('تعليق مستقل لا يتطلب تعبئة الاستطلاعات أو السؤال');await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();await page.getByRole('button',{name:'إرسال التعليق للمراجعة'}).click();await page.waitForFunction(()=>document.querySelector('#comment-body').value===''&&!document.querySelector('#comment-body').disabled);assert.equal(await errors().count(),0);assert.equal(await page.locator('#questions textarea').inputValue(),draft);results.push('Posting a comment preserves the question draft and leaves empty polls neutral');
 await page.locator('#polls>summary').click();await page.locator('#vote-before input[type=radio]').first().check();await page.locator('#vote-before button').click();await page.getByRole('status').filter({hasText:'تم حفظ اختيارك'}).waitFor();await page.waitForFunction(()=>!document.querySelector('#comment-body').disabled);assert.equal(await errors().count(),0);assert.equal(await page.locator('#questions textarea').inputValue(),draft);results.push('Saving a vote leaves the other poll and comment fields neutral');
 await page.getByRole('button',{name:'طرح سؤال',exact:true}).click();await page.getByRole('button',{name:'إرسال السؤال للمراجعة'}).click();await page.waitForFunction(()=>document.querySelector('#questions textarea').value===''&&!document.querySelector('#questions textarea').disabled);assert.equal(await errors().count(),0);
 await page.locator('#questions textarea').focus();await page.locator('.arena-heading h2').click();assert.equal(await errors().count(),0);results.push('Posting a question resets its validation and leaves all other forms neutral');
 await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();await page.getByRole('button',{name:'إرسال التعليق للمراجعة'}).click();await page.locator('#comment-body[aria-invalid=true]').waitFor();assert.equal(await errors().count(),1);await page.locator('#comment-body').fill('تعليق مصحح');assert.equal(await errors().count(),0);results.push('Empty comment submissions still show their own error and clear after correction');
 // Required checks on the second poll must remain effective and local too.
 await page.locator('#vote-after button').click();assert.equal(await page.locator('#vote-after input[aria-invalid=true]').count(),3);assert.equal(await page.locator('#questions [aria-invalid=true],#comments [aria-invalid=true],#vote-before [aria-invalid=true]').count(),0);results.push('Missing second-poll choice and watch confirmation highlight only that poll');
 assert.deepEqual(runtime,[]);assert.deepEqual(external,[]);await writeFile('docs/debates/evidence/form-isolation-results.json',JSON.stringify({passed:true,results,runtimeErrors:runtime,externalRequests:external},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
