import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright');
const base='http://127.0.0.1:3117',fixture='http://127.0.0.1:3417';
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const state=await fetch(fixture+'/fixture/state').then(r=>r.json()),out='docs/debates/evidence';await mkdir(out,{recursive:true});
const results=[];
async function pageFor(user){
 const context=await browser.newContext({viewport:{width:390,height:1000}});
 if(user){const session=await fetch(fixture+'/fixture/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id})}).then(r=>r.json());await context.addInitScript(s=>localStorage.setItem('sb-127-auth-token',JSON.stringify(s)),session);}
 const page=await context.newPage();page.setDefaultTimeout(25000);page.setDefaultNavigationTimeout(60000);return page;
}
try{
 const admin=await pageFor(state.users.find(u=>u.role==='management'));await admin.goto(base+'/admin/debates');await admin.getByRole('button',{name:'إنشاء مناظرة',exact:true}).click();
 const title=admin.getByRole('textbox',{name:'عنوان المناظرة',exact:true}),slug=admin.getByRole('textbox',{name:'الرابط القصير',exact:true}),question=admin.getByRole('textbox',{name:'السؤال الرئيسي',exact:true});
 await admin.getByRole('button',{name:'حفظ المناظرة وإعداداتها'}).click();await admin.locator('.debate-validation-summary').waitFor();
 assert.equal(await title.getAttribute('aria-invalid'),'true');assert.equal(await slug.getAttribute('aria-invalid'),'true');assert.equal(await question.getAttribute('aria-invalid'),'true');assert.equal(await title.evaluate(el=>document.activeElement===el),true);assert.ok(await admin.locator('.debate-required-mark').count()>=3);
 await admin.screenshot({path:out+'/validation-admin-390.png',fullPage:true});results.push('Empty admin fields show stars, inline Arabic errors, red state and focus on first invalid field');
 await title.fill('   ');await title.blur();assert.equal(await title.getAttribute('aria-invalid'),'true');await title.fill('مناظرة باختبار التحقق');assert.equal(await title.getAttribute('aria-invalid'),null);
 await slug.fill('invalid slug');await slug.blur();assert.equal(await slug.getAttribute('aria-invalid'),'true');await slug.fill('validation-example');await question.fill('ما أثر الحوار في المشاركة؟');
 const cover=admin.getByRole('textbox',{name:'رابط الغلاف',exact:true});await cover.fill('http://example.test/photo.png');await cover.blur();assert.equal(await cover.getAttribute('aria-invalid'),'true');await cover.fill('');await cover.blur();assert.equal(await cover.getAttribute('aria-invalid'),null);results.push('Whitespace, invalid slug and insecure optional URL are rejected; corrections clear errors');
 await admin.getByRole('checkbox',{name:/إتاحة التسجيل للجمهور/}).check();await admin.getByRole('button',{name:'حفظ المناظرة وإعداداتها'}).click();assert.equal(await admin.getByRole('textbox',{name:'رابط التسجيل',exact:true}).getAttribute('aria-invalid'),'true');await admin.getByRole('checkbox',{name:/إتاحة التسجيل للجمهور/}).uncheck();
 await admin.getByRole('button',{name:'حفظ المناظرة وإعداداتها'}).click();await admin.getByRole('heading',{name:'تعديل المناظرة',exact:true}).waitFor();results.push('Recording URL becomes required only when recording is published; valid draft saves');
 const audience=await pageFor(state.users.find(u=>!u.role));await audience.goto(base+'/debates/local-prerecorded');await audience.getByRole('button',{name:'طرح سؤال',exact:true}).click();const body=audience.locator('#questions textarea');await body.waitFor();await audience.waitForFunction(()=>!document.querySelector('#questions textarea').disabled);
 await audience.getByRole('button',{name:'إرسال السؤال للمراجعة'}).click();assert.equal(await body.getAttribute('aria-invalid'),'true');await body.fill('قصير');await body.blur();assert.equal(await body.getAttribute('aria-invalid'),'true');await body.fill('سؤال مكتمل لاختبار التحقق من الحقول');assert.equal(await body.getAttribute('aria-invalid'),null);
 await audience.locator('#polls>summary').click();await audience.locator('#vote-before').getByRole('button',{name:'حفظ صوتي'}).click();assert.ok(await audience.locator('#vote-before input[aria-invalid=true]').count()>0);await audience.locator('#vote-before input[type=radio]').first().check();assert.equal(await audience.locator('#vote-before input[aria-invalid=true]').count(),0);
 await audience.getByRole('button',{name:'كتابة تعليق',exact:true}).click();await audience.getByRole('button',{name:'إرسال التعليق للمراجعة'}).click();assert.equal(await audience.locator('#comment-body').getAttribute('aria-invalid'),'true');await audience.screenshot({path:out+'/validation-audience-390.png',fullPage:true});results.push('Question, comment and poll validations highlight missing/short fields without sending them');
 await audience.goto(base+'/debates/suggest');await audience.getByRole('button',{name:'إرسال المقترح للمراجعة'}).click();assert.equal(await audience.locator('[aria-invalid=true]').count(),5);assert.equal(await audience.locator('input[name=suggested_speakers],textarea[name=suggested_speakers]').getAttribute('aria-invalid'),null);results.push('Suggestion marks five required fields while keeping optional speaker suggestions optional');
 const guest=await pageFor();await guest.goto(base+'/register');await guest.getByRole('button',{name:'إنشاء حساب',exact:true}).click();await guest.locator('.debate-validation-summary').waitFor();assert.equal(await guest.locator('[aria-invalid=true]').count(),4);results.push('Registration required fields and consent are highlighted too');
 await writeFile(out+'/validation-results.json',JSON.stringify({passed:true,scenarios:results},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
