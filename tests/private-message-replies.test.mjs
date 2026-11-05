import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {placeMessageMenu} from '../lib/messageMenuPlacement.js';
import {validateMessagingAction,safeMessagingQuery} from '../lib/privateMessaging.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const initial=read('supabase/migrations/20261103033657_private_messaging.sql');
const replies=read('supabase/migrations/20261103222853_private_message_quote_replies.sql');
const a='30000000-0000-4000-8000-000000000001';
const b='30000000-0000-4000-8000-000000000002';
const c='30000000-0000-4000-8000-000000000003';
const perform=(pg,actor,action,opts={})=>pg.query(
 'select public.private_messaging_action($1,$2,$3,$4,$5,$6,$7::jsonb) as result',
 [actor,action,opts.target||null,opts.conversation||null,opts.text??null,opts.message||null,'{}']
).then(r=>r.rows[0].result);

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
 for(const id of [a,b,c]){
  await pg.query('insert into auth.users values($1,$2,$3)',[id,'2026-01-01',null]);
  await pg.query('insert into public.public_profiles(user_id,display_name) values($1,$2)',[id,id]);
 }
 await pg.exec(initial);
 await pg.exec(replies);
 return pg;
}

test('menu stays inside phone and desktop conversation viewports at all four corners',()=>{
 for(const screen of [
  {w:320,h:650,area:{left:9,right:311,top:80,bottom:565}},
  {w:390,h:844,area:{left:9,right:381,top:90,bottom:750}},
  {w:1440,h:900,area:{left:640,right:1340,top:150,bottom:770}}
 ]){
  const {area,w,h}=screen;
  for(const anchor of [
   {left:area.left+8,right:area.left+40,top:area.top+8,bottom:area.top+30},
   {left:area.right-45,right:area.right-8,top:area.top+8,bottom:area.top+30},
   {left:area.left+8,right:area.left+40,top:area.bottom-38,bottom:area.bottom-8},
   {left:area.right-45,right:area.right-8,top:area.bottom-38,bottom:area.bottom-8}
  ]){
   const menu=placeMessageMenu(anchor,area,225,43,w,h);
   assert.ok(menu.left>=area.left+6);
   assert.ok(menu.left+225<=area.right-6);
   assert.ok(menu.top>=area.top+6);
   assert.ok(menu.top+43<=area.bottom-6);
  }
 }
});

test('reply validation enforces UUID and permits a focused historical jump',()=>{
 assert.equal(validateMessagingAction({action:'send',conversation:a,message:b,text:'رد'}).p_message,b);
 assert.throws(()=>validateMessagingAction({action:'send',conversation:a,message:'bad',text:'رد'}),/المقتبسة/);
 assert.equal(safeMessagingQuery(new URLSearchParams('mode=thread&id='+a+'&around='+b)).around,b);
 assert.throws(()=>safeMessagingQuery(new URLSearchParams('mode=thread&id='+a+'&around=bad')),/الأصلية/);
});

test('reply references original and rejects quotes from another conversation',async t=>{
 const pg=await fixture(t);
 const first=await perform(pg,a,'request',{target:b,text:'hello'});
 await perform(pg,b,'accept',{conversation:first.id});
 const original=await perform(pg,a,'send',{conversation:first.id,text:'رسالة أصلية'});
 const reply=await perform(pg,b,'send',{conversation:first.id,message:original.message_id,text:'هذا رد'});
 const row=(await pg.query('select reply_to_message_id from public.private_messages where id=$1',[reply.message_id])).rows[0];
 assert.equal(row.reply_to_message_id,original.message_id);
 const second=await perform(pg,c,'request',{target:a,text:'hello'});
 await perform(pg,a,'accept',{conversation:second.id});
 await assert.rejects(perform(pg,c,'send',{conversation:second.id,message:original.message_id,text:'لا يجوز'}),/MESSAGE_INVALID_TARGET/);
 const count=(await pg.query('select count(*)::int as n from public.private_messages where conversation_id=$1',[second.id])).rows[0].n;
 assert.equal(count,0);
 const permissions=(await pg.query("select has_function_privilege('authenticated','public.private_messaging_action(uuid,text,uuid,uuid,text,uuid,jsonb)','EXECUTE') as browser_can_call")).rows[0];
 assert.equal(permissions.browser_can_call,false);
});

test('quote navigation and portal remain bounded inside the chat view',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 const api=read('app/api/messages/route.js');
 assert.match(ui,/createPortal\(/);
 assert.match(ui,/placeMessageMenu\(/);
 assert.match(ui,/pane\.addEventListener\('scroll',position/);
 assert.match(css,/\.messageMenu\{position:fixed;/);
 assert.doesNotMatch(css,/\.bubbleRow\[data-menu-open=true\]\{padding-top:48px\}/);
 assert.match(ui,/onClick=\{\(\)=>replyToMessage\(selectedMenuMessage\)\}>رد/);
 assert.match(ui,/className=\{styles\.messageQuote\}/);
 assert.match(ui,/jumpToOriginal\(entry\.message\.reply_to_message_id\)/);
 assert.match(ui,/\(historical\|\|showLatestJump\)&&<button type="button" className=\{styles\.latest\} onClick=\{returnToLatest\}>الانتقال إلى أحدث رسالة/);
 assert.match(api,/reply_to_message_id/);
 assert.match(api,/\.eq\('conversation_id',conversation\)\.eq\('id',around\)/);
 assert.match(replies,/m\.conversation_id=c\.id/);
});
