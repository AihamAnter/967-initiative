import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountRow,accountSummary,filterAccountRows,isAccountBanned,validateManagementAction} from '../lib/managementUsers.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-11-03T12:00:00Z');
const user=(id,name,email,created_at,last_sign_in_at,banned_until=null,email_confirmed_at='2026-11-01T00:00:00Z')=>({
 id,user_metadata:{full_name:name},app_metadata:{provider:'email'},email,created_at,last_sign_in_at,banned_until,email_confirmed_at
});
const a=accountRow(user('00000000-0000-4000-8000-000000000001','سارة','sara@example.test','2026-10-01T00:00:00Z','2026-11-02T00:00:00Z'),'management',now);
const b=accountRow(user('00000000-0000-4000-8000-000000000002','ليلى','layla@example.test','2026-10-10T00:00:00Z',null,'2027-01-01T00:00:00Z'),null,now);
const c=accountRow(user('00000000-0000-4000-8000-000000000003','محمد','mohammad@example.test','2026-11-01T00:00:00Z',null,null,null),null,now);

test('accounts expose safe display data but not sensitive auth metadata',()=>{
 assert.equal(a.role,'management');
 assert.equal(b.status,'banned');
 assert.equal(c.status,'unverified');
 assert.equal(isAccountBanned(b.banned_until,now),true);
 assert.equal(isAccountBanned('2026-01-01T00:00:00Z',now),false);
 assert.equal(a.provider,'email');
 assert.ok(!('user_metadata' in a));
 assert.ok(!('app_metadata' in a));
 assert.ok(!('identities' in a));
 assert.ok(!('phone' in a));
});
test('directory search, server pagination, filters and sorting',()=>{
 const rows=[a,b,c];
 assert.equal(filterAccountRows(rows,{q:'LAYLA'}).users[0].id,b.id);
 assert.equal(filterAccountRows(rows,{q:'محمد'}).users[0].id,c.id);
 assert.equal(filterAccountRows(rows,{status:'banned'}).total,1);
 assert.equal(filterAccountRows(rows,{role:'management'}).users[0].id,a.id);
 assert.deepEqual(filterAccountRows(rows,{sort:'created_asc'}).users.map(x=>x.id),[a.id,b.id,c.id]);
 assert.deepEqual(filterAccountRows(rows,{sort:'login_desc'}).users.map(x=>x.id),[a.id,b.id,c.id]);
 assert.equal(filterAccountRows(rows,{page:999}).page,1);
 assert.deepEqual(accountSummary(rows),{total:3,active:1,banned:1,unverified:1});
});
test('ban and email actions strictly validate server-side payloads',()=>{
 const id=a.id;
 assert.equal(validateManagementAction({action:'ban',user_id:id,duration:'24h'}),null);
 assert.equal(validateManagementAction({action:'unban',user_id:id}),null);
 assert.equal(validateManagementAction({action:'send_email',user_id:id,subject:'تنبيه مهم',message:'رسالة اختبار طويلة بما يكفي'}),null);
 assert.match(validateManagementAction({action:'ban',user_id:id,duration:'123456789h'}),/مدة/);
 assert.match(validateManagementAction({action:'ban',user_id:'hacker',duration:'24h'}),/معرّف/);
 assert.match(validateManagementAction({action:'send_email',user_id:id,subject:'Hello\nBcc:bad@example.test',message:'رسالة طويلة كفاية'}),/عنوان/);
 assert.match(validateManagementAction({action:'send_email',user_id:id,subject:'ok',message:'too short'}),/عنوان/);
});
test('page and API never grant editor admins access to account listing',()=>{
 const api=read('app/api/admin/users/route.js');
 const nav=read('components/admin/AdminNavigation.jsx');
 const page=read('app/admin/users/page.jsx');
 const view=read('components/admin/ManagementUsersDashboard.jsx');
 assert.ok(api.includes('authorizeEditorRequest(request,db)'));
 assert.ok(api.includes("actor.role!=='management'"));
 assert.ok(api.indexOf("actor.role!=='management'")<api.indexOf('auth.admin.listUsers'));
 assert.ok(api.includes("db.auth.admin.getUserById"));
 assert.ok(api.includes("editor.data?.role==='admin'"));
 assert.ok(api.includes("editor.data?.role==='management'"));
 assert.ok(api.includes("ban_duration"));
 assert.ok(api.includes("RESEND_API_KEY"));
 assert.ok(api.includes("MANAGEMENT_EMAIL_FROM"));
 assert.ok(api.includes("target.email"));
 assert.ok(!api.includes("body.email"));
 assert.ok(nav.includes("tabs.some(item=>item.id==='admins')"));
 assert.ok(nav.includes("{canManageUsers&&<a href=\"/admin/users\">المستخدمين</a>}"));
 assert.ok(page.includes("ManagementUsersDashboard"));
 assert.ok(view.includes("getSession()"));
 assert.ok(view.includes("Authorization:'Bearer '"));
 assert.ok(view.includes("لا يمكن"));
});
