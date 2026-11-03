import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validateMessagingAction} from '../lib/privateMessaging.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const initial=read('supabase/migrations/20261103033657_private_messaging.sql');
const patch=read('supabase/migrations/20261103220826_private_message_edit_delete.sql');
const a='30000000-0000-4000-8000-000000000001';
const b='30000000-0000-4000-8000-000000000002';
const c='30000000-0000-4000-8000-000000000003';
const mutate=(pg,actor,verb,conversation,message,text=null)=>pg.query(
 'select public.private_messaging_message_mutate($1,$2,$3,$4,$5) as result',
 [actor,verb,conversation,message,text]
).then(r=>r.rows[0].result);
const action=(pg,actor,verb,opts={})=>pg.query(
 'select public.private_messaging_action($1,$2,$3,$4,$5,$6,$7::jsonb) as result',
 [actor,verb,opts.target||null,opts.conversation||null,opts.text??null,null,'{}']
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
 for(const [id,name] of [[a,'A'],[b,'B'],[c,'C']]){
  await pg.query('insert into auth.users values($1,$2,$3)',[id,'2026-01-01',null]);
  await pg.query('insert into public.public_profiles(user_id,display_name) values($1,$2)',[id,name]);
 }
 await pg.exec(initial);
 await pg.exec(patch);
 return pg;
}

test('edit and delete validate message ownership, identifiers and body size',()=>{
 assert.throws(()=>validateMessagingAction({action:'edit',conversation:a,message:'bad',text:'test'}),/الرسالة/);
 assert.throws(()=>validateMessagingAction({action:'delete',conversation:a,message:'bad'}),/الرسالة/);
 assert.throws(()=>validateMessagingAction({action:'edit',conversation:a,message:b,text:'  '}),/نص التعديل/);
 assert.throws(()=>validateMessagingAction({action:'edit',conversation:a,message:b,text:'x'.repeat(2001)}),/نص التعديل/);
 assert.equal(validateMessagingAction({action:'edit',conversation:a,message:b,text:' رسالة '}).p_text,'رسالة');
 assert.equal(validateMessagingAction({action:'delete',conversation:a,message:b}).p_text,null);
 assert.equal(validateMessagingAction({action:'delete',conversation:a,message:b}).p_message,b);
});

test('only the author can edit or delete, edited flag persists and deletion removes body',async t=>{
 const pg=await fixture(t);
 const request=await action(pg,a,'request',{target:b,text:'hello'});
 await action(pg,b,'accept',{conversation:request.id});
 const msg=await action(pg,a,'send',{conversation:request.id,text:'الأصل'});
 await assert.rejects(mutate(pg,b,'edit',request.id,msg.message_id,'غير مسموح'),/MESSAGE_NOT_FOUND/);
 await assert.rejects(mutate(pg,c,'delete',request.id,msg.message_id),/MESSAGE_NOT_FOUND/);
 await mutate(pg,a,'edit',request.id,msg.message_id,'تم التعديل');
 const edited=(await pg.query('select body,edited_at,deleted_at from public.private_messages where id=$1',[msg.message_id])).rows[0];
 assert.equal(edited.body,'تم التعديل');
 assert.ok(edited.edited_at);
 assert.equal(edited.deleted_at,null);
 await mutate(pg,a,'delete',request.id,msg.message_id);
 const deleted=(await pg.query('select body,deleted_at from public.private_messages where id=$1',[msg.message_id])).rows[0];
 assert.equal(deleted.body,'حذفت الرسالة');
 assert.ok(deleted.deleted_at);
 await assert.rejects(mutate(pg,a,'edit',request.id,msg.message_id,'لا يمكن'),/MESSAGE_ALREADY_DELETED/);
 await assert.rejects(mutate(pg,a,'delete',request.id,msg.message_id),/MESSAGE_ALREADY_DELETED/);
});

test('browser roles cannot mutate messages directly or execute the protected RPC',async t=>{
 const pg=await fixture(t);
 const checks=(await pg.query("select has_function_privilege('authenticated','public.private_messaging_message_mutate(uuid,text,uuid,uuid,text)','EXECUTE') as rpc,has_table_privilege('authenticated','public.private_messages','UPDATE') as updates")).rows[0];
 assert.equal(checks.rpc,false);
 assert.equal(checks.updates,false);
});

test('client shows edit/copy/delete above double-tapped bubble and live edited/deleted states',()=>{
 const ui=read('components/messages/PrivateMessaging.jsx');
 const css=read('components/messages/PrivateMessaging.module.css');
 const api=read('app/api/messages/route.js');
 assert.match(ui,/onDoubleClick=\{event=>\{event\.preventDefault\(\);openMessageMenu/);
 assert.match(ui,/onTouchEnd=\{event=>onMessageTouchEnd/);
 assert.match(ui,/tabIndex=\{entry\.message\.deleted_at\?-1:0\}/);
 assert.match(ui,/className=\{styles\.messageMenu\}/);
 assert.match(ui,/entry\.message\.edited_at&&!entry\.message\.deleted_at/);
 assert.match(ui,/entry\.message\.deleted_at\?'حذفت الرسالة':entry\.message\.body/);
 assert.match(ui,/navigator\.clipboard\.writeText\(message\.body\)/);
 assert.match(css,/copyToastFade \.5s ease-out forwards/);
 assert.match(css,/\.editedLabel\{[^}]*color:var\(--c-caution\)/);
 assert.match(css,/\.bubbleContent \.deletedText\{color:var\(--c-caution\)\}/);
 assert.match(api,/edited_at,deleted_at/);
 assert.match(api,/private_messaging_message_mutate/);
 assert.match(ui,/event:'\*',schema:'public',table:'private_messages'/);
});
