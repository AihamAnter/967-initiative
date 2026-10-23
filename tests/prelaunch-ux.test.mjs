import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCorrectionHref,resolveContributionReference} from '../lib/contributions.js';
import {defaultSiteSettings,resolveSiteSettings,buildSiteSettingsRows,SITE_CONTENT_KEY} from '../lib/siteSettings.js';
import {handleTaskRequest} from '../lib/taskApi.js';
import {createTaskTestDatabase,taskTestUsers} from './helpers/taskTestDatabase.mjs';
import {getSettingsSearchPages} from '../lib/searchPages.js';

test('C-04 / B-01: correction links round trip page context, select correction and target the form',()=>{
  const expected={title:'شركة اختبار محلي',path:'/yemeni-products/local-company',id:'company-id'};
  const url=new URL(buildCorrectionHref(expected),'https://local.invalid');
  assert.equal(url.pathname,'/contribute');assert.equal(url.searchParams.get('type'),'تصحيح معلومة');assert.equal(url.hash,'#contribution-form');
  assert.deepEqual(resolveContributionReference(Object.fromEntries(url.searchParams)),expected);
  const figure={title:'اسم شخصية',path:'/yemen-map/figures/%D8%A7%D8%B3%D9%85',id:'figure-id'};
  assert.deepEqual(resolveContributionReference(Object.fromEntries(new URL(buildCorrectionHref(figure),'https://local.invalid').searchParams)),figure);
});

test('C-04 / B-01: a page reference is bounded untrusted context and cannot redirect outside public pages',()=>{
  for(const path of ['https://evil.example/company','//evil.example/company','/\\evil.example/company','javascript:alert(1)','/admin/editors','/api/contact','/account/activity','/safe/../admin','/%2f%2fevil.example']) {
    assert.equal(resolveContributionReference({referencePath:path}),null,path);
    assert.equal(new URL(buildCorrectionHref({path}),'https://local.invalid').searchParams.has('referencePath'),false,path);
  }
  assert.equal(resolveContributionReference({referencePath:['/works/test']}),null);
  const bounded=resolveContributionReference({referencePath:'/works/test',referenceTitle:'x'.repeat(500),referenceId:'y'.repeat(500)});
  assert.equal(bounded.title.length,180);assert.equal(bounded.id.length,100);
  assert.equal(resolveContributionReference({referencePath:'/works/test',referenceTitle:'<script>alert(1)</script>'}).title,'<script>alert(1)</script>','reference remains data for React escaping, never HTML');
});

test('U-02: legacy settings remain compatible and project status changes only through saved settings',()=>{
  const legacy=resolveSiteSettings([{key:SITE_CONTENT_KEY,value:{heroTitle:'عنوان محفوظ'}}]);
  assert.equal(legacy.heroTitle,'عنوان محفوظ');assert.equal(legacy.debatesProjectStatus,defaultSiteSettings.debatesProjectStatus);
  for(const debatesProjectStatus of ['قيد التحضير','متاح للمشاركة','مرحلة تجريبية']) {
    const settings=resolveSiteSettings(buildSiteSettingsRows({...legacy,debatesProjectStatus}));
    assert.equal(settings.debatesProjectStatus,debatesProjectStatus);
    assert.ok(getSettingsSearchPages(settings).find(page=>page.href==='/#projects').description.includes(debatesProjectStatus));
  }
  assert.throws(()=>buildSiteSettingsRows({...legacy,debatesProjectStatus:'x'.repeat(81)}));
  assert.equal(resolveSiteSettings([{key:SITE_CONTENT_KEY,value:{debatesProjectStatus:''}}]).debatesProjectStatus,defaultSiteSettings.debatesProjectStatus);
});

test('S-05: reminders persist across API visits, retain read state and do not duplicate on reopening',async()=>{
  const db=await createTaskTestDatabase();const actor=taskTestUsers[0].id;
  const visit=async(body,query='')=>handleTaskRequest(new Request('http://127.0.0.1:3117/api/admin/tasks'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+actor,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),db.createDb);
  try {
    const created=await visit({action:'create',data:{title:'S-05 مهمة محلية متأخرة',assigned_to:actor,due_at:'2020-01-01T12:00:00Z',due_timezone:'UTC'}});
    assert.equal(created.status,201);const {id}=await created.json();
    assert.equal((await visit({action:'reminders'})).status,200);
    const first=await (await visit()).json();const reminders=first.notifications.filter(n=>n.kind==='overdue'&&n.task_id===id);
    assert.equal(reminders.length,1);assert.equal(first.metrics.overdue,1);
    assert.equal((await visit({action:'read_notifications',data:{id:reminders[0].id}})).status,200);
    assert.equal((await visit({action:'reminders'})).status,200);
    const reopened=await (await visit()).json();const saved=reopened.notifications.filter(n=>n.kind==='overdue'&&n.task_id===id);
    assert.equal(saved.length,1);assert.equal(saved[0].id,reminders[0].id);assert.ok(saved[0].read_at);
    const filtered=await(await visit(undefined,'?scope=overdue')).json();assert.equal(filtered.total,1);assert.equal(filtered.tasks[0].id,id);
  } finally {await db.close();}
});
