// Requires the local fixture started with --prelaunch-security and Next on 3117.
// Real saves go only to isolated PGlite; no production or external email.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
console.log('contact browser process',process.pid);
const require=createRequire(path.resolve('.audit-tools/package.json')),{chromium}=require('playwright');
const base='http://127.0.0.1:3117',fixture='http://127.0.0.1:3417',out='docs/audit/prelaunch-fixes-2026-10/evidence/contact';
await mkdir(out,{recursive:true});
const local=async(route,body)=>{const response=await fetch(fixture+route,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)}:{signal:AbortSignal.timeout(10000)});assert.ok(response.ok,await response.clone().text());return response.json();};
const state=await local('/fixture/state');assert.equal(state.production,false);
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
await context.route('**/*',route=>[base,fixture].includes(new URL(route.request().url()).origin)?route.continue():route.abort('blockedbyclient'));
await context.routeWebSocket('**/realtime/**',socket=>socket.close());
const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(90000);
const report={environment:'Local Next + isolated PGlite fixture; real DB persistence/status/limiter; simulated failures only where labelled.',scenarios:[],layouts:[],runtimeErrors:[]};
page.on('pageerror',error=>report.runtimeErrors.push(error.message));
const reference='/yemeni-products/'+state.ids.company,params=new URLSearchParams({type:'تصحيح معلومة',referenceTitle:'شركة يمنية محلية للتحرير',referencePath:reference,referenceId:state.ids.company});
const contactEmail='contact-'+randomUUID().slice(0,8)+'@example.test',ambiguousEmail='ambiguous-'+randomUUID().slice(0,8)+'@example.test';
const text='رسالة تواصل محلية لاختبار الحفظ الفعلي وربط المرجع وحالة المتابعة.';
const fill=async()=>{await page.locator('[name=name]').fill('مرسل اختبار الحفظ');await page.locator('[name=email]').fill(contactEmail);await page.locator('[name=message]').fill(text);};
const submit=()=>page.locator('.contact-form button[type=submit]').click();
try{
 await local('/fixture/clear-rate',{});await page.goto(base+'/contribute?'+params,{waitUntil:'networkidle'});
 assert.equal(await page.getByRole('link',{name:'العودة إلى صفحة المرجع'}).getAttribute('href'),reference);
 console.log('filling contact form');await fill();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'form-'+width+'.png'),fullPage:true});report.layouts.push({screen:'contact',width,overflow:false});}
 let sentId;page.on('request',request=>{if(request.url()===base+'/api/contact'&&request.method()==='POST')sentId=request.postDataJSON().submissionId;});
 console.log('submitting actual contact');const response=page.waitForResponse(r=>r.url()===base+'/api/contact'&&r.request().method()==='POST');await submit();assert.equal((await response).status(),201);await page.locator('.feedback.success').waitFor();
 console.log('contact saved');const savedId=sentId;const saved=await local('/fixture/row?'+new URLSearchParams({table:'messages',id:savedId}));assert.equal(saved.status,'new');assert.ok(saved.message.includes(reference));assert.ok(saved.message.includes(text));assert.equal(await page.locator('[name=message]').inputValue(),'');
 report.scenarios.push('L-07 real contact save returns201 only after insertion; reference persisted, legacy-compatible new status, draft cleared');
 await fill();await page.locator('[name=email]').fill(ambiguousEmail);
 let committedId;
 await page.route('**/api/contact',async route=>{committedId=route.request().postDataJSON().submissionId;const savedResponse=await route.fetch();assert.equal(savedResponse.status(),201);await route.abort('failed');});
 await submit();await page.locator('.feedback.error').waitFor();assert.equal(await page.locator('[name=message]').inputValue(),text);await page.unroute('**/api/contact');
 const edited=text+' نسخة معدلة بعد انقطاع الرد.';await page.locator('[name=message]').fill(edited);
 const retry=page.waitForResponse(r=>r.url()===base+'/api/contact');await submit();assert.equal((await retry).status(),201);await page.locator('.feedback.success').waitFor();assert.notEqual(sentId,committedId);
 assert.ok((await local('/fixture/row?'+new URLSearchParams({table:'messages',id:committedId}))).message.endsWith(text));
 assert.ok((await local('/fixture/row?'+new URLSearchParams({table:'messages',id:sentId}))).message.endsWith(edited));
 report.scenarios.push('L-07 real commit with simulated lost response keeps draft; editing retry generates another UUID and persists revised text without replacing original');
 console.log('filling contact form');await fill();
 await page.route('**/api/contact',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'تعذر حفظ الرسالة حالياً'})}));
 await submit();await page.locator('.feedback.error').waitFor();assert.equal(await page.locator('[name=message]').inputValue(),text);await page.unroute('**/api/contact');
 assert.ok(await page.evaluate(expected=>Object.keys(sessionStorage).some(key=>key.startsWith('967-contribution-draft')&&JSON.parse(sessionStorage.getItem(key)||'{}').message===expected),text),'Draft stored before reloading');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(expected=>document.querySelector('[name=message]')?.value===expected,text);assert.equal(await page.locator('[name=message]').inputValue(),text);report.scenarios.push('L-07 simulated503 preserves text and session draft across reload');
 console.log('draft reloaded');const payload={name:'اختبار الحد المشترك',email:'limit@example.test',type:'استفسار',message:text};
 await local('/fixture/clear-rate',{});
 for(let i=0;i<8;i++){const r=await fetch(base+'/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,submissionId:randomUUID()})});assert.equal(r.status,201);}
 const limited=page.waitForResponse(r=>r.url()===base+'/api/contact');await submit();assert.equal((await limited).status(),429);await page.locator('.feedback.error').waitFor();assert.equal(await page.locator('[name=message]').inputValue(),text);assert.ok((await page.locator('.feedback.error').innerText()).includes('عشر دقائق'));report.scenarios.push('S-04 real shared PostgreSQL counter accepts eight then429; form preserves draft and shows wait');
 console.log('shared limit verified');const admin=await local('/fixture/session',{user_id:state.roles.admin});
 const adminContext=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
 await adminContext.addInitScript(session=>localStorage.setItem('sb-127-auth-token',JSON.stringify(session)),admin);
 await adminContext.route('**/*',route=>[base,fixture].includes(new URL(route.request().url()).origin)?route.continue():route.abort('blockedbyclient'));await adminContext.routeWebSocket('**/realtime/**',socket=>socket.close());
 const adminPage=await adminContext.newPage();adminPage.setDefaultTimeout(25000);adminPage.on('pageerror',error=>report.runtimeErrors.push(error.message));
 console.log('opening admin');await adminPage.goto(base+'/admin?tab=messages',{waitUntil:'networkidle',timeout:90000});await adminPage.getByRole('button',{name:'الرسائل',exact:true}).click();
 const row=adminPage.locator('.message-item').filter({hasText:contactEmail});await row.waitFor();assert.equal(await row.getByRole('link',{name:'فتح صفحة المرجع'}).getAttribute('href'),reference);
 for(const status of ['in_progress','resolved']){await row.getByRole('combobox').selectOption(status);await adminPage.getByText('تم تحديث حالة الرسالة.',{exact:true}).waitFor();assert.equal((await local('/fixture/row?'+new URLSearchParams({table:'messages',id:savedId}))).status,status);}
 await adminPage.getByLabel('عرض الرسائل').selectOption('resolved');await row.waitFor();
 for(const width of [320,390,768,1440]){await adminPage.setViewportSize({width,height:1000});assert.ok(await adminPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await adminPage.screenshot({path:path.join(out,'admin-status-'+width+'.png'),fullPage:true});report.layouts.push({screen:'admin messages',width,overflow:false});}
 report.scenarios.push('L-07 authenticated Admin reads stored reference and updates new→in_progress→resolved through RLS; filter retains processed message');
 await adminPage.reload({waitUntil:'networkidle'});await adminPage.getByRole('button',{name:'الرسائل',exact:true}).click();assert.equal(await adminPage.locator('.message-item').filter({hasText:contactEmail}).getByRole('combobox').inputValue(),'resolved');report.scenarios.push('L-07 processed status persists after full reload');
 await local('/fixture/role',{user_id:state.roles.admin,role:null});
 const denied=await fetch(base+'/api/admin/debates',{headers:{Authorization:'Bearer '+admin.access_token}});assert.equal(denied.status,403);await adminPage.reload({waitUntil:'networkidle'});await adminPage.getByText('هذا حساب مستخدم عادي ولا يملك صلاحية دخول لوحة التحرير.',{exact:false}).waitFor();assert.equal(await adminPage.locator('.message-item').count(),0);report.scenarios.push('L-05 revoked editor is refused by actual API and UI; private message list absent');
 await local('/fixture/role',{user_id:state.roles.admin,role:'admin'});
 assert.equal(report.runtimeErrors.length,0);
 await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){report.failure=error.message;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));throw error;}
finally{await local('/fixture/role',{user_id:state.roles.admin,role:'admin'}).catch(()=>{});await local('/fixture/clear-rate',{}).catch(()=>{});await browser.close();}
