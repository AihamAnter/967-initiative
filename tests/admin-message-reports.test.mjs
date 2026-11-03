import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {reportParties,reportReference,REPORT_THREAD_PAGE_SIZE} from '../lib/messageReports.js';
import {safeMessagingQuery} from '../lib/privateMessaging.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const users={
 a:'30000000-0000-4000-8000-000000000001',
 b:'30000000-0000-4000-8000-000000000002',
 other:'30000000-0000-4000-8000-000000000003'
};
test('reports describe who complained about whom with a stable human reference',()=>{
 const conv={user_low:users.a,user_high:users.b};
 const names=new Map([[users.a,'ليلى'],[users.b,'محمد']]);
 const report={id:'20000000-0000-4000-8000-000000000001',reporter_id:users.a,report_number:18,message_id:'10000000-0000-4000-8000-000000000001'};
 const context=reportParties(report,conv,names);
 assert.equal(context.reference,'967-R000018');
 assert.deepEqual(context.reporter,{id:users.a,name:'ليلى'});
 assert.deepEqual(context.reported,{id:users.b,name:'محمد'});
 assert.equal(context.subject_type,'رسالة خاصة');
 assert.equal(reportParties({...report,reporter_id:users.other},conv,names),null);
 assert.equal(reportParties({...report,message_id:null},conv,names).subject_type,'طلب محادثة');
 assert.equal(reportReference(0),'بلاغ غير مرقّم');
 assert.equal(REPORT_THREAD_PAGE_SIZE,40);
});

test('reported-thread endpoint is management only, strictly report-scoped and audited before messages are revealed',()=>{
 const api=read('app/api/admin/message-reports/route.js');
 const messaging=read('app/api/messages/route.js');
 const dashboard=read('components/admin/MessageReports.jsx');
 const directory=read('components/admin/ManagementUsersDashboard.jsx');
 assert.match(api,/authorizeEditorRequest\(request,db\)/);
 assert.match(api,/if\(actor\.role!=='management'\)/);
 assert.match(api,/\.eq\('id',reportId\)\.maybeSingle\(\)/);
 assert.match(api,/if\(!report\)throw new RequestValidationError/);
 assert.match(api,/const described=await contextFor\(db,\[report\]\)/);
 assert.match(api,/\.insert\(\{report_id:reportId,viewer_id:viewer\.id\}\)/);
 assert.ok(api.indexOf(".insert({report_id:reportId,viewer_id:viewer.id})") < api.indexOf(".from('private_messages')"));
 assert.match(api,/\.eq\('conversation_id',report\.conversation_id\)/);
 assert.match(api,/\.lte\('created_at',report\.created_at\)/);
 assert.match(api,/REPORT_THREAD_PAGE_SIZE/);
 assert.match(dashboard,/مقدّم البلاغ/);
 assert.match(dashboard,/المُبلّغ عنه/);
 assert.match(dashboard,/قراءة المحادثة المرتبطة بالبلاغ/);
 assert.match(dashboard,/report\.reference/);
 assert.match(messaging,/if\(editor\.data\?\.role!=='management'\)/);
 assert.match(messaging,/mode==='contact'/);
 assert.match(directory,/\/messages\?to=/);
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=contact&id=bogus')),/المحادثة/);
});

test('report numbers are assigned to existing reports and moderation transcript views are private',async t=>{
 const pg=new PGlite();
 t.after(()=>pg.close());
 await pg.exec([
  'create role authenticated nologin','create role anon nologin','create role service_role nologin',
  'grant usage on schema public to service_role',
  'create table public.private_message_reports(id uuid primary key)',
  "insert into public.private_message_reports(id) values('20000000-0000-4000-8000-000000000001')"
 ].join(';')+';');
 await pg.exec(read('supabase/migrations/20261103061322_message_report_context_audit.sql'));
 const report=(await pg.query('select report_number from public.private_message_reports limit 1')).rows[0];
 assert.equal(typeof report.report_number,'number');
 assert.ok(report.report_number>0);
 const added=await pg.query("insert into public.private_message_reports(id) values('20000000-0000-4000-8000-000000000002') returning report_number");
 assert.ok(added.rows[0].report_number>report.report_number);
 const has=(await pg.query("select has_table_privilege('authenticated','public.private_message_report_views','select') as browser_can_read,has_table_privilege('authenticated','public.private_message_report_views','insert') as browser_can_write,has_table_privilege('service_role','public.private_message_report_views','insert') as management_can_log")).rows[0];
 assert.deepEqual(has,{browser_can_read:false,browser_can_write:false,management_can_log:true});
 await pg.transaction(async tx=>{
  await tx.exec('set local role service_role');
  await tx.query("insert into public.private_message_report_views(report_id,viewer_id) values($1,$2)",['20000000-0000-4000-8000-000000000001',users.a]);
 });
 assert.equal((await pg.query('select count(*)::int as n from public.private_message_report_views')).rows[0].n,1);
 const rls=(await pg.query("select relrowsecurity from pg_class where oid='public.private_message_report_views'::regclass")).rows[0];
 assert.equal(rls.relrowsecurity,true);
});
