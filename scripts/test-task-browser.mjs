// All task data stays in isolated PostgreSQL. Browser API interception invokes
// the production API handler + RLS-backed adapter, rather than a CRUD mock.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createTaskTestDatabase,taskTestUsers} from '../tests/helpers/taskTestDatabase.mjs';
import {handleTaskRequest} from '../lib/taskApi.js';
import {dayKey} from '../lib/tasks.js';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3104';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const out=path.resolve('docs/tasks/evidence');await mkdir(out,{recursive:true});
const db=await createTaskTestDatabase();
const call=async(user,body)=>{const response=await handleTaskRequest(new Request(base+'/api/admin/tasks',{method:'POST',headers:{Authorization:'Bearer '+user,'Content-Type':'application/json'},body:JSON.stringify(body)}),db.createDb);const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;};
const [A,B,C]=taskTestUsers;
await call(A.id,{action:'create',data:{title:'مراجعة خطة الفريق',description:'تجميع الملاحظات قبل الاجتماع',due_date:dayKey(),due_timezone:'Europe/Paris',priority:'high',tags:['اجتماع']}});
await call(B.id,{action:'create',data:{title:'إنتاج حلقة يامكان',description:'البحث والتصوير والمونتاج',due_at:new Date(Date.now()-86400000).toISOString(),priority:'urgent'}});
const seeded=await call(C.id,{action:'create',data:{title:'تطوير المنصة',assigned_to:C.id,status:'in_progress'}});
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const report={scenarios:[],layouts:[],accessibility:[],runtimeErrors:[],unexpectedWrites:[],externalRequests:[]};
let nextFailure=null;
async function contextFor(user){
 const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 const fixtureUser={id:user.id,email:'fixture@example.test',aud:'authenticated',role:'authenticated',user_metadata:{full_name:user.name},app_metadata:{provider:'email'}};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})}.local-browser-fixture`;
 const session={access_token:token,refresh_token:'local-fixture-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:fixtureUser};
 await context.addInitScript(({session})=>localStorage.setItem('sb-127-auth-token',JSON.stringify(session)),{session});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin==='http://127.0.0.1:54321'){
   if(url.pathname.startsWith('/auth/v1/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.endsWith('/user')?fixtureUser:session)});
   if(!['GET','HEAD'].includes(req.method()))report.unexpectedWrites.push({url:url.pathname,method:req.method()});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([])});
  }
  if(url.origin!==new URL(base).origin){report.externalRequests.push(url.origin);return route.abort('blockedbyclient');}
  if(url.pathname==='/api/admin/tasks'){
   if(nextFailure&&req.method()==='POST'){const failure=nextFailure;nextFailure=null;return route.fulfill({status:failure,contentType:'application/json',body:JSON.stringify({error:'تعذر حفظ التغيير التجريبي. أعد المحاولة.'})});}
   const response=await handleTaskRequest(new Request(req.url(),{method:req.method(),headers:req.headers(),...(!['GET','HEAD'].includes(req.method())?{body:req.postData()}: {})}),db.createDb);
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>report.runtimeErrors.push(e.message));return {context,page};
}
let currentPage;
try{
 const {context,page}=await contextFor(C);currentPage=page;
 const initialResponse=await page.goto(base+'/admin/tasks',{waitUntil:'domcontentloaded'});assert.equal(initialResponse.status(),200);assert.ok(!(await initialResponse.text()).includes('إنتاج حلقة يامكان'));await page.getByRole('button',{name:'إضافة مهمة',exact:true}).waitFor({state:'visible'});assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex.*nofollow/);const unauthenticated=await page.request.get(base+'/api/admin/tasks');assert.equal(unauthenticated.status(),401);console.log('Task page loaded');
 await page.getByRole('button',{name:'إضافة مهمة',exact:true}).click();
 let dialog=page.getByRole('dialog').last();await dialog.getByLabel('عنوان المهمة').fill('إعداد تقرير المجلة');await dialog.getByLabel('المسؤول',{exact:true}).selectOption(B.id);await dialog.getByLabel('يوم التسليم').fill(dayKey());await dialog.getByLabel('الوسوم').fill('مجلة، أسبوعي');await dialog.getByRole('button',{name:'حفظ المهمة',exact:true}).click();
 await page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'إعداد تقرير المجلة',exact:true})}).waitFor();report.scenarios.push('management creates and assigns a task through real API/PostgreSQL');
 dialog=page.getByRole('dialog').last();await dialog.getByRole('textbox',{name:'خطوة جديدة'}).fill('جمع البيانات');await dialog.getByRole('button',{name:'إضافة خطوة',exact:true}).click();await dialog.getByRole('checkbox',{name:/جمع البيانات/}).click();await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open] input[type=checkbox]')].some(n=>n.checked));
 await dialog.getByRole('button',{name:'المناقشة (٠)',exact:true}).click();await dialog.getByLabel('إضافة تعليق').fill('تمت مراجعة البيانات');await dialog.getByRole('button',{name:'إرسال التعليق',exact:true}).click();await dialog.getByText('تمت مراجعة البيانات',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'تعديل التعليق',exact:true}).click();await dialog.getByLabel('تعديل التعليق').fill('تمت المراجعة والتوثيق');await dialog.getByRole('button',{name:'حفظ التعديل',exact:true}).click();await dialog.getByText('تمت المراجعة والتوثيق',{exact:true}).waitFor();report.scenarios.push('subtask creation/completion and comment addition/edit recorded in database');
 await dialog.getByRole('button',{name:'تعديل',exact:true}).click();let editor=page.getByRole('dialog').last();await editor.getByLabel('الأولوية',{exact:true}).selectOption('urgent');await editor.getByLabel('ساعة التسليم').fill('16:30');await editor.getByRole('button',{name:'حفظ المهمة',exact:true}).click();await page.waitForTimeout(500);
 dialog=page.getByRole('dialog').last();await dialog.getByRole('button',{name:'إكمال المهمة',exact:true}).click();await dialog.getByRole('button',{name:'أرشفة',exact:true}).waitFor();await dialog.getByRole('button',{name:'أرشفة',exact:true}).click();await dialog.getByRole('button',{name:'استعادة المهمة',exact:true}).waitFor();await dialog.getByRole('button',{name:'استعادة المهمة',exact:true}).click();await dialog.getByRole('button',{name:'إعادة فتح المهمة',exact:true}).click();await dialog.getByRole('button',{name:'سجل النشاط',exact:true}).click();await dialog.getByText('إكمال المهمة · الحالة',{exact:true}).waitFor();report.scenarios.push('edit priority/timed deadline, complete, archive, restore and reopen preserving audit');
 await dialog.getByRole('button',{name:'إغلاق النافذة'}).click();await page.getByRole('searchbox',{name:'البحث في مهام الفريق'}).fill('يامكان');await page.getByRole('button',{name:'بحث',exact:true}).click();await page.getByRole('button',{name:'إنتاج حلقة يامكان',exact:true}).first().click();dialog=page.getByRole('dialog').last();await dialog.getByRole('button',{name:'إغلاق النافذة'}).click();assert.match(page.url(),/q=/);await page.getByRole('button',{name:'مسح الفلاتر',exact:true}).click();
 await page.getByRole('button',{name:'Kanban',exact:true}).click();await page.getByLabel('نقل إلى').first().waitFor();const dragCard=page.getByRole('article').filter({has:page.getByRole('button',{name:'تطوير المنصة',exact:true})});const blockedColumn=page.getByRole('heading',{name:/^متوقفة/}).locator('..');await dragCard.dragTo(blockedColumn);await page.waitForFunction(()=>document.querySelectorAll('select').length>0);await page.waitForTimeout(350);assert.equal((await db.pg.query('select status from public.tasks where id=$1',[seeded.id])).rows[0].status,'blocked');const first=page.getByLabel('نقل إلى').first(),before=await first.inputValue();nextFailure=503;await first.selectOption(before==='blocked'?'in_progress':'blocked');await page.getByRole('alert').waitFor();assert.equal(await first.inputValue(),before);report.scenarios.push('Kanban drag/drop persists; failed mutation retains original status; search survives detail navigation');
 await page.getByRole('button',{name:'التقويم',exact:true}).click();await page.getByRole('button',{name:new RegExp(dayKey()+'،')}).click();await page.getByRole('heading',{name:/مهام /}).last().waitFor();await page.getByLabel('طريقة عرض التقويم').selectOption('week');await page.getByRole('button',{name:'الفترة القادمة',exact:true}).click();await page.getByRole('button',{name:'اليوم',exact:true}).click();report.scenarios.push('monthly/weekly calendar, day selection, next period and today navigation');
 await page.getByRole('button',{name:'القائمة',exact:true}).click();
 await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
 for(const width of [320,390,768,1440,1920]){
  await page.setViewportSize({width,height:1100});await page.waitForTimeout(250);await page.evaluate(()=>document.activeElement?.blur());const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(dimensions.scroll<=dimensions.client,`Horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);report.layouts.push({view:'list',width,...dimensions,pass:true});await page.screenshot({path:path.join(out,`tasks-${width}.png`),fullPage:true});
 }
 for(const view of ['Kanban','التقويم']){await page.getByRole('button',{name:view,exact:true}).click();for(const width of [320,390,768,1440,1920]){await page.setViewportSize({width,height:1100});await page.waitForTimeout(200);const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(dimensions.scroll<=dimensions.client,`Overflow in ${view} at ${width}`);report.layouts.push({view,width,...dimensions,pass:true});}await page.screenshot({path:path.join(out,view==='Kanban'?'tasks-kanban.png':'tasks-calendar.png'),fullPage:true});}
 await page.getByRole('button',{name:'القائمة',exact:true}).click();await page.getByRole('button',{name:'إضافة مهمة',exact:true}).click();dialog=page.getByRole('dialog').last();for(const width of [320,390,768,1440,1920]){await page.setViewportSize({width,height:900});const dimensions=await dialog.evaluate(node=>({scroll:node.scrollWidth,client:node.clientWidth}));assert.ok(dimensions.scroll<=dimensions.client,`Dialog overflow at ${width}`);report.layouts.push({view:'form',width,...dimensions,pass:true});}await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(out,'tasks-form-390.png')});await dialog.getByRole('button',{name:'إغلاق النافذة'}).click();
 await page.setViewportSize({width:1440,height:1050});const axe=await new AxeBuilder({page}).include('main').analyze();report.accessibility=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
 await page.getByRole('button',{name:'إدارة المشاريع',exact:true}).click();dialog=page.getByRole('dialog').last();await dialog.getByLabel('مشروع جديد').fill('تحرير المجلة');await dialog.getByRole('button',{name:'حفظ المشروع',exact:true}).click();await dialog.getByText('تحرير المجلة',{exact:true}).waitFor();await dialog.getByRole('button',{name:'إغلاق النافذة'}).click();report.scenarios.push('management project creation');
 await page.getByRole('button',{name:/التنبيهات/}).click();dialog=page.getByRole('dialog').last();await dialog.getByRole('button',{name:'تحديد الجميع كمقروء',exact:true}).click();await dialog.getByRole('button',{name:'إغلاق النافذة'}).click();report.scenarios.push('notification read state');
 await context.close();
 const admin=await contextFor(A);await admin.page.goto(base+'/admin/tasks');await admin.page.getByRole('button',{name:'إنتاج حلقة يامكان',exact:true}).first().click();dialog=admin.page.getByRole('dialog').last();assert.equal(await dialog.getByRole('button',{name:'تعديل',exact:true}).count(),0);await dialog.getByRole('button',{name:'المناقشة (٠)',exact:true}).click();await dialog.getByLabel('إضافة تعليق').fill('تعليق أدمن على مهمة زميل');await dialog.getByRole('button',{name:'إرسال التعليق',exact:true}).click();await dialog.getByText('تعليق أدمن على مهمة زميل',{exact:true}).waitFor();await admin.context.close();report.scenarios.push('admin sees another member task, cannot edit, can comment');
 assert.equal(report.runtimeErrors.length,0);assert.equal(report.unexpectedWrites.length,0);assert.equal(report.accessibility.filter(v=>['critical','serious'].includes(v.impact)).length,0);
 await writeFile(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){if(currentPage){await currentPage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error((await currentPage.locator('body').innerText()).slice(0,7000));console.error(await currentPage.evaluate(()=>Object.keys(localStorage)));}throw error;}finally{await browser.close();await db.close();}
