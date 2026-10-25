// Browser integration against the local PGlite fixture only.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {publicSections} from '../lib/pageVisibility.js';
const require=createRequire(path.resolve('.audit-tools/package.json')),{chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const base='http://127.0.0.1:3139',fixture='http://127.0.0.1:3439',out='.audit-tools/visual-phase-4';
const reportPath=out+'/'+(process.env.PHASE4_FEATURE_REPORT||'features-report')+'.json';
const local=async(route,body)=>{const response=await fetch(fixture+route,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});assert.ok(response.ok);return response.json();};
const state=await local('/fixture/state');assert.equal(state.production,false);
const manager=state.users.find(user=>user.role==='management'),member=state.users.find(user=>!user.role&&!user.unconfirmed),managerSession=await local('/fixture/session',{user_id:manager.id});
const browser=await chromium.launch({executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const report={scenarios:[],accessibility:[],runtimeErrors:[],externalRequests:[],production:false};
async function pageFor(session){const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});if(session)await context.addInitScript(value=>localStorage.setItem('sb-127-auth-token',JSON.stringify(value)),session);await context.route('**/*',route=>{const origin=new URL(route.request().url()).origin;if(![base,fixture].includes(origin)){report.externalRequests.push(origin);return route.abort();}return route.continue();});const page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',error=>report.runtimeErrors.push(error.message));page.on('dialog',dialog=>dialog.accept());return page;}
const admin=await pageFor(managerSession),guest=await pageFor();
const api=async(route,method='GET',data,token=managerSession.access_token)=>{const response=await admin.request.fetch(base+route,{method,headers:{Origin:base,...(token?{Authorization:'Bearer '+token}:{})},...(data?{data}:{})});return {status:response.status(),body:await response.json()};};
const run=async(name,fn)=>{if(process.env.PHASE4_CASES&&!process.env.PHASE4_CASES.split(',').some(value=>name.includes(value)))return;try{await fn();report.scenarios.push({name,passed:true});console.log('PASS '+name);}catch(error){report.scenarios.push({name,passed:false,error:error.message});console.log('FAIL '+name+' '+error.message);await admin.screenshot({path:out+'/feature-failure-'+report.scenarios.length+'.png'}).catch(()=>{});}await writeFile(reportPath,JSON.stringify(report,null,2));};
try{
 await run('visibility permissions and invalid inputs',async()=>{
  assert.equal((await api('/api/admin/page-visibility','GET',null,null)).status,401);
  const reader=await local('/fixture/session',{user_id:member.id});assert.equal((await api('/api/admin/page-visibility','GET',null,reader.access_token)).status,403);
  const current=await api('/api/admin/page-visibility');assert.equal(current.status,200);
  assert.equal((await api('/api/admin/page-visibility','PUT',{sections:{login:false},revision:current.body.revision})).status,400);
 });
 await run('hide and restore public sections through editorial UI',async()=>{
  await admin.goto(base+'/admin?tab=pages');const panel=admin.locator('.page-visibility-panel');await panel.getByRole('button',{name:'إخفاء الأعمال الإعلامية',exact:true}).waitFor();
  await panel.getByRole('button',{name:'إخفاء الأعمال الإعلامية',exact:true}).click();await panel.getByRole('button',{name:'حفظ الظهور',exact:true}).click();await panel.getByRole('status').filter({hasText:'حُفظ ظهور الأقسام'}).waitFor();
  await guest.goto(base+'/');assert.equal(await guest.locator('a[href="/works"]').count(),0);
  await guest.goto(base+'/works');await guest.getByRole('heading',{name:/غير موجودة|لم نجد/}).waitFor();
  await panel.getByRole('button',{name:'استعادة الأعمال الإعلامية',exact:true}).click();await panel.getByRole('button',{name:'حفظ الظهور',exact:true}).click();await panel.getByRole('button',{name:'إخفاء الأعمال الإعلامية',exact:true}).waitFor();await guest.goto(base+'/works');await guest.locator('#works-results').waitFor();
 });
 await run('section visibility conflicts preserve the winning revision',async()=>{
  const first=(await api('/api/admin/page-visibility')).body;
  const saved=await api('/api/admin/page-visibility','PUT',{sections:{...first.sections,magazine:false},revision:first.revision});assert.equal(saved.status,200);
  assert.equal((await api('/api/admin/page-visibility','PUT',{sections:first.sections,revision:first.revision})).status,409);
  const current=(await api('/api/admin/page-visibility')).body;assert.equal(current.sections.magazine,false);
  await guest.goto(base+'/search?q=مجلة');assert.equal(await guest.locator('#content a[href^="/magazine"]').count(),0);
  assert.equal((await api('/api/admin/page-visibility','PUT',{sections:{...current.sections,magazine:true},revision:current.revision})).status,200);
 });
 await run('hide figures independently of geographical discovery',async()=>{
  const first=(await api('/api/admin/page-visibility')).body;await api('/api/admin/page-visibility','PUT',{sections:{...first.sections,figures:false},revision:first.revision});
  await guest.goto(base+'/yemen-map');await guest.locator('.ymap-canvas svg').waitFor();assert.equal(await guest.locator('#yemeni-figures').count(),0);assert.equal(await guest.locator('a[href="#yemeni-figures"]').count(),0);
  const current=(await api('/api/admin/page-visibility')).body;await api('/api/admin/page-visibility','PUT',{sections:{...current.sections,figures:true},revision:current.revision});
 });
 await run('managed page hides and restores without deleting staff or text',async()=>{
  const before=(await api('/api/admin/pages')).body,about=before.pages.find(page=>page.slug==='about');
  assert.equal((await api('/api/admin/pages','PUT',{revision:before.revision,page:{...about,isPublished:false}})).status,200);
  await guest.goto(base+'/about');await guest.getByRole('heading',{name:/غير موجودة|لم نجد/}).waitFor();
  const current=(await api('/api/admin/pages')).body,recovered=current.pages.find(page=>page.slug==='about');assert.deepEqual(recovered.team,about.team);assert.deepEqual(recovered.sections,about.sections);
  assert.equal((await api('/api/admin/pages','PUT',{revision:current.revision,page:{...recovered,isPublished:true}})).status,200);await guest.goto(base+'/about');await guest.getByRole('heading',{name:'من نحن',exact:true}).waitFor();
 });
 await run('slow visibility responses cannot overwrite a newer editorial draft',async()=>{
  const page=await pageFor(managerSession);let reads=0,releaseFirst;
  const staleReturned=new Promise(resolve=>{releaseFirst=resolve;});
  await page.route('**/api/admin/page-visibility',async route=>{if(route.request().method()!=='GET')return route.continue();const index=++reads,response=await route.fetch();if(index===1){await new Promise(resolve=>setTimeout(resolve,2500));await route.fulfill({response});releaseFirst();}else await route.fulfill({response});});
  await page.goto(base+'/admin?tab=pages');const panel=page.locator('.page-visibility-panel');await panel.getByRole('button',{name:'إخفاء الأعمال الإعلامية',exact:true}).click();assert.ok(reads>=2,'Strict Mode must exercise overlapping reads');await staleReturned;assert.equal(await panel.getByRole('button',{name:'استعادة الأعمال الإعلامية',exact:true}).count(),1);assert.equal(await panel.getByRole('button',{name:'حفظ الظهور',exact:true}).isEnabled(),true);await page.context().close();
 });
 await run('figure directory loads on demand, retries and supports direct links',async()=>{
  const page=await pageFor();let requests=0;
  await page.route('**/api/figures',route=>{requests++;return requests===1?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Local fixture outage'})}):route.continue();});
  await page.goto(base+'/yemen-map');await page.locator('.ymap-canvas svg').waitFor();assert.equal(requests,0);assert.equal(await page.locator('.yfigures-filters').count(),0);
  await page.locator('#yemeni-figures summary').click();await page.getByRole('button',{name:'إعادة تحميل الشخصيات',exact:true}).click();await page.locator('.yfigures-filters').waitFor();assert.equal(requests,2);
  await page.locator('#yemeni-figures summary').click();await page.locator('#yemeni-figures summary').click();await page.locator('.yfigures-filters').waitFor();assert.equal(requests,2);
  await page.goto(base+'/yemen-map#yemeni-figures');await page.locator('.yfigures-filters').waitFor();assert.equal(await page.locator('#yemeni-figures').evaluate(el=>el.open),true);
  await page.goto(base+'/yemen-map?region=YE19#map');await page.locator('.yfigures-filters').waitFor();assert.equal(await page.locator('.yfigures-filters select').nth(1).inputValue(),'YE19');await page.context().close();
 });
 await run('district editorial save, sources, public map and search',async()=>{
  await admin.goto(base+'/admin?tab=map&region=district&item=YE1908');const editor=admin.locator('.district-profile-editor');await editor.getByRole('heading',{name:'مديرية شبام',exact:true}).waitFor();
  const token='اقتصاد شبام موثق للاختبار المحلي '+Date.now();await editor.getByLabel('الاقتصاد وسبل العيش',{exact:true}).fill(token);await editor.getByLabel('المساحة كم²',{exact:true}).fill('123.5');await editor.getByRole('button',{name:'نشر التعديلات',exact:true}).click();await editor.getByRole('status').filter({hasText:'حُفظ ملف المديرية'}).waitFor();
  const saved=await api('/api/admin/districts?id=YE1908');assert.equal(saved.status,200);assert.equal(saved.body.item.economy,token);assert.ok(saved.body.item.sources.length>=2);
  const publicData=await guest.request.get(base+'/api/map-profiles');assert.equal((await publicData.json()).profiles.YE1908.economy,token);
  await guest.goto(base+'/yemen-map?district=YE1908#map');await guest.locator('.ymap-info-body').getByText(token,{exact:true}).waitFor();assert.equal(await guest.locator('.ymap-info-body a[href="#yemeni-figures"]').count(),0);assert.equal(await guest.locator('.ymap-info-field').filter({hasText:'المساحة كم²'}).locator('strong').innerText(),new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(123.5));
  await guest.goto(base+'/search?q='+encodeURIComponent(token));await guest.locator('.search-results a[href*="district=YE1908"]').waitFor();
 });
 await run('debate cover remains visible during delayed, successful and failed image loads',async()=>{
  const endpoint=fixture+'/rest/v1/debates?id=eq.'+state.live,headers={Authorization:'Bearer fixture-service','Content-Type':'application/json'},before=await fetch(endpoint,{headers}).then(r=>r.json()),url='https://fixture.invalid/phase4-cover.png';
  const update=async cover=>{const response=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify({cover_url:cover})});assert.ok(response.ok);};
  const page=await pageFor();let released=false,requested;const pending=[],started=new Promise(resolve=>{requested=resolve;});
  const serve=route=>route.fulfill({body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="teal"/></svg>',contentType:'image/svg+xml',headers:{'Cache-Control':'no-store'}});
  try{
   await update(url);await page.route(url,route=>{if(released)return serve(route);pending.push(route);requested();});await page.goto(base+'/debates/local-external-live',{waitUntil:'domcontentloaded'});await started;
   const cover=page.locator('.debate-recording-preview .debate-cover');await cover.locator('.debate-cover-placeholder').waitFor();assert.equal(await cover.getAttribute('data-cover-state'),'loading');
   released=true;await Promise.all(pending.map(serve));await page.waitForFunction(()=>document.querySelector('.debate-recording-preview .debate-cover')?.dataset.coverState==='image',null,{timeout:10000});assert.equal(await cover.locator('.debate-cover-placeholder').isVisible(),false);
   await update(url+'?failed=1');await page.unroute(url);await page.route(url+'?failed=1',route=>route.abort());await page.reload();await page.waitForFunction(()=>document.querySelector('.debate-recording-preview .debate-cover')?.dataset.coverState==='fallback',null,{timeout:10000});assert.equal(await cover.locator('.debate-cover-placeholder').isVisible(),true);
   for(const width of [320,1440]){await page.setViewportSize({width,height:1000});const rect=await cover.locator('.debate-logo').boundingBox();assert.ok(rect.width<=129);assert.ok(Math.abs(rect.width-rect.height)<2);}
  }catch(error){const state=await page.locator('.debate-recording-preview .debate-cover').evaluate(el=>({state:el.dataset.coverState,images:[...el.querySelectorAll('img')].map(img=>({loaded:img.complete,width:img.naturalWidth,src:img.getAttribute('src')}))})).catch(()=>null);throw Error(error.message+' '+JSON.stringify(state));}finally{await update(before[0].cover_url);await page.context().close();}
 });
 await run('district conflicts, unknown associations and incomplete numeric claims',async()=>{
  const first=(await api('/api/admin/districts?id=YE1908')).body;
  assert.equal((await api('/api/admin/districts?id=YE1908','PUT',{revision:first.revision,profile:{...first.item,history:'الفائز في تعارض الاختبار المحلي'}})).status,200);
  assert.equal((await api('/api/admin/districts?id=YE1908','PUT',{revision:first.revision,profile:first.item})).status,409);
  const current=(await api('/api/admin/districts?id=YE1908')).body;
  for(const patch of [{figure_ids:['any']},{population:200,population_year:null},{image_url:'https://example.test/unattributed.jpg'}])assert.equal((await api('/api/admin/districts?id=YE1908','PUT',{revision:current.revision,profile:{...current.item,...patch}})).status,400);
  assert.equal((await api('/api/admin/districts?id=YE9999')).status,404);
 });
 await run('editor visibility and district controls fit small screens and accessibility checks',async()=>{
  for(const [route,selector] of [['/admin?tab=pages','.page-visibility-panel'],['/admin?tab=map&region=district&item=YE1908','.district-profile-editor']]){
   await admin.goto(base+route);await admin.locator(selector).waitFor();await admin.locator(selector+' input,'+selector+' button').first().waitFor();
   for(const width of [320,390,768,1024,1440]){await admin.setViewportSize({width,height:1000});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false,route+' '+width);
    if([390,1440].includes(width)){const result=await new AxeBuilder({page:admin}).include(selector).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({route,width,scope:selector,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(node=>node.target)}))});await admin.screenshot({path:out+'/editor-'+(route.includes('map')?'district':'visibility')+'-'+width+'.png',fullPage:true});}
   }
  }
 });
 await run('auth field validation and password visibility',async()=>{
  const page=await pageFor();let signups=0;page.on('request',request=>{if(request.url().includes('/auth/v1/signup'))signups++;});await page.goto(base+'/register');await page.getByRole('button',{name:'إنشاء حساب',exact:true}).click();assert.equal(signups,0);await page.getByRole('alert').filter({hasText:'راجع الحقول'}).waitFor();
  await page.locator('input[name=password]').fill('Long-local-password!');await page.getByRole('button',{name:'إظهار كلمة المرور',exact:true}).click();assert.equal(await page.locator('input[name=password]').getAttribute('type'),'text');assert.equal(await page.locator('input[name=password]').inputValue(),'Long-local-password!');await page.getByRole('button',{name:'إخفاء كلمة المرور',exact:true}).click();assert.equal(await page.locator('input[name=password]').getAttribute('type'),'password');await page.context().close();
 });
 await run('password recovery code, confirmation mismatch, new password login and expiry',async()=>{
  const page=await pageFor(),email='user-'+member.id[0]+'@example.test';await page.goto(base+'/forgot-password?next=%2Faccount%2Factivity');await page.locator('input[name="email"]').fill(email);await page.getByRole('button',{name:'استعادة كلمة المرور',exact:true}).click();await page.getByRole('status').filter({hasText:'إذا كان البريد'}).waitFor();
  const messages=(await local('/fixture/state')).mailbox,mail=messages.filter(message=>message.kind==='recovery'&&message.email===email).at(-1);assert.ok(mail.redirectTo.includes('/update-password?next='));const url=new URL(mail.redirectTo);url.searchParams.set('code',mail.code);await page.goto(url.href);
  await page.waitForFunction(()=>!document.querySelector('input[name=password]').disabled);await page.locator('input[name=password]').fill('Changed-local-967!');await page.locator('input[name=confirmation]').fill('Does-not-match!');await page.getByRole('button',{name:'تحديث كلمة المرور',exact:true}).click();await page.getByText('كلمتا المرور غير متطابقتين.',{exact:true}).waitFor();
  await page.locator('input[name=confirmation]').fill('Changed-local-967!');await page.getByRole('button',{name:'تحديث كلمة المرور',exact:true}).click();await page.getByRole('status').filter({hasText:'تم تحديث كلمة المرور'}).waitFor();await page.goto(base+'/account');await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await page.waitForURL(base+'/debates');await page.goto(base+'/login');await page.locator('input[name=email]').first().fill(email);await page.locator('input[name=password]').fill('Changed-local-967!');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();await page.waitForURL(base+'/account');
  await page.goto(base+'/update-password#error=access_denied&error_description=Expired');await page.getByRole('alert').filter({hasText:'افتح رابط استعادة'}).waitFor();assert.equal(await page.locator('input[name=password]').isDisabled(),true);await page.context().close();
 });
 await run('discussion design, filters, pagination and guest draft handoff',async()=>{
  await local('/fixture/arena-seed',{debate_id:state.live});const page=await pageFor();await page.goto(base+'/debates/local-external-live#discussion');await page.locator('.arena-feed[aria-busy=false]').waitFor();assert.equal(await page.locator('.arena-post').count(),20);
  await page.locator('.arena-filters button').filter({hasText:'الأسئلة'}).click();assert.equal(await page.locator('.arena-post[data-kind=question]').count(),15);await page.locator('.arena-filters button').filter({hasText:'التعليقات'}).click();await page.getByRole('button',{name:'عرض مشاركات أخرى',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.arena-post').length===35);assert.equal(await page.locator('.arena-post').count(),35);
  await page.getByRole('button',{name:'كتابة تعليق',exact:true}).click();const draft='مسودة محلية تستعيدها الجلسة دون نشر تلقائي';await page.locator('#comment-body').fill(draft);await page.locator('.arena-composer').getByRole('link',{name:'سجل الدخول',exact:true}).click();await page.waitForURL('**/login?next=*');await page.locator('input[name=email]').first().fill('user-'+member.id[0]+'@example.test');await page.locator('input[name=password]').fill('Changed-local-967!');await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();await page.waitForURL('**/debates/local-external-live?draft=*#comments');await page.waitForFunction(value=>document.querySelector('#comment-body')?.value===value,draft);assert.equal(await page.locator('.arena-post').filter({hasText:draft}).count(),0);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false);if([390,1440].includes(width)){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();report.accessibility.push({route:'discussion',width,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(node=>node.target)}))});await page.screenshot({path:out+'/discussion-seeded-'+width+'.png',fullPage:true});}}
  await page.context().close();
 });
}finally{
 await local('/fixture/setting',{key:'public_page_visibility_v1',value:{version:1,sections:Object.fromEntries(publicSections.map(section=>[section.id,true]))}});
 await writeFile(reportPath,JSON.stringify(report,null,2));await browser.close();
}
if(report.scenarios.some(item=>!item.passed)||report.runtimeErrors.length||report.accessibility.some(item=>item.violations.length))process.exitCode=1;
