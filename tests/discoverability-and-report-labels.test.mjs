import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {REPORT_STATUS_LABELS,REPORT_DECISION_LABELS,reportDecisionPrompt} from '../lib/reportDecisionLabels.js';
import {canReceiveSearchRequests} from '../lib/privateMessaging.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('admin report wording clearly distinguishes completion from dismissal without claiming a ban',()=>{
 assert.equal(REPORT_STATUS_LABELS.reviewed,'اكتملت المراجعة');
 assert.equal(REPORT_STATUS_LABELS.dismissed,'أُغلق دون إجراء');
 assert.equal(REPORT_DECISION_LABELS.reviewed,'تسجيل اكتمال المراجعة');
 assert.equal(REPORT_DECISION_LABELS.dismissed,'إغلاق دون إجراء');
 assert.match(reportDecisionPrompt('reviewed','967-R000123'),/مراجعة البلاغ/);
 assert.match(reportDecisionPrompt('reviewed','967-R000123'),/لا يحظر/);
 assert.match(reportDecisionPrompt('dismissed','967-U000123'),/دون اتخاذ إجراء/);
 assert.match(reportDecisionPrompt('dismissed','967-U000123'),/لا ينفذ أي حظر/);
 assert.equal(reportDecisionPrompt('open'),'');
 for(const file of ['components/admin/MessageReports.jsx','components/admin/MemberReports.jsx']){
  const code=read(file);
  assert.match(code,/REPORT_DECISION_LABELS\.reviewed/);
  assert.match(code,/REPORT_DECISION_LABELS\.dismissed/);
  assert.match(code,/REPORT_STATUS_LABELS\.reviewed/);
  assert.match(code,/REPORT_STATUS_LABELS\.dismissed/);
  assert.match(code,/window\.confirm\(reportDecisionPrompt\(status,reference\)\)/);
  assert.match(code,/دون حظر أو عقوبة تلقائية/);
  assert.ok(!code.includes('>إغلاق البلاغ</button>'));
 }
});

test('existing discoverability is explicitly enabled for every registered user but message settings are preserved',async t=>{
 const pg=new PGlite();
 t.after(()=>pg.close());
 await pg.exec("create schema auth; create table auth.users(id uuid primary key); create table public.private_messaging_settings(user_id uuid primary key references auth.users(id),discoverable boolean not null default true,allow_requests boolean not null default true,notify_messages boolean not null default true);");
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
 for(const id of ids)await pg.query('insert into auth.users(id) values($1)',[id]);
 await pg.query('insert into public.private_messaging_settings(user_id,discoverable,allow_requests,notify_messages) values($1,false,false,false)',[ids[0]]);
 await pg.query('insert into public.private_messaging_settings(user_id,discoverable,allow_requests,notify_messages) values($1,true,false,true)',[ids[1]]);
 const migration=read('supabase/migrations/20261103134354_enable_discoverability_for_existing_members.sql');
 await pg.exec(migration);
 const a=(await pg.query('select user_id,discoverable,allow_requests,notify_messages from public.private_messaging_settings order by user_id')).rows;
 assert.equal(a.length,3);
 assert.ok(a.every(row=>row.discoverable===true));
 assert.deepEqual(a.map(x=>({allow:x.allow_requests,notify:x.notify_messages})),[
  {allow:false,notify:false},{allow:false,notify:true},{allow:true,notify:true}
 ]);
 await pg.query('update public.private_messaging_settings set discoverable=false where user_id=$1',[ids[0]]);
 const changed=(await pg.query('select discoverable from public.private_messaging_settings where user_id=$1',[ids[0]])).rows[0];
 assert.equal(changed.discoverable,false,'users remain free to turn off discoverability after migration');
 assert.equal(canReceiveSearchRequests({discoverable:false,allow_requests:true}),false);
 assert.equal(canReceiveSearchRequests({discoverable:true,allow_requests:false}),false);
 assert.equal(canReceiveSearchRequests({discoverable:true,allow_requests:true}),true);
});
