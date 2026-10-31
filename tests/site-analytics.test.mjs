import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageViewBucket,usageEvent,usageOverview,schoolLearningOverview,ACTIVITY_SECTIONS,SEARCH_MISS_TYPES} from '../lib/siteAnalytics.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('only public content routes are included and detailed URLs are collapsed to a category',()=>{
 for(const [path,expected] of [['/','home'],['/school/courses/economics-basics/2','school'],['/games/map','games'],['/yemen-history/saba','history'],['/yemen-map/governorates/YE26','atlas'],['/search?q=private','search'],['/yemen-in-numbers/indicator/gdp','statistics']])
  assert.equal(pageViewBucket(path),expected,path);
 for(const path of ['/api/admin/analytics','/admin/analytics','/account','/login','/register','/privacy','/school/studio','/read-later','/admin/tasks','/unknown','https://evil.test/'])
  assert.equal(pageViewBucket(path),null,path);
});

test('analytics payload accepts only metric and an allowlisted section',()=>{
 assert.deepEqual(usageEvent({event:'page_view',section:'school'}),{event:'page_view',section:'school'});
 assert.deepEqual(usageEvent({event:'search_miss',section:'all'}),{event:'search_miss',section:'all'});
 for(const value of [{event:'page_view',section:'/school'},{event:'page_view',section:'admin'},{event:'search_miss',section:'strange'},{event:'download',section:'school'},null,[]])
  assert.equal(usageEvent(value),null);
 assert.ok(Object.keys(ACTIVITY_SECTIONS).length>=15);
 assert.ok(SEARCH_MISS_TYPES.includes('figures'));
});

test('UTC period aggregation excludes stale, future and unknown categories',()=>{
 const now=new Date('2026-10-31T12:00:00.000Z');
 const rows=[
  {day:'2026-10-31',metric:'page_view',section:'school',total:7},
  {day:'2026-10-30',metric:'page_view',section:'school',total:3},
  {day:'2026-10-31',metric:'page_view',section:'history',total:4},
  {day:'2026-10-31',metric:'search_miss',section:'all',total:2},
  {day:'2026-10-01',metric:'page_view',section:'home',total:200},
  {day:'2026-11-01',metric:'page_view',section:'home',total:400},
  {day:'2026-10-31',metric:'page_view',section:'admin',total:100},
  {day:'2026-10-31',metric:'page_view',section:'games',total:-1},
 ];
 const summary=usageOverview(rows,7,now);
 assert.equal(summary.pageViews,14);
 assert.equal(summary.searchMisses,2);
 assert.equal(summary.sections[0].id,'school');
 assert.equal(summary.sections[0].count,10);
 assert.equal(summary.timeline.length,7);
 assert.equal(summary.timeline.at(-1).views,11);
 assert.equal(summary.sections.some(x=>x.id==='admin'),false);
 assert.equal(usageOverview(rows,15,now).days,30);
});

test('school completion counts distinct people but exports no identifying data',()=>{
 const rows=[];
 for(let i=0;i<5;i++){
  const user='user-'+i;
  rows.push({user_id:user,course_slug:'musnad',stage_index:1,status:'failed'});
  rows.push({user_id:user,course_slug:'musnad',stage_index:1,status:i<3?'passed':'failed'});
 }
 const data=schoolLearningOverview(rows);
 assert.equal(data.sampleAttempts,10);
 assert.equal(data.stages.length,1);
 assert.deepEqual(data.stages[0],{course:'musnad',stage:1,learners:5,completed:3,completionRate:60,attempts:10,passRate:30});
 assert.ok(!JSON.stringify(data).includes('user-'));
 assert.equal(schoolLearningOverview(rows.slice(0,8)).stages.length,0);
});

test('tracking requires privacy controls and does not collect identifiers',()=>{
 const tracker=read('components/analytics/SiteUsageTracker.jsx');
 const privacy=read('components/analytics/AnalyticsPrivacyControls.jsx');
 const endpoint=read('app/api/analytics/event/route.js');
 const sql=read('supabase/migrations/20261031202332_site_usage_aggregate_analytics.sql');
 for(const token of ["doNotTrack","globalPrivacyControl","967-analytics-opt-out","credentials:'omit'","isVisible(pathname)"])assert.ok(tracker.includes(token),token);
 assert.ok(privacy.includes('تعطيل العدّ المجمّع'));
 assert.ok(endpoint.includes("db.rpc('record_site_usage'"));
 assert.ok(endpoint.includes('isSameOrigin(request)'));
 assert.ok(endpoint.includes('usageEvent(body)'));
 for(const string of ['user_id uuid','ip_address','referrer','query_text','search_phrase'])
  assert.ok(!sql.includes(string),string);
 assert.ok(sql.includes('security invoker'));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('revoke all on function public.record_site_usage(text,text) from public,anon,authenticated'));
 assert.ok(sql.includes('grant execute on function public.record_site_usage(text,text) to service_role'));
});

test('private dashboard authenticates server side, filters small groups and no raw student records returned',()=>{
 const api=read('app/api/admin/analytics/route.js');
 const ui=read('components/admin/AnalyticsDashboard.jsx');
 const nav=read('components/admin/AdminNavigation.jsx');
 const search=read('app/search/page.jsx');
 const layout=read('app/layout.jsx');
 assert.ok(api.indexOf('await authorizeEditorRequest')<api.indexOf("db.from('site_usage_daily')"));
 assert.ok(api.includes('schoolStudioAnalytics(rows,3000,5)'));
 assert.ok(read('lib/schoolStudioAnalytics.js').includes('.filter(x=>x.asked>=minAsked)'));
 assert.ok(api.includes('schoolLearningOverview(rows)'));
 assert.ok(api.includes('schoolStudioAnalytics(rows,3000,5)'));
 assert.ok(api.includes("Cache-Control':'private, no-store'"));
 assert.ok(ui.includes('الأسئلة الأكثر خطأً'));
 assert.ok(ui.includes('إكمال المحطات'));
 assert.ok(ui.includes('searches'));
 assert.ok(nav.includes('href="/admin/analytics"'));
 assert.ok(layout.includes('<SiteUsageTracker/>'));
 assert.ok(search.includes('unavailable.length===0'));
 assert.ok(search.includes("<SearchMissTracker key={query"));
 assert.ok(!api.includes('return respond({records:'));
});

test('presentation is mobile responsive, keyboard navigable and distinguishes views from unique people',()=>{
 const css=read('components/admin/AnalyticsDashboard.module.css');
 const ui=read('components/admin/AnalyticsDashboard.jsx');
 assert.ok(css.includes('@media(max-width:650px)'));
 assert.ok(css.includes(':focus-visible'));
 assert.ok(ui.includes('ليست عدد أشخاص فريدين')||ui.includes('وليس زوارًا فريدين'));
 assert.ok(ui.includes('role="img"'));
 assert.ok(ui.includes('role="alert"'));
 assert.ok(ui.includes('aria-label'));
});
