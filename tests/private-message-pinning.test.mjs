import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validateMessagingAction} from '../lib/privateMessaging.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base=read('supabase/migrations/20261103033657_private_messaging.sql');
const edits=read('supabase/migrations/20261103220826_private_message_edit_delete.sql');
const replies=read('supabase/migrations/20261103222853_private_message_quote_replies.sql');
const pins=read('supabase/migrations/20261104182604_private_message_conversation_pin.sql');
const A='30000000-0000-4000-8000-000000000001';
const B='30000000-0000-4000-8000-000000000002';
const C='30000000-0000-4000-8000-000000000003';

const action=(pg,actor,verb,opts={})=>pg.query(
 'select public.private_messaging_action($1,$2,$3,$4,$5,$6,$7::jsonb) as result',
 [actor,verb,opts.target||null,opts.conversation||null,opts.text??null,null,'{}']
).then(result=>result.rows[0].result);
const setPin=(pg,actor,conversation,message,remove=false)=>pg.query(
 'select public.private_messaging_set_pin($1,$2,$3,$4) as result',
 [actor,conversation,message,remove]
).then(result=>result.rows[0].result);
const getPin=(pg,conversation)=>pg.query(
 'select pinned_message_id,pinned_by,pinned_at from public.private_conversations where id=$1',
 [conversation]
).then(result=>result.rows[0]);

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
 for(const [id,name] of [[A,'A'],[B,'B'],[C,'C']]){
  await pg.query('insert into auth.users values($1,$2,$3)',[id,'2026-01-01',null]);
  await pg.query('insert into public.public_profiles(user_id,display_name) values($1,$2)',[id,name]);
 }
 await pg.exec(base);
 await pg.exec(edits);
 await pg.exec(replies);
 await pg.exec(pins);
 return pg;
}

test('pin action validates authenticated conversation and message IDs',()=>{
 assert.equal(validateMessagingAction({action:'pin',conversation:A,message:B}).p_message,B);
 assert.equal(validateMessagingAction({action:'unpin',conversation:A,message:B}).p_action,'unpin');
 assert.throws(()=>validateMessagingAction({action:'pin',conversation:A,message:'invalid'}),/التثبيت/);
 assert.throws(()=>validateMessagingAction({action:'unpin',conversation:'invalid',message:B}),/المحادثة/);
});

test('both participants can share, replace and unpin one message',async t=>{
 const pg=await fixture(t);
 const c=await action(pg,A,'request',{target:B,text:'hello'});
 await action(pg,B,'accept',{conversation:c.id});
 const m1=await action(pg,A,'send',{conversation:c.id,text:'الرسالة الأولى'});
 const m2=await action(pg,B,'send',{conversation:c.id,text:'الرسالة الثانية'});
 await setPin(pg,B,c.id,m1.message_id);
 assert.equal((await getPin(pg,c.id)).pinned_message_id,m1.message_id);
 assert.equal((await getPin(pg,c.id)).pinned_by,B);
 await setPin(pg,A,c.id,m2.message_id);
 assert.equal((await getPin(pg,c.id)).pinned_message_id,m2.message_id);
 await assert.rejects(setPin(pg,B,c.id,m1.message_id,true),/MESSAGE_PIN_CHANGED/);
 await setPin(pg,B,c.id,m2.message_id,true);
 const cleared=await getPin(pg,c.id);
 assert.equal(cleared.pinned_message_id,null);
 assert.equal(cleared.pinned_by,null);
 assert.equal(cleared.pinned_at,null);
});

test('outsiders and messages from another thread cannot be pinned',async t=>{
 const pg=await fixture(t);
 const one=await action(pg,A,'request',{target:B,text:'hello'});
 await action(pg,B,'accept',{conversation:one.id});
 const m1=await action(pg,A,'send',{conversation:one.id,text:'سري'});
 const two=await action(pg,A,'request',{target:C,text:'hello'});
 await action(pg,C,'accept',{conversation:two.id});
 await assert.rejects(setPin(pg,C,one.id,m1.message_id),/MESSAGE_NOT_FOUND/);
 await assert.rejects(setPin(pg,A,two.id,m1.message_id),/MESSAGE_INVALID_TARGET/);
 assert.equal((await getPin(pg,one.id)).pinned_message_id,null);
});

test('deleting a pinned message clears pin automatically and prevents re-pinning',async t=>{
 const pg=await fixture(t);
 const c=await action(pg,A,'request',{target:B,text:'hello'});
 await action(pg,B,'accept',{conversation:c.id});
 const m=await action(pg,A,'send',{conversation:c.id,text:'رسالة ستحذف'});
 await setPin(pg,B,c.id,m.message_id);
 await pg.query('select public.private_messaging_message_mutate($1,$2,$3,$4,$5)',[A,'delete',c.id,m.message_id,null]);
 assert.equal((await getPin(pg,c.id)).pinned_message_id,null);
 await assert.rejects(setPin(pg,B,c.id,m.message_id),/MESSAGE_INVALID_TARGET/);
});

test('pinning stays server-only with no browser write access',async t=>{
 const pg=await fixture(t);
 const permission=(await pg.query(
  "select has_function_privilege('authenticated','public.private_messaging_set_pin(uuid,uuid,uuid,boolean)','EXECUTE') as browser_execute,has_function_privilege('anon','public.private_messaging_set_pin(uuid,uuid,uuid,boolean)','EXECUTE') as anon_execute,has_table_privilege('authenticated','public.private_conversations','UPDATE') as browser_update"
 )).rows[0];
 assert.equal(permission.browser_execute,false);
 assert.equal(permission.anon_execute,false);
 assert.equal(permission.browser_update,false);
});

test('pin controls and responsive banner are wired to the existing jump-to-source',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 const route=read('app/api/messages/route.js');
 assert.match(ui,/className=\{styles\.pinnedBar\}/);
 assert.match(ui,/jumpToOriginal\(thread\.pinned_message\.id\)/);
 assert.match(ui,/togglePin\(thread\.pinned_message,true\)/);
 assert.match(ui,/thread\?\.pinned_message\?\.id===selectedMenuMessage\.id\?'إلغاء التثبيت':'تثبيت'/);
 assert.match(ui,/pinned_message:data\.pinned_message\|\|null/);
 assert.match(css,/\.pinnedSummary>span\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/\.pinnedBar\{display:flex;/);
 assert.match(route,/async function pinnedMessage\(db,conversation\)/);
 assert.match(route,/private_messaging_set_pin/);
 assert.match(route,/pinned_message:await pinnedMessage\(db,c\)/);
 assert.match(pins,/m\.conversation_id=p_conversation/);
 assert.match(pins,/m\.deleted_at is null/);
});
