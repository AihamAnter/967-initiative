// Isolated integration checks; never create accounts against a live project.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=createRequire(path.resolve('.audit-tools/package.json'))('playwright');
const base=process.env.AUTH_TEST_BASE||'http://127.0.0.1:3117',fixture=process.env.AUTH_TEST_FIXTURE||'http://127.0.0.1:3417';
assert.equal((await fetch(fixture+'/fixture/state').then(r=>r.json())).production,false);
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const results=[],errors=[],external=[];
async function post(route,data){const response=await fetch(fixture+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.ok(response.ok);return response.json();}
async function pageFor(){const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});return page;}
async function login(page,email,password){await page.goto(base+'/login');await page.locator('form').first().getByLabel('البريد الإلكتروني').fill(email);await page.locator('input[name="password"]').fill(password);await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();}
try{
 const invalid=await pageFor();await login(invalid,'missing@example.test','invalid-password');await invalid.getByRole('alert').filter({hasText:'البريد الإلكتروني أو كلمة المرور غير صحيحة'}).waitFor();results.push('Invalid credentials have their own message without implying an unconfirmed email');await invalid.context().close();
 const suffix=Date.now().toString(36),email='pending-'+suffix+'@example.test',password='Local-account-967!';
 await post('/auth/v1/signup',{email,password,data:{display_name:'مستخدم اختبار',audience_terms:true}});
 const pending=await pageFor();await login(pending,email,password);await pending.getByRole('alert').filter({hasText:'لم يُؤكَّد بريد هذا الحساب بعد'}).waitFor();results.push('Unconfirmed accounts receive a distinct confirmation message');await pending.context().close();
 await post('/fixture/confirm',{email});const confirmed=await pageFor();await login(confirmed,email,password);await confirmed.waitForURL(base+'/account');await confirmed.getByRole('heading',{name:'ملفي الشخصي'}).waitFor();assert.equal(await confirmed.locator('input[type=email]').inputValue(),email);results.push('Confirmed user signs in and keeps the session on the account page');await confirmed.context().close();
 const instant=await pageFor(),instantEmail='instant-'+suffix+'@example.test';
 await instant.route(fixture+'/auth/v1/signup**',async route=>{
  const response=await route.fetch(),user=await response.json();assert.ok(response.ok());await post('/fixture/confirm',{email:instantEmail});const session=await post('/fixture/session',{user_id:user.id});await route.fulfill({response,json:session});
 });
 await instant.goto(base+'/register');await instant.getByLabel('اسم العرض').fill('حساب مؤكد تلقائياً');await instant.getByLabel('البريد الإلكتروني').fill(instantEmail);await instant.locator('input[name="password"]').fill(password);await instant.getByRole('checkbox').check();await instant.getByRole('button',{name:'إنشاء حساب',exact:true}).click();await instant.waitForURL(base+'/account');await instant.getByRole('heading',{name:'ملفي الشخصي'}).waitFor();assert.equal(await instant.locator('input[type=email]').inputValue(),instantEmail);assert.ok(await instant.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('sb-127-auth-token'))?.access_token)));results.push('Auto-confirmed signup opens the account immediately and preserves the issued session');await instant.context().close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await writeFile(process.env.AUTH_TEST_REPORT||'docs/debates/evidence/account-auth-results.json',JSON.stringify({passed:true,results,runtimeErrors:errors,externalRequests:external},null,2));console.log(JSON.stringify(results,null,2));
}catch(error){for(const context of browser.contexts())for(const page of context.pages())console.error(JSON.stringify({url:page.url(),alerts:await page.locator('[role=alert]').allTextContents(),invalid:await page.locator('[aria-invalid=true]').count(),completed:results}));throw error;}finally{await browser.close();}
