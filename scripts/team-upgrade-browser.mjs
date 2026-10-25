// Execute this function through Playwright MCP, against the isolated fixture only.
// No production origin, credentials, database or user data is used.
export default async function teamUpgradeBrowser(page){
 const browser=page.context().browser(),contexts=[],evidence='C:/Users/anter/967-initiative/docs/team-collaboration-upgrade/evidence/';
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 const state=await(await page.request.get('http://127.0.0.1:3449/fixture/state')).json();check(state.production===false&&state.upgraded,'Isolated upgraded fixture required');
 const errors=[],results={origin:'http://127.0.0.1:3149',production:false,checkedAt:new Date().toISOString(),checks:[]};
 async function account(user,width=1440){
  const ctx=await browser.newContext({viewport:{width,height:1000}});contexts.push(ctx);
  const session=await(await ctx.request.post('http://127.0.0.1:3449/fixture/session',{data:{user_id:user.id}})).json();
  await ctx.addInitScript(v=>localStorage.setItem('sb-127-auth-token',JSON.stringify(v)),session);
  await ctx.route('**/*',r=>['http://127.0.0.1:3449','http://127.0.0.1:3149'].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  const request=async(method,path,data)=>{const r=await ctx.request.fetch('http://127.0.0.1:3149'+path,{method,headers:{Authorization:'Bearer '+session.access_token,Origin:'http://127.0.0.1:3149'},...(data?{data}:{})});return {status:r.status(),body:await r.json()};};
  return {ctx,p,request};
 }
 const go=(p,path)=>p.goto('http://127.0.0.1:3149'+path,{waitUntil:'domcontentloaded',timeout:60000});
 const manager=state.users.find(u=>u.role==='management'),primary=state.users[0],participant=state.users[1],third=state.users.find(u=>u.id.startsWith('7777'));
 try{
  const m=await account(manager),p=m.p;
  const w=await account(primary);await go(w.p,'/admin?tab=works');await w.p.getByLabel('العنوان',{exact:false}).first().fill('عمل بصري محلي للتحقق من السجل');await w.p.getByLabel('الرابط المختصر بالإنجليزية').fill('visual-audit-local-'+Date.now());await w.p.getByLabel('وصف العمل').fill('محتوى اصطناعي معزول أنشئ عبر واجهة التحرير.');await w.p.getByLabel('رابط العمل (يوتيوب').fill('https://example.test/local-work');await w.p.getByLabel('تاريخ النشر').fill('2026-10-25');const workCreated=w.p.waitForResponse(r=>r.url().includes('/rest/v1/works')&&r.request().method()==='POST');await w.p.getByRole('button',{name:'حفظ في المنصة كمسودة',exact:true}).click();const createdResponse=await workCreated;check(createdResponse.ok(),'UI editorial save');const createdRows=await createdResponse.json(),workId=(Array.isArray(createdRows)?createdRows[0]:createdRows).id;await w.p.getByText('تم حفظ العمل').first().waitFor();
  async function editWork(account,data){const current=await account.request('GET','/api/admin/inline?view=content&kind=work&id='+workId);check(current.status===200,'read revision');const saved=await account.request('POST','/api/admin/inline',{action:'content_save',kind:'work',id:workId,revision:current.body.revision,data});check(saved.status===200,'save editorial change');}
  for(let i=1;i<=5;i++)await editWork(w,{title:'عمل بصري محلي — مراجعة '+i});await editWork(m,{is_published:true});await editWork(w,{is_published:false});
  const audit=await w.request('GET','/api/admin/contributions?period=all');check(audit.body.summary.operations===8&&audit.body.summary.uniqueContent===1,'eight real operations must remain one content entity');
  results.checks.push('UI editorial create then five verified edits, publish/unpublish: 8 operations, one content entity');
  await go(p,'/admin/tasks?scope=all');await p.getByRole('button',{name:'إضافة مهمة',exact:false}).first().click();
  await p.getByLabel('عنوان المهمة').fill('ملف العدد القادم — تعاون محلي');await p.getByLabel('الوصف',{exact:true}).fill('نجهز ملفًا متكاملًا، نراجع المصادر ثم نناقش ترتيب المواد. بيانات اختبار مستقلة.');
  await p.getByLabel('المسؤول الرئيسي',{exact:true}).selectOption(primary.id);
  for(const member of [participant,manager,third])await p.getByRole('checkbox',{name:member.name,exact:true}).check();
  await p.getByRole('button',{name:'حفظ المهمة',exact:true}).click();await p.getByRole('heading',{name:'ملف العدد القادم — تعاون محلي',exact:true}).waitFor();
  const id=new URL(p.url()).searchParams.get('task');check(Boolean(id),'task permalink');results.task=id;
  await p.getByLabel('خطوة جديدة').fill('مراجعة مصادر الملف');await p.getByRole('button',{name:'إضافة خطوة',exact:true}).click();await p.getByRole('checkbox',{name:'مراجعة مصادر الملف',exact:true}).waitFor();
  let release;const gate=new Promise(resolve=>{release=resolve;});let held=false;
  await p.route('**/api/admin/tasks',async r=>{if(r.request().method()==='POST'&&r.request().postDataJSON()?.action==='comment_save'&&!held){held=true;await gate;}await r.continue();});
  await p.locator('#task-discussion-body').fill('نراجع المصادر أولًا ثم نوزع الفقرات على الفريق.');const started=p.waitForRequest(r=>r.url().includes('/api/admin/tasks')&&r.method()==='POST'&&r.postDataJSON()?.action==='comment_save');await p.getByRole('button',{name:'إرسال التعليق',exact:true}).click();await started;
  await p.locator('#task-discussion-body').fill('نص جديد أثناء انتظار إرسال سابق.');release();
  await p.getByText('نراجع المصادر أولًا ثم نوزع الفقرات على الفريق.',{exact:true}).waitFor();await p.waitForFunction(()=>!document.querySelector('#task-discussion-body')?.form?.querySelector('button[type=submit]')?.disabled);check(await p.locator('#task-discussion-body').inputValue()==='نص جديد أثناء انتظار إرسال سابق.','new typing must survive prior successful send');await p.locator('#task-discussion-body').fill('');await p.unroute('**/api/admin/tasks');results.checks.push('delayed send regression: newer typing is preserved');
  const root=p.locator('[data-task-comment]').filter({hasText:'نراجع المصادر أولًا ثم نوزع الفقرات على الفريق.'});await root.waitFor();await root.getByRole('button',{name:'رد',exact:true}).click();
  await p.locator('#task-discussion-body').fill('أقترح تقسيم المراجعة بين التوثيق والتحرير.');await p.getByRole('button',{name:'إرسال الرد',exact:true}).click();await p.getByText('أقترح تقسيم المراجعة بين التوثيق والتحرير.',{exact:true}).waitFor();
  results.checks.push('UI: primary plus three participants, step, root comment and reply');
  const b=await account(participant);await go(b.p,'/admin/tasks?scope=participating&task='+id);await b.p.getByRole('heading',{name:'ملف العدد القادم — تعاون محلي',exact:true}).waitFor();
  check(await b.p.getByRole('button',{name:'تعديل المهمة',exact:true}).count()===0,'participant cannot manage task');
  const stepRequest=b.p.waitForResponse(r=>r.url().includes('/api/admin/tasks')&&r.request().method()==='POST');await b.p.getByRole('checkbox',{name:'مراجعة مصادر الملف',exact:true}).click();const stepResponse=await stepRequest;check(stepResponse.ok(),'participant step failed: '+JSON.stringify(await stepResponse.json()));
  await b.p.waitForFunction(()=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes('مراجعة مصادر الملف'))?.querySelector('input')?.checked);
  await b.p.getByRole('button',{name:/إظهار الردود/}).click();const parent=b.p.locator('[data-task-comment]').filter({hasText:'أقترح تقسيم المراجعة بين التوثيق والتحرير.'});await parent.getByRole('button',{name:'رد',exact:true}).click();
  await b.p.locator('#task-discussion-body').fill('سأتولى التوثيق، وأرفع الملاحظات هنا.');await b.p.getByRole('button',{name:'إرسال الرد',exact:true}).click();await b.p.getByText('سأتولى التوثيق، وأرفع الملاحظات هنا.',{exact:true}).waitFor();
  const nested=b.p.locator('[data-task-comment]').filter({hasText:'سأتولى التوثيق، وأرفع الملاحظات هنا.'});const permalink=await nested.getByRole('link',{name:'رابط هذه المشاركة'}).getAttribute('href');
  await b.p.route('**/api/admin/tasks',r=>r.request().method()==='POST'?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'فشل اتصال اصطناعي محلي'})}):r.continue());
  await b.p.waitForFunction(()=>!document.querySelector('#task-discussion-body')?.value);
  await b.p.locator('#task-discussion-body').fill('مسودة تبقى محفوظة بعد فشل الاتصال.');await b.p.getByRole('button',{name:'إرسال التعليق',exact:true}).click();await b.p.getByRole('alert').filter({hasText:'فشل اتصال اصطناعي محلي'}).waitFor();check(await b.p.locator('#task-discussion-body').inputValue()==='مسودة تبقى محفوظة بعد فشل الاتصال.','draft survived failure');
  await b.p.unroute('**/api/admin/tasks');await b.p.getByRole('button',{name:'إرسال التعليق',exact:true}).click();await b.p.getByText('مسودة تبقى محفوظة بعد فشل الاتصال.',{exact:true}).waitFor();
  results.checks.push('UI: participant step completion, reply to reply, explicit failure preserves draft');
  const detail=await b.request('GET','/api/admin/tasks?id='+id);check(detail.status===200,'read shared task');
  const rootRecord=detail.body.comments.find(c=>c.body.startsWith('نراجع المصادر'));
  const forbidden=await b.request('POST','/api/admin/tasks',{action:'comment_save',id,revision:detail.body.task.revision,data:{id:rootRecord.id,comment_revision:rootRecord.revision,body:'محاولة ممنوعة'}});check(forbidden.status===403,'other-author edit denied');
  const b2=await account(participant);const own=detail.body.comments.find(c=>c.body.startsWith('سأتولى التوثيق'));
  const payload=text=>({action:'comment_save',id,revision:detail.body.task.revision,data:{id:own.id,comment_revision:own.revision,body:text}});
  const race=await Promise.all([b.request('POST','/api/admin/tasks',payload('نتيجة الجلسة الأولى')),b2.request('POST','/api/admin/tasks',payload('نتيجة الجلسة الثانية'))]);check(race.map(x=>x.status).sort().join(',')==='200,409','two sessions CAS');results.checks.push('API via MCP: two session CAS 200/409 and author permissions');
  await go(p,permalink);await p.locator('#task-comment-'+own.id).waitFor();await p.locator('#task-comment-'+own.id).scrollIntoViewIfNeeded();
  await p.screenshot({path:evidence+'after-task-discussion-1440.png',fullPage:true});
  const latest=await m.request('GET','/api/admin/tasks?id='+id);const deleted=await m.request('POST','/api/admin/tasks',{action:'comment_delete',id,revision:latest.body.task.revision,data:{id:rootRecord.id,comment_revision:rootRecord.revision}});check(deleted.status===200,'tombstone delete');const preserved=await m.request('GET','/api/admin/tasks?id='+id);check(preserved.body.comments.length===4&&preserved.body.comments.find(c=>c.id===rootRecord.id).deleted_at,'replies retained');
  const removed=await m.request('POST','/api/admin/tasks',{action:'members',id,revision:preserved.body.task.revision,data:{participant_ids:[manager.id,third.id]}});check(removed.status===200,'remove participant');const afterRemove=await m.request('GET','/api/admin/tasks?id='+id);
  const deniedStep=await b.request('POST','/api/admin/tasks',{action:'subtask_complete',id,revision:afterRemove.body.task.revision,data:{id:afterRemove.body.subtasks[0].id,is_completed:false}});check(deniedStep.status===403,'removed participation cannot complete');
  await m.request('POST','/api/admin/tasks',{action:'members',id,revision:afterRemove.body.task.revision,data:{participant_ids:[participant.id,manager.id,third.id]}});
  results.checks.push('tombstones preserve descendants; member removal revokes step permission');
  for(const width of [1440,390]){
   const a=await account(manager,width);await go(a.p,'/admin/tasks?scope=all');await a.p.getByText('ملف العدد القادم — تعاون محلي',{exact:true}).first().waitFor();await a.p.screenshot({path:evidence+'after-task-center-'+width+'.png',fullPage:true});check(!await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'task center overflow '+width);
   await go(a.p,permalink);await a.p.locator('#task-comment-'+own.id).waitFor();check(await a.p.locator('#task-comment-'+own.id).isVisible(),'permalink expands replies '+width);await a.p.screenshot({path:evidence+'after-task-permalink-'+width+'.png'});await a.p.locator('dialog').evaluate(d=>d.scrollTop=0);await a.p.screenshot({path:evidence+'after-task-detail-'+width+'.png'});check(!await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'task detail overflow '+width);
   await go(a.p,'/admin/contributions?period=all');await a.p.getByRole('heading',{name:'سجل النشاط',exact:true}).waitFor();await a.p.screenshot({path:evidence+'after-contributions-'+width+'.png',fullPage:true});check(!await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'dashboard overflow '+width);check(await a.p.locator('tbody tr').count()>0,'real committed activity shown');
   await a.p.getByLabel('العضو',{exact:true}).selectOption(primary.id);await a.p.getByRole('heading',{name:'مساهمات '+primary.name,exact:true}).waitFor();check(await a.p.getByRole('heading',{name:'المحتويات التي عمل عليها العضو',exact:true}).count()===1,'member space');await a.p.screenshot({path:evidence+'after-editor-profile-'+width+'.png',fullPage:true});
   await go(a.p,'/yemen-map?era=تاريخية&photo=1&figureSort=alpha#yemeni-figures');await a.p.locator('.yfigures-grid').waitFor();await a.p.locator('.yfigures-filters').first().scrollIntoViewIfNeeded();await a.p.screenshot({path:evidence+'after-figure-filters-'+width+'.png',fullPage:true});check(!await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'figure filters overflow '+width);
   const link=a.p.locator('.yfigure-card-hitarea').first(),from=new URL(await link.getAttribute('href'),'http://127.0.0.1:3149').searchParams.get('from');await link.scrollIntoViewIfNeeded();const position=await a.p.evaluate(()=>scrollY);await link.click();await a.p.locator('.back-link').waitFor();check((await a.p.locator('.back-link').getAttribute('href'))===from,'filtered context link '+width);await a.p.locator('.back-link').click();await a.p.locator('.yfigures-grid').waitFor();check(await a.p.getByLabel('لديها صورة مسجلة').isChecked(),'return retains photo filter');check(new URL(a.p.url()).searchParams.get('era')==='تاريخية','return retains era');await a.p.waitForFunction(y=>Math.abs(scrollY-y)<100,position,{timeout:8000});
   await a.p.keyboard.press('Tab');check(await a.p.evaluate(()=>document.activeElement!==document.body),'keyboard focus '+width);
   results.checks.push('1440/390 responsive, permalink, member dashboard, combined filters, contextual return and keyboard: '+width);
  }
  const regular=await account(state.users.find(u=>!u.role&&!u.unconfirmed));const denied=await regular.request('GET','/api/admin/contributions');check(denied.status===403,'ordinary account denied report');
  const anon=await page.request.get('http://127.0.0.1:3149/api/admin/contributions');check(anon.status()===401,'anonymous denied report');
  results.checks.push('anonymous 401 and ordinary account 403 for contributions');results.errors=errors;check(errors.length===0,'browser runtime errors');return results;
 }finally{for(const context of contexts)await context.close();}
}
