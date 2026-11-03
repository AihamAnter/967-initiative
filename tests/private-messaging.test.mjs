import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validateMessagingAction,safeMessagingQuery} from '../lib/privateMessaging.js';

const migration=readFileSync(new URL('../supabase/migrations/20261103033657_private_messaging.sql',import.meta.url),'utf8');
const U={
 a:'30000000-0000-4000-8000-000000000001',
 b:'30000000-0000-4000-8000-000000000002',
 c:'30000000-0000-4000-8000-000000000003',
 unconfirmed:'30000000-0000-4000-8000-000000000004',
 banned:'30000000-0000-4000-8000-000000000005'
};
async function fixture(t){
 const pg=new PGlite();
 t.after(()=>pg.close());
 await pg.exec([
  'create role anon nologin','create role authenticated nologin','create role service_role nologin',
  'create schema auth',
  'create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz)',
  'create table public.public_profiles(user_id uuid primary key references auth.users(id),display_name text not null,avatar_url text,show_avatar boolean not null default false,suspended boolean not null default false,deletion_requested_at timestamptz)',
  'create table public.account_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null,kind text not null,title text not null,description text,href text,created_at timestamptz default now(),read_at timestamptz)',
  "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$",
  'grant usage on schema auth,public to authenticated,anon',
  'grant execute on function auth.uid() to authenticated'
 ].join(';\n')+';');
 for(const [name,id] of Object.entries(U)){
  await pg.query('insert into auth.users values($1,$2,$3)',[id,name==='unconfirmed'?null:'2026-01-01',name==='banned'?'2099-01-01':null]);
  await pg.query('insert into public.public_profiles(user_id,display_name) values($1,$2)',[id,name.toUpperCase()]);
 }
 await pg.exec(migration);
 return pg;
}
const action=(pg,actor,verb,opts={})=>pg.query(
 'select public.private_messaging_action($1,$2,$3,$4,$5,$6,$7::jsonb) as out',
 [actor,verb,opts.target||null,opts.conversation||null,opts.text??null,opts.message||null,JSON.stringify(opts.options||{})]
).then(r=>r.rows[0].out);
const current=(pg,actor,sql)=>pg.transaction(async tx=>{
 await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
 await tx.exec('set local role authenticated');
 return tx.query(sql);
});

test('validated message actions reject invalid IDs, bodies and settings',()=>{
 assert.throws(()=>validateMessagingAction({action:'send',conversation:'bad',text:'test'}),/المحادثة/);
 assert.throws(()=>validateMessagingAction({action:'request',target:U.b,text:'  '}),/رسالة الطلب/);
 assert.throws(()=>validateMessagingAction({action:'settings',discoverable:'yes',allow_requests:true,notify_messages:true}),/إعدادات/);
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=thread&id=bad')),/المحادثة/);
 assert.equal(validateMessagingAction({action:'send',conversation:U.a,text:'مرحبًا'}).p_text,'مرحبًا');
});

test('private messaging migration: acceptance gates messages, RLS isolates third parties and blocks work',async t=>{
 const pg=await fixture(t);
 assert.equal((await pg.query("select count(*)::int as n from public.private_conversations")).rows[0].n,0);
 // Search consent is opt-in, and can only be written via privileged action.
 await action(pg,U.b,'settings',{options:{discoverable:true,allow_requests:true,notify_messages:true}});
 const row=(await pg.query('select discoverable from public.private_messaging_settings where user_id=$1',[U.b])).rows[0];
 assert.equal(row.discoverable,true);
 const requested=await action(pg,U.a,'request',{target:U.b,text:'أريد الحديث معك'});
 assert.ok(requested.id);
 await assert.rejects(action(pg,U.a,'send',{conversation:requested.id,text:'قبل القبول'}),/MESSAGE_INVALID_STATE/);
 await assert.rejects(action(pg,U.a,'request',{target:U.b,text:'تكرار'}),/MESSAGE_ALREADY_EXISTS/);
 await assert.rejects(action(pg,U.a,'accept',{conversation:requested.id}),/MESSAGE_INVALID_STATE/);
 await action(pg,U.b,'accept',{conversation:requested.id});
 const message=await action(pg,U.a,'send',{conversation:requested.id,text:'هذه رسالة خاصة'});
 assert.ok(message.message_id);
 const inbox=(await pg.query('select * from public.private_messaging_inbox($1)',[U.b])).rows;
 assert.equal(inbox.length,1);
 assert.equal(Number(inbox[0].unread),1);
 const outsider=await current(pg,U.c,'select id,body from public.private_messages');
 assert.equal(outsider.rows.length,0,'Unrelated users cannot read another conversation');
 const recipient=await current(pg,U.b,'select body from public.private_messages');
 assert.equal(recipient.rows[0].body,'هذه رسالة خاصة');
 await assert.rejects(current(pg,U.c,"select public.private_messaging_action('"+U.c+"','request')"),/permission denied/i);
 await assert.rejects(current(pg,U.c,"insert into public.private_messages(conversation_id,sender_id,body) values('"+requested.id+"','"+U.c+"','attack')"),/permission denied/i);
 await action(pg,U.b,'block',{target:U.a});
 await assert.rejects(action(pg,U.a,'send',{conversation:requested.id,text:'blocked'}),/MESSAGE_REQUESTS_CLOSED/);
 await action(pg,U.b,'unblock',{target:U.a});
 await action(pg,U.a,'send',{conversation:requested.id,text:'after block'});
 const report=await action(pg,U.b,'report',{conversation:requested.id,message:message.message_id,text:'محتوى مزعج',options:{reason:'spam'}});
 assert.equal(report.ok,true);
 const snap=(await pg.query('select evidence from public.private_message_reports limit 1')).rows[0].evidence;
 assert.equal(snap,'هذه رسالة خاصة');
});

test('unconfirmed or banned accounts cannot request or send, rejection enforces cooldown',async t=>{
 const pg=await fixture(t);
 await assert.rejects(action(pg,U.unconfirmed,'request',{target:U.b,text:'test'}),/MESSAGE_AUTH_DENIED/);
 await assert.rejects(action(pg,U.banned,'request',{target:U.b,text:'test'}),/MESSAGE_AUTH_DENIED/);
 const x=await action(pg,U.a,'request',{target:U.b,text:'hi'});
 await action(pg,U.b,'decline',{conversation:x.id});
 await assert.rejects(action(pg,U.a,'request',{target:U.b,text:'again'}),/MESSAGE_ALREADY_EXISTS/);
});
