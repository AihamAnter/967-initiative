// Local-only UI QA. Temporary fixture rows are restored in finally; never use production.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const require=createRequire(path.resolve('.audit-tools/package.json'));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const base='http://127.0.0.1:3117',fixture='http://127.0.0.1:3417';
const out=path.resolve('docs/audit/prelaunch-fixes-2026-10/evidence');await mkdir(out,{recursive:true});
const local=async(route,body)=>{const r=await fetch(fixture+route,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();};
const state=await local('/fixture/state');assert.equal(state.production,false);
const rest=async(table,method='GET',body,query='')=>{const r=await fetch(fixture+'/rest/v1/'+table+query,{method,headers:{Authorization:'Bearer local-fixture-service','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,await r.clone().text());return r.json();};
const browser=await chromium.launch({headless:true,executablePath:process.env.AUDIT_CHROME_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const only=process.env.UX_ONLY;
const report=only?JSON.parse(await readFile(path.join(out,'ux-browser-results.json'),'utf8')):{environment:'Local Next dev HTTP and isolated PostgreSQL fixture. External traffic blocked.',scenarios:[],layouts:[],accessibility:[],runtimeErrors:[],limitations:['Real external video playback and email delivery were not tested.','Chromium only; no physical device or screen reader.']};
const contexts=[],cleanups=[];
const scenario=async(name,run)=>{if(only&&!only.split(',').some(value=>name.includes(value)))return;report.scenarios=report.scenarios.filter(x=>x.name!==name);try{await run();report.scenarios.push({name,pass:true});}catch(error){report.scenarios.push({name,pass:false,error:error.message});}console.log(JSON.stringify(report.scenarios.at(-1)));await writeFile(path.join(out,'ux-browser-results.json'),JSON.stringify(report,null,2));};
async function contextFor(user){const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});contexts.push(context);
 if(user){const session=await local('/fixture/session',{user_id:user});await context.addInitScript(session=>localStorage.setItem('sb-127-auth-token',JSON.stringify(session)),session);}
 await context.route('**/*',route=>[base,fixture].includes(new URL(route.request().url()).origin)?route.continue():route.abort('blockedbyclient'));
 await context.routeWebSocket('**/realtime/**',socket=>socket.close());
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',error=>report.runtimeErrors.push({url:page.url(),message:error.message}));return {context,page};}
async function go(page,route){const response=await page.goto(base+route);if(response)assert.equal(response.status(),200,route);await page.locator('main h1').first().waitFor();}
async function capture(page,name){report.layouts=report.layouts.filter(x=>x.name!==name);report.accessibility=report.accessibility.filter(x=>x.name!==name);await page.evaluate(()=>window.scrollTo(0,0));await page.addStyleTag({content:'nextjs-portal{display:none!important}'});for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(120);const layout=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));report.layouts.push({name,width,...layout,pass:layout.scroll<=width+1});assert.ok(layout.scroll<=width+1,`${name} overflow ${width}: ${layout.scroll}`);await page.screenshot({path:path.join(out,`after-${name}-${width}.png`),fullPage:true});}const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));report.accessibility.push({name,violations});assert.equal(violations.length,0,`${name} axe ${JSON.stringify(violations)}`);}
const {page,context}=await contextFor();
try {
 await scenario('U-01 / U-02: focused home, one main contribution action, editable project status and all sections reachable',async()=>{
  await go(page,'/');assert.equal(await page.locator('.participate-banner').count(),1);assert.equal(await page.locator('.home-map-image').count(),1);
  assert.ok(await page.locator('.home-latest').count());assert.equal(await page.locator('.quick-grid a').count(),6);
  await capture(page,'home');await page.locator('summary').filter({hasText:'عن المبادرة ومشاريع 967'}).click();await page.locator('.home-projects').waitFor({state:'visible'});assert.equal(await page.locator('.home-projects a[href="/debates"]').count(),1);
  await go(page,'/account');await go(page,'/#projects');await page.locator('#projects').waitFor({state:'visible'});
  await go(page,'/account');await go(page,'/#about');await page.locator('#about').waitFor({state:'visible'});
 });
 await scenario('U-03: account explains anonymous browsing before login',async()=>{await go(page,'/account');await page.getByText('يمكنك تصفح 967 دون حساب.',{exact:false}).waitFor();await capture(page,'account-guest');});
 await scenario('C-01: one magazine issue is shown only in spotlight',async()=>{await go(page,'/magazine');assert.equal(await page.locator('.issue-spotlight').count(),1);assert.equal(await page.locator('.issue-card').count(),0);assert.equal(await page.locator('.archive-section').count(),0);await capture(page,'magazine-single');});
 await scenario('C-01: multiple issues keep newest outside archive and retain every earlier issue',async()=>{
  const existing=await rest('issues'),latest=existing.find(i=>i.id===state.ids.issue);assert.ok(latest);
  for(let i=0;i<2;i++){const id=randomUUID();cleanups.push(()=>rest('issues','DELETE',null,'?id=eq.'+id));await rest('issues','POST',{...latest,id,slug:'prelaunch-archive-'+id,number:97+i,issue_date:`2026-0${8+i}-01`,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});}
  await go(page,'/magazine');assert.equal(await page.locator('.issue-spotlight').count(),1);assert.equal(await page.locator('.issue-card').count(),2);assert.equal(await page.locator('.issue-card[href="/magazine/inline-issue"]').count(),0);await capture(page,'magazine-multiple');
 });
 await scenario('B-01 / C-04: company correction retains context through failure/success and returns to the company',async()=>{
  await go(page,'/yemeni-products/inline-company');await capture(page,'company');await page.getByRole('link',{name:'تحديث بيانات الشركة',exact:false}).click();await page.locator('#contribution-form').waitFor();assert.equal(await page.locator('[name="type"]').inputValue(),'تصحيح معلومة');assert.equal(await page.locator('[name="referencePath"]').inputValue(),'/yemeni-products/inline-company');await page.locator('.contribution-reference strong').waitFor();
  await page.locator('[name="name"]').fill('مراجع محلي');await page.locator('[name="email"]').fill('ux@example.invalid');const text='تصحيح محلي للتحقق من حفظ سياق المنشأة وعدم فقدان النص.';await page.locator('textarea').fill(text);
  await page.route('**/api/contact',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'فشل محلي مقصود'})}));await page.locator('button[type="submit"]').click();await page.getByText('فشل محلي مقصود').waitFor();assert.equal(await page.locator('textarea').inputValue(),text);await page.unroute('**/api/contact');
  let payload;await page.route('**/api/contact',route=>{payload=route.request().postDataJSON();return route.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'});});await page.locator('button[type="submit"]').click();await page.getByText('تم استلام رسالتك للمراجعة. شكراً لمساهمتك.').waitFor();assert.equal(payload.referencePath,'/yemeni-products/inline-company');assert.ok(payload.referenceTitle);await capture(page,'correction-form');await page.getByRole('link',{name:'العودة إلى صفحة المرجع'}).click();await page.waitForURL('**/yemeni-products/inline-company');await page.unroute('**/api/contact');
 });
 await scenario('B-02: professional shows email and a clear state when contact channels are absent',async()=>{
  const [original]=await rest('professionals','GET',null,'?id=eq.'+state.ids.professional);cleanups.push(()=>rest('professionals','PATCH',{phone:original.phone,whatsapp:original.whatsapp,email:original.email},'?id=eq.'+state.ids.professional));
  await rest('professionals','PATCH',{phone:null,whatsapp:null,email:'local@fixture.test'},'?id=eq.'+state.ids.professional);await go(page,'/professionals/inline-professional');assert.equal(await page.locator('.professional-profile-actions a[href="mailto:local@fixture.test"]').count(),1);
  await rest('professionals','PATCH',{phone:null,whatsapp:null,email:null},'?id=eq.'+state.ids.professional);await go(page,'/professionals/inline-professional');await page.getByText('التواصل المباشر غير متاح من خلال هذا الملف حالياً.').waitFor();assert.equal(await page.locator('.professional-profile-actions a[href^="tel:"],.professional-profile-actions a[href^="mailto:"],.professional-profile-actions a[href^="https://wa.me"]').count(),0);await capture(page,'professional-no-contact');await go(page,'/professionals');await page.locator('.professional-card').filter({hasText:'مهني محلي للاختبار'}).getByText('التواصل المباشر غير متاح حالياً').waitFor();
 });
 await scenario('C-03: external platform fallback is explicit; YouTube does not load an iframe before activation',async()=>{
  const [work]=await rest('works','GET',null,'?id=eq.'+state.ids.work);cleanups.push(()=>rest('works','PATCH',{external_url:work.external_url},'?id=eq.'+state.ids.work));
  await go(page,'/works/inline-work');assert.equal(await page.locator('.media-frame iframe').count(),0);await page.getByRole('button',{name:/محاولة تشغيل العمل هنا/}).waitFor();assert.equal(await page.locator('.media-viewer-footer a').getAttribute('href'),work.external_url);
  await rest('works','PATCH',{external_url:'https://example.test/platform-video'},'?id=eq.'+state.ids.work);await go(page,'/works/inline-work');await page.getByRole('link',{name:'فتح الفيديو على المنصة الأصلية'}).waitFor();assert.equal(await page.locator('.media-play').count(),0);await capture(page,'video-external');
 });
 await scenario('K-05: atlas remains geographic while the figures directory keeps filtered deep links',async()=>{
  await go(page,'/yemen-map?region=YE13#map');await page.locator('.ymap-canvas > svg').waitFor();
  assert.equal(await page.locator('.figures-directory-shell').count(),0);
  await go(page,'/yemeni-figures?region=YE13');await page.locator('.yfigures-filters').waitFor();
  assert.equal(await page.locator('.yfigures-filters select').nth(1).inputValue(),'YE13');
  await capture(page,'figures-directory');
  await go(page,'/yemen-map#yemeni-figures');await page.waitForURL('**/yemeni-figures');
 });
 await scenario('K-06: search states scope, PDF and expanded biography limitations and retains filters',async()=>{
  await go(page,'/search?q=zzzzzzzzzzzz&type=works&mode=phrase&scope=title&exclude=abc');await page.getByText('لا يشمل البحث النص الكامل داخل ملفات PDF',{exact:false}).waitFor();assert.equal(await page.locator('[name="scope"]').inputValue(),'title');assert.equal(await page.locator('[name="mode"]').inputValue(),'phrase');assert.equal(await page.locator('[name="exclude"]').inputValue(),'abc');assert.equal(await page.locator('.search-result').count(),0);await capture(page,'search-empty');
 });
 const member=await contextFor(state.roles.member);
 await scenario('S-01: account names email reset accurately and reset form shows success and service error',async()=>{
  await go(member.page,'/account');await member.page.getByRole('link',{name:'إعادة تعيين كلمة المرور عبر البريد'}).waitFor();await member.page.getByRole('link',{name:'إعادة تعيين كلمة المرور عبر البريد'}).click();await member.page.waitForURL('**/forgot-password');
  await member.page.route('**/auth/v1/recover*',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));await member.page.locator('[name="email"]').fill('member@example.invalid');await member.page.locator('form').first().getByRole('button',{name:'استعادة كلمة المرور',exact:true}).click();await member.page.getByText('إذا كان البريد مرتبطاً بحساب، ستصلك رسالة لاستعادة كلمة المرور.').waitFor();await member.page.unroute('**/auth/v1/recover*');
  await member.page.route('**/auth/v1/recover*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"msg":"Local service failure"}'}));await member.page.locator('[name="email"]').fill('member@example.invalid');await member.page.locator('form').first().getByRole('button',{name:'استعادة كلمة المرور',exact:true}).click();await member.page.locator('.feedback[role="alert"]').waitFor();await member.page.unroute('**/auth/v1/recover*');await capture(member.page,'password-reset');
 });
 const manager=await contextFor(state.roles.management);
 await scenario('U-02: editor saves project status through existing settings and public search follows the saved value',async()=>{
  const originals=await rest('site_settings','GET',null,'?key=in.(site_content,home_marquee_items)');
  for(const key of ['site_content','home_marquee_items']){const original=originals.find(row=>row.key===key);cleanups.push(()=>original?rest('site_settings','PATCH',{value:original.value,updated_at:original.updated_at},'?key=eq.'+key):rest('site_settings','DELETE',null,'?key=eq.'+key));}
  await go(manager.page,'/admin');await manager.page.locator('.admin-tabs').getByRole('button',{name:'الإعدادات',exact:true}).click();const status=manager.page.getByLabel('حالة مشروع مناظرات 967',{exact:true});await status.waitFor();await status.fill('حالة محلية قيد التحقق');
  const validity=await manager.page.locator('.site-settings-form').evaluate(form=>({valid:form.checkValidity(),invalid:[...form.querySelectorAll('input,textarea')].filter(el=>!el.checkValidity()).map(el=>({label:el.closest('label')?.innerText,message:el.validationMessage}))}));assert.ok(validity.valid,JSON.stringify(validity));
  await manager.page.getByRole('button',{name:'حفظ إعدادات الموقع',exact:true}).click();try{await manager.page.getByText('تم حفظ إعدادات الموقع.',{exact:false}).waitFor();}catch(error){throw Error(error.message+' '+await manager.page.locator('.site-settings-panel').innerText());}
    const savedSettings=await rest('site_settings','GET',null,'?key=eq.site_content');assert.equal(savedSettings[0]?.value?.debatesProjectStatus,'حالة محلية قيد التحقق','Editor save persisted the new project status');
    await go(page,'/#projects');const savedBadge=page.locator('.home-projects .status-badge').filter({hasText:'حالة محلية قيد التحقق'});try{await savedBadge.waitFor();}catch(error){throw Error(error.message+' '+JSON.stringify(await page.locator('.home-projects').evaluate(el=>({text:el.textContent,disclosureOpen:el.closest('details')?.open,hash:location.hash}))));}
  await go(page,'/search?q='+encodeURIComponent('حالة محلية قيد التحقق')+'&type=pages');await page.locator('.search-result').filter({hasText:'مشاريعنا'}).waitFor();
 });
 await scenario('S-05: task reminders explain their scope and attention links lead to actual overdue tasks',async()=>{
  const session=await local('/fixture/session',{user_id:state.roles.management});const api=async(body)=>{const r=await fetch(base+'/api/admin/tasks',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok,await r.clone().text());return r.json();};
  const created=await api({action:'create',data:{title:'S-05 مهمة متأخرة محلية',assigned_to:state.roles.management,due_at:'2020-01-01T12:00:00Z',due_timezone:'UTC'}});cleanups.push(()=>api({action:'delete',id:created.id,revision:1}));
  await go(manager.page,'/admin/tasks');await manager.page.getByText('التنبيهات داخل مركز المهام فقط.',{exact:false}).waitFor();const metric=manager.page.getByRole('button',{name:/المهام المتأخرة التي تحتاج متابعة:/});await metric.waitFor();await metric.click();await manager.page.getByRole('button',{name:'S-05 مهمة متأخرة محلية',exact:true}).first().waitFor();await capture(manager.page,'tasks-reminders');
 });
} finally {
 for(const cleanup of cleanups.reverse())await cleanup().catch(error=>report.scenarios.push({name:'Restore isolated fixture',pass:false,error:error.message}));
 for(const context of contexts)await context.close();await browser.close();await writeFile(path.join(out,'ux-browser-results.json'),JSON.stringify(report,null,2));
}
const failures=report.scenarios.filter(x=>!x.pass).length+report.layouts.filter(x=>!x.pass).length+report.accessibility.reduce((n,x)=>n+x.violations.length,0)+report.runtimeErrors.length;
console.log(JSON.stringify({scenarios:report.scenarios.length,passed:report.scenarios.filter(x=>x.pass).length,layouts:report.layouts.length,axeScans:report.accessibility.length,runtimeErrors:report.runtimeErrors.length,failures}));process.exitCode=failures?1:0;
