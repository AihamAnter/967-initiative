// Local browser integration tests. Every Supabase request is intercepted, and
// every ranking mutation is handled by an in-memory browser-route fixture.
// This script never contacts a real database or ranking source.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {defaultRankingIndicators} from '../lib/rankingCatalog.js';

const require = createRequire(path.resolve('.audit-tools/package.json'));
const {chromium} = require('playwright');
const {default:AxeBuilder} = require('@axe-core/playwright');
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3000';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Admin fixtures are restricted to a local server.');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(supabaseUrl, 'Run with --env-file=.env.local or supply the public Supabase URL. No key is printed or transmitted.');
const supabaseOrigin = new URL(supabaseUrl).origin;
const userId = '11111111-1111-4111-8111-111111111111';
const user = {id:userId, aud:'authenticated', role:'authenticated', email:'ranking-qa@example.invalid', user_metadata:{full_name:'حساب اختبار محلي'}, app_metadata:{provider:'email', providers:['email']}};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:userId,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})}.local-browser-fixture`;
const session = {access_token:token, refresh_token:'local-fixture-not-a-real-token', token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user};
const idFor = index => `22222222-2222-4222-8222-${String(index).padStart(12,'0')}`;
let revision = 0;
const timestamp = () => new Date(Date.UTC(2026,9,17,10,0,revision++)).toISOString();
const snapshot = () => ({updatedAt:timestamp(), fromYear:2019, toYear:2023, countryCount:180, valueCount:540, latestYemenYear:2022, sourceUpdatedAt:'2026-10-01'});
const state = {
  indicators:defaultRankingIndicators.map((row,index)=>({...row,id:idFor(index+1),is_published:index<39,updated_at:timestamp(),snapshot:snapshot()})),
  setupRequired:false, mutations:[], refreshCalls:[], getCalls:0, externalBlocked:[], directDatabaseWrites:[],
  nextSaveStatus:null, nextRefreshStatus:null, refreshDelay:0, activeRefresh:0, maxActiveRefresh:0,
};
assert.equal(state.indicators.length,40);
const report = {checkedAt:new Date().toISOString(),base,mode:'fully intercepted browser fixtures',productionWrites:0,tests:[]};
const browser = await chromium.launch({headless:true, executablePath:process.env.AUDIT_CHROME_PATH || path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
const context = await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
const waitUntil = async predicate => {const until=Date.now()+15000;while(!predicate()){assert.ok(Date.now()<until,'Timed out waiting for browser fixture state.');await pause(20);}};
const json = (route,status,body) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const getData = () => ({indicators:state.setupRequired ? defaultRankingIndicators : state.indicators,library:defaultRankingIndicators,setupRequired:state.setupRequired,mode:state.setupRequired?'library':'database'});

await context.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,value:session});
await context.route('**/*', async route => {
  const request=route.request(),url=new URL(request.url());
  if(url.origin===supabaseOrigin){
    if(url.pathname.startsWith('/auth/v1/')) return json(route,200,url.pathname.endsWith('/user')?user:session);
    if(request.method()!=='GET'&&request.method()!=='HEAD'){
      state.directDatabaseWrites.push({path:url.pathname,method:request.method()});return json(route,403,{message:'Direct writes disabled in the local browser test.'});
    }
    if(url.pathname.endsWith('/editors')){
      const row={user_id:userId,role:'admin'};
      return json(route,200,(request.headers().accept||'').includes('vnd.pgrst.object')?row:[row]);
    }
    return json(route,200,[]);
  }
  if(url.origin!==new URL(base).origin){state.externalBlocked.push(url.origin);return route.abort('blockedbyclient');}
  if(url.pathname==='/api/admin/rankings'&&request.method()==='GET'){
    state.getCalls++;return json(route,200,getData());
  }
  if(url.pathname==='/api/admin/rankings'&&request.method()==='POST'){
    const body=request.postDataJSON();state.mutations.push({type:'save',body});
    if(state.nextSaveStatus){const status=state.nextSaveStatus;state.nextSaveStatus=null;if(status===503)state.setupRequired=true;return json(route,status,{error:status===409?'تعارض تحديث من جلسة أخرى.':'تهيئة جداول الترتيب مطلوبة قبل الحفظ.'});}
    if(state.setupRequired)return json(route,503,{error:'تهيئة التخزين مطلوبة.'});
    const original=state.indicators.find(row=>row.id===body.indicator.id);
    if(original&&body.expectedUpdatedAt!==original.updated_at)return json(route,409,{error:'تعارض تحديث.'});
    const saved={...original,...body.indicator,id:original?.id||idFor(100+state.indicators.length),updated_at:timestamp(),snapshot:original?.code===body.indicator.code?original.snapshot:null};
    state.indicators=original?state.indicators.map(row=>row.id===saved.id?saved:row):[...state.indicators,saved];
    return json(route,200,{ok:true,indicator:saved});
  }
  if(url.pathname==='/api/admin/rankings/refresh'&&request.method()==='POST'){
    const {id}=request.postDataJSON();state.refreshCalls.push(id);state.mutations.push({type:'refresh',id});
    state.activeRefresh++;state.maxActiveRefresh=Math.max(state.maxActiveRefresh,state.activeRefresh);
    try{
      if(state.refreshDelay)await pause(state.refreshDelay);
      if(state.nextRefreshStatus){const status=state.nextRefreshStatus;state.nextRefreshStatus=null;return json(route,status,{error:'تعذر الوصول إلى مصدر البيانات. بقيت اللقطة السابقة محفوظة.'});}
      const row=state.indicators.find(item=>item.id===id);if(!row)return json(route,404,{error:'المؤشر غير موجود.'});
      const updated={...row,snapshot:snapshot()};state.indicators=state.indicators.map(item=>item.id===id?updated:item);
      return json(route,200,{ok:true,indicator:updated,snapshot:updated.snapshot});
    }finally{state.activeRefresh--;}
  }
  if(url.pathname.startsWith('/api/')&&request.method()!=='GET')return json(route,403,{error:'Unmocked mutation blocked by local QA.'});
  return route.continue();
});

const scenario = async (name,run) => {try{await run();report.tests.push({name,pass:true});}catch(error){report.tests.push({name,pass:false,error:error.message});throw error;}};
const editor=page.locator('section[aria-labelledby$="-editor"]');
const list=page.locator('section[aria-labelledby$="-list"]');
const rows=()=>list.locator('article');
let created;

try {
  await scenario('Synthetic local admin session; no real auth or writes; 39 published plus one draft',async()=>{
    await page.goto(base+'/admin',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/ترتيب/}).first().click();
    await page.getByRole('heading',{name:'إدارة ترتيب اليمن عالمياً',exact:true}).waitFor();
    await waitUntil(()=>state.getCalls>0);await rows().first().waitFor();
    assert.equal(await rows().count(),40);assert.equal(state.mutations.length,0);
    await list.getByRole('combobox',{name:/^حالة النشر/}).selectOption('published');assert.equal(await rows().count(),39);
    await list.getByRole('combobox',{name:/^حالة النشر/}).selectOption('draft');assert.equal(await rows().count(),1);
    await list.getByRole('combobox',{name:/^حالة النشر/}).selectOption('all');
  });
  await scenario('Search, domain filters, empty results and recovery work',async()=>{
    await list.getByRole('combobox',{name:/^المجال/}).selectOption('economy');assert.equal(await rows().count(),4);
    await list.getByLabel('البحث',{exact:true}).fill('لايوجدهذاالمؤشر');await list.getByText('لا توجد مؤشرات تطابق البحث والفلاتر.').waitFor();
    await list.getByRole('button',{name:'مسح البحث والفلاتر'}).click();assert.equal(await rows().count(),40);
  });
  await scenario('Editor saves all fields through protected API with optimistic version',async()=>{
    const initial=state.indicators[0];
    await page.getByRole('button',{name:'تعديل '+initial.name,exact:true}).click();
    await editor.getByLabel('اسم المؤشر بالعربية').fill(initial.name+' — مراجعة محلية');
    await editor.getByRole('combobox',{name:/^المجال/}).selectOption('education');
    await editor.getByLabel('وحدة القياس',{exact:true}).fill('وحدة اختبار محلية');
    await editor.getByLabel('التوضيح وحدود المقارنة').fill('توضيح محفوظ في fixture محلي فقط، دون الكتابة إلى قاعدة بيانات.');
    await editor.getByLabel('ترتيب القيم — من يحتل المرتبة الأولى؟').selectOption('asc');
    await editor.getByRole('combobox',{name:/^دلالة القيمة/}).selectOption('lower');
    await editor.getByLabel('ترتيب العرض في المنصة').fill('7');
    await editor.getByLabel('نشر المؤشر في الصفحة العامة').uncheck();
    await editor.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
    await page.getByRole('status').filter({hasText:'تم حفظ المؤشر كمسودة'}).waitFor();
    const saved=state.indicators.find(row=>row.id===initial.id),body=state.mutations.at(-1).body;
    assert.equal(body.expectedUpdatedAt,initial.updated_at);assert.equal(saved.direction,'asc');assert.equal(saved.better,'lower');assert.equal(saved.category,'education');assert.equal(saved.unit,'وحدة اختبار محلية');assert.equal(saved.display_order,7);assert.equal(saved.is_published,false);
  });
  await scenario('Create draft and publish/unpublish without direct database writes',async()=>{
    await editor.getByRole('button',{name:'مؤشر جديد',exact:true}).click();
    await editor.getByLabel('اسم المؤشر بالعربية').fill('معيار اختبار محلي جديد');
    await editor.getByLabel('الرابط المختصر',{exact:true}).fill('qa-ranking-draft');
    await editor.getByLabel('رمز المؤشر في البنك الدولي WDI').fill('NY.GDP.PCAP.KD');
    await editor.getByLabel('وحدة القياس',{exact:true}).fill('دولار ثابت للفرد');
    await editor.getByRole('button',{name:'حفظ المسودة',exact:true}).click();
    await page.getByRole('status').filter({hasText:'تم حفظ المؤشر كمسودة'}).waitFor();
    created=state.indicators.find(row=>row.slug==='qa-ranking-draft');assert.ok(created);assert.equal(created.is_published,false);
    await page.getByRole('button',{name:'نشر '+created.name,exact:true}).click();await page.getByRole('status').filter({hasText:'تم نشر المؤشر في القائمة العامة'}).waitFor();
    assert.equal(state.indicators.find(row=>row.id===created.id).is_published,true);
    await page.getByRole('button',{name:'إخفاء '+created.name,exact:true}).click();await page.getByRole('status').filter({hasText:'أُخفي المؤشر'}).waitFor();
    assert.equal(state.indicators.find(row=>row.id===created.id).is_published,false);
  });
  await scenario('Single refresh displays saved coverage and Yemen year after confirmed response',async()=>{
    await page.getByRole('button',{name:'تحديث مصدر '+created.name,exact:true}).click();
    await page.getByRole('status').filter({hasText:'حُفظت لقطة المصدر'}).waitFor();
    await editor.getByRole('heading',{name:'لقطة المصدر المحفوظة لهذا المؤشر'}).waitFor();
    assert.equal(state.refreshCalls.at(-1),created.id);assert.ok((await editor.innerText()).includes('أحدث سنة لليمن'));
    assert.ok((await editor.innerText()).includes('١٨٠')||(await editor.innerText()).includes('180'));
  });
  await scenario('409 retains unsaved edits and explicit reload adopts stored version',async()=>{
    const current=state.indicators.find(row=>row.id===created.id);
    await editor.getByLabel('اسم المؤشر بالعربية').fill('مسودة تعارض محلية');state.nextSaveStatus=409;
    await editor.getByRole('button',{name:'حفظ المسودة',exact:true}).click();await page.getByRole('alert').filter({hasText:'تغيّر هذا المؤشر في جلسة أخرى'}).waitFor();
    assert.equal(await editor.getByLabel('اسم المؤشر بالعربية').inputValue(),'مسودة تعارض محلية');assert.equal(state.indicators.find(row=>row.id===created.id).name,current.name);
    await editor.getByRole('button',{name:'استبدال المسودة بالنسخة المحفوظة'}).click();await page.getByRole('status').filter({hasText:'حُمّلت النسخة المحفوظة'}).waitFor();
    assert.equal(await editor.getByLabel('اسم المؤشر بالعربية').inputValue(),current.name);
  });
  await scenario('Sequential refresh continues after upstream failure and cancellation stops future requests',async()=>{
    await list.getByRole('combobox',{name:/^المجال/}).selectOption('education');
    const count=await rows().count();assert.ok(count>2);state.nextRefreshStatus=503;
    await list.getByRole('button',{name:/تحديث المؤشرات المعروضة/}).click();await page.getByText('اكتمل الطابور.',{exact:true}).waitFor();
    assert.ok(await list.getByText('تفاصيل التحديثات غير المكتملة').isVisible());assert.equal(state.maxActiveRefresh,1);
    const before=state.refreshCalls.length;state.refreshDelay=500;
    await list.getByRole('button',{name:/تحديث المؤشرات المعروضة/}).click();await waitUntil(()=>state.refreshCalls.length>before);
    await list.getByRole('button',{name:'إيقاف بعد الطلب الجاري'}).click();await page.getByText('توقف الطابور بناءً على طلبك.',{exact:true}).waitFor();
    assert.equal(state.refreshCalls.length,before+1);assert.equal(state.maxActiveRefresh,1);state.refreshDelay=0;
    await list.getByRole('combobox',{name:/^المجال/}).selectOption('all');
  });
  await scenario('503 keeps draft; missing schema preview disables writes with accurate setup banner',async()=>{
    await editor.getByLabel('اسم المؤشر بالعربية').fill('مسودة محفوظة في الواجهة عند تعذر التخزين');state.nextSaveStatus=503;
    await editor.getByRole('button',{name:'حفظ المسودة',exact:true}).click();await page.getByRole('alert').filter({hasText:'تهيئة جداول الترتيب'}).waitFor();
    assert.equal(await editor.getByLabel('اسم المؤشر بالعربية').inputValue(),'مسودة محفوظة في الواجهة عند تعذر التخزين');
    await page.getByRole('button',{name:'إعادة تحميل القائمة',exact:true}).click();await page.getByText('تهيئة التخزين مطلوبة قبل الحفظ أو تحديث المصدر',{exact:true}).waitFor();
    assert.equal(await editor.getByRole('button',{name:'حفظ المسودة',exact:true}).isDisabled(),true);
    assert.equal(await list.getByRole('button',{name:/تحديث المؤشرات المعروضة/}).isDisabled(),true);
    assert.ok((await page.locator('main').innerText()).includes('supabase/yemen-ranking.sql'));
    assert.equal(await editor.getByLabel('اسم المؤشر بالعربية').inputValue(),'مسودة محفوظة في الواجهة عند تعذر التخزين');
  });
  await scenario('Library selection creates an unsaved draft; mobile layout stays within viewport',async()=>{
    state.setupRequired=false;await page.getByRole('button',{name:'إعادة تحميل القائمة',exact:true}).click();await waitUntil(()=>!state.setupRequired);await page.getByText('تهيئة التخزين مطلوبة قبل الحفظ أو تحديث المصدر',{exact:true}).waitFor({state:'hidden'});
    await editor.getByRole('button',{name:'إلغاء التعديلات',exact:true}).click();
    state.indicators=state.indicators.filter(row=>row.slug!=='inflation');await page.getByRole('button',{name:'إعادة تحميل القائمة',exact:true}).click();await rows().last().waitFor();
    const before=state.mutations.length;
    await page.getByText(/مكتبة معايير جاهزة للمراجعة/).click();
    const library=page.locator('details').filter({has:page.locator('summary',{hasText:'مكتبة معايير جاهزة للمراجعة'})});
    await library.getByLabel('البحث في المكتبة').fill('FP.CPI.TOTL.ZG');
    await library.getByRole('button',{name:'استخدام في مسودة جديدة'}).click();
    assert.equal(await editor.getByLabel('رمز المؤشر في البنك الدولي WDI').inputValue(),'FP.CPI.TOTL.ZG');assert.equal(await editor.getByLabel('نشر المؤشر في الصفحة العامة').isChecked(),false);assert.equal(state.mutations.length,before);
    await page.setViewportSize({width:390,height:900});await pause(100);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  });
  await scenario('Authenticated editor has no serious or critical automated accessibility violations',async()=>{
    const scan=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    report.accessibility={violations:scan.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.length})),passes:scan.passes.length};
    assert.deepEqual(scan.violations.filter(item=>['serious','critical'].includes(item.impact)).map(item=>item.id),[]);
  });
  assert.deepEqual(state.directDatabaseWrites,[]);
  report.noImplicitWrites=true;report.directDatabaseWrites=state.directDatabaseWrites.length;report.maximumConcurrentRefreshRequests=state.maxActiveRefresh;
} catch(error) {report.error=error.message;process.exitCode=1;}
finally {
  report.completedAt=new Date().toISOString();report.passed=report.tests.filter(row=>row.pass).length;report.failed=report.tests.filter(row=>!row.pass).length;
  await mkdir('docs/audit/evidence',{recursive:true});
  await page.screenshot({path:'docs/audit/evidence/ranking-admin.png',fullPage:false}).catch(()=>{});
  if(!report.failed&&await editor.count()){
    await page.setViewportSize({width:1440,height:1000});
    await editor.evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:'docs/audit/evidence/ranking-admin-desktop.png',fullPage:false}).catch(()=>{});
  }
  await writeFile('docs/audit/evidence/ranking-admin.json',JSON.stringify(report,null,2));
  await browser.close();console.log(JSON.stringify(report,null,2));
}
