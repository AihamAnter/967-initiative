import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validateMemberId,validateMemberReport,memberReportReference,memberProfilePath} from '../lib/memberProfiles.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const actor='30000000-0000-4000-8000-000000000001';
const other='30000000-0000-4000-8000-000000000002';
const third='30000000-0000-4000-8000-000000000003';
const fourth='30000000-0000-4000-8000-000000000004';
const fifth='30000000-0000-4000-8000-000000000005';

test('member URLs are UUID-only; reports require a reason and meaningful details',()=>{
 assert.equal(validateMemberId(actor),actor);
 assert.equal(memberProfilePath(other),'/members/'+other);
 assert.equal(memberProfilePath('not-an-id'),null);
 assert.throws(()=>validateMemberId('bad'),/الرابط|رابط المستخدم/);
 assert.throws(()=>validateMemberReport({action:'report',reason:'spam',detail:'x'}),/10/);
 assert.throws(()=>validateMemberReport({action:'report',reason:'hacking',detail:'هذا بلاغ بتفاصيل كافية'}),/سبب/);
 assert.deepEqual(validateMemberReport({action:'report',reason:'harassment',detail:'  إساءة متكررة في الموقع  '}),{
  reason:'harassment',detail:'إساءة متكررة في الموقع'
 });
 assert.equal(memberReportReference(9),'967-U000009');
 assert.equal(memberReportReference(null),'بلاغ حساب');
});

test('member abuse reports are RLS-protected, unique per open pair and rate-limited',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec([
  'create role anon nologin','create role authenticated nologin','create role service_role nologin bypassrls',
  'create schema auth',
  'create table auth.users(id uuid primary key)',
  'grant usage on schema auth,public to service_role'
 ].join(';\n')+';');
 for(const id of [actor,other,third,fourth,fifth])
  await pg.query('insert into auth.users values($1)',[id]);
 await pg.exec(read('supabase/migrations/20261103130835_member_profile_reports_moderation.sql'));
 const sql='insert into public.member_profile_reports(reporter_id,reported_id,reason,detail) values($1,$2,$3,$4) returning id,report_number';
 const write=async(reported)=>pg.transaction(async tx=>{
  await tx.exec('set local role service_role');
  return tx.query(sql,[actor,reported,'spam','يتضمن الحساب رسائل مخالفة متكررة']);
 });
 const priv=(await pg.query("select has_table_privilege('authenticated','public.member_profile_reports','select') as can_read,has_table_privilege('authenticated','public.member_profile_reports','insert') as can_write,has_table_privilege('service_role','public.member_profile_reports','insert') as service_can_write")).rows[0];
 assert.deepEqual(priv,{can_read:false,can_write:false,service_can_write:true});
 await assert.rejects(pg.transaction(async tx=>{
  await tx.exec('set local role authenticated');
  return tx.query(sql,[actor,other,'spam','يتضمن الحساب رسائل مخالفة متكررة']);
 }),/permission denied/i);
 await assert.rejects(pg.query(sql,[actor,actor,'spam','يتضمن الحساب رسائل مخالفة متكررة']),/member_report_no_self/);
 const first=await write(other);
 assert.ok(Number(first.rows[0].report_number)>0);
 await assert.rejects(write(other),/duplicate key|unique constraint/i);
 await write(third);await write(fourth);
 await assert.rejects(write(fifth),/MEMBER_REPORT_LIMIT/);
 assert.equal((await pg.query('select count(*)::int as n from public.member_profile_reports')).rows[0].n,3);

 const protectedTable=(await pg.query("select relrowsecurity from pg_class where oid='public.member_profile_reports'::regclass")).rows[0];
 assert.equal(protectedTable.relrowsecurity,true);
});

test('only authenticated members can view a public profile and actions reuse existing block system',()=>{
 const api=read('app/api/members/[id]/route.js');
 const client=read('components/members/MemberProfile.jsx');
 const messenger=read('app/api/messages/route.js');
 const nav=read('components/admin/AdminNavigation.jsx');
 const admin=read('app/api/admin/member-reports/route.js');
 assert.match(api,/authorizeAudience\(request,db\)/);
 assert.match(api,/select\('user_id,display_name,avatar_url,show_avatar,created_at,suspended,deletion_requested_at'\)/);
 assert.match(api,/p\.show_avatar\?p\.avatar_url:null/);
 assert.match(api,/validateMemberReport\(body\)/);
 assert.match(api,/\.from\('member_profile_reports'\)/);
 assert.match(api,/if\(actor\.id===target\)/);
 assert.match(api,/private_user_blocks/);
 assert.match(client,/href=\{'\/messages\?to='\+encodeURIComponent\(memberId\)\}/);
 assert.match(client,/action:'block'/);
 assert.match(client,/action:'unblock'/);
 assert.match(client,/action:'report'/);
 assert.match(client,/\/api\/messages/);
 assert.match(messenger,/if\(mode==='contact'\)return json\(await directContact/);
 assert.match(messenger,/prefResult\.data\?\.allow_requests===false/);
 assert.match(messenger,/blockResult\.data/);
 assert.match(admin,/authorizeEditorRequest/);
 assert.match(admin,/actor\.role!=='management'/);
 assert.match(nav,/\/admin\/member-reports/);
});

test('names and avatars link to real accounts; anonymous and pseudonymous identities stay private',()=>{
 const member=read('components/members/MemberLink.jsx');
 const debate=read('components/debates/DebateArena.jsx');
 const task=read('components/tasks/TaskDiscussion.jsx');
 const inbox=read('components/messages/PrivateMessaging.jsx');
 const leaderboard=read('components/games/Leaderboard.jsx');
 const gamesApi=read('app/api/games/leaderboard/route.js');
 const school=read('components/school/SchoolCompetition.jsx');
 const sql=read('supabase/migrations/20261103131556_debate_member_profile_links_only_visible.sql');
 assert.match(member,/const path=memberProfilePath\(id\)/);
 assert.match(debate,/MemberLink id=\{item\.member_id\}/);
 assert.match(task,/MemberLink id=\{comment\.author_id\}/);
 assert.match(inbox,/MemberLink id=\{c\.partner_id\}/);
 assert.match(inbox,/MemberLink id=\{p\.id\}/);
 assert.match(leaderboard,/MemberLink id=\{player\.member_id\}/);
 assert.match(gamesApi,/signedIn\?\{member_id:id\}/);
 assert.ok(!school.includes('member_id')&&!school.includes('MemberLink'),'chosen pseudonyms must not expose user IDs');
 assert.match(sql,/case when not q\.anonymous/);
 assert.match(sql,/p\.deletion_requested_at is null/);
});
