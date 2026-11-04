import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {isMessageRead} from '../lib/privateMessaging.js';

const migration=readFileSync(new URL('../supabase/migrations/20261103033657_private_messaging.sql',import.meta.url),'utf8');
const edits=readFileSync(new URL('../supabase/migrations/20261103220826_private_message_edit_delete.sql',import.meta.url),'utf8');
const A='30000000-0000-4000-8000-000000000001';
const B='30000000-0000-4000-8000-000000000002';
const C='30000000-0000-4000-8000-000000000003';
const act=(pg,actor,verb,p={})=>pg.query(
 'select public.private_messaging_action($1,$2,$3,$4,$5,$6,$7::jsonb) as out',
 [actor,verb,p.target||null,p.conversation||null,p.text??null,null,'{}']
).then(r=>r.rows[0].out);

async function setup(t){
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
 for(const id of [A,B,C]){
  await pg.query('insert into auth.users values($1,$2,$3)',[id,'2026-01-01',null]);
  await pg.query('insert into public.public_profiles(user_id,display_name) values($1,$2)',[id,id]);
 }
 await pg.exec(migration);
 await pg.exec(edits);
 return pg;
}

test('receipt switches to read only after the other participant reads a sent message',async t=>{
 const pg=await setup(t);
 const request=await act(pg,A,'request',{target:B,text:'hello'});
 await act(pg,B,'accept',{conversation:request.id});
 await pg.query("update public.private_conversation_states set last_read_at='2020-01-01T00:00:00Z' where conversation_id=$1 and user_id=$2",[request.id,B]);
 const sent=await act(pg,A,'send',{conversation:request.id,text:'رسالة تحتاج قراءة'});
 const message=(await pg.query('select sender_id,created_at from public.private_messages where id=$1',[sent.message_id])).rows[0];
 const previous=(await pg.query('select last_read_at from public.private_conversation_states where conversation_id=$1 and user_id=$2',[request.id,B])).rows[0];
 assert.equal(isMessageRead(message,A,previous.last_read_at),false);
 await act(pg,B,'read',{conversation:request.id});
 const received=(await pg.query('select last_read_at from public.private_conversation_states where conversation_id=$1 and user_id=$2',[request.id,B])).rows[0];
 assert.equal(isMessageRead(message,A,received.last_read_at),true);
});

test('text search returns only matching nondeleted messages inside the selected conversation',async t=>{
 const pg=await setup(t);
 const first=await act(pg,A,'request',{target:B,text:'hello'});
 await act(pg,B,'accept',{conversation:first.id});
 const other=await act(pg,A,'request',{target:C,text:'hello'});
 await act(pg,C,'accept',{conversation:other.id});
 const deleted=await act(pg,A,'send',{conversation:first.id,text:'اليمن رسالة تم حذفها'});
 const kept=await act(pg,B,'send',{conversation:first.id,text:'اليمن رسالة يجب إيجادها'});
 await act(pg,A,'send',{conversation:other.id,text:'اليمن في محادثة أخرى'});
 await pg.query('select public.private_messaging_message_mutate($1,$2,$3,$4,$5)',[A,'delete',first.id,deleted.message_id,null]);
 const search=(await pg.query(
  "select id from public.private_messages where conversation_id=$1 and deleted_at is null and body ilike $2 order by created_at desc limit 26",
  [first.id,'%اليمن%']
 )).rows.map(m=>m.id);
 assert.deepEqual(search,[kept.message_id]);
 const permissions=(await pg.query("select has_table_privilege('authenticated','public.private_conversation_states','SELECT') as client_access")).rows[0];
 assert.equal(permissions.client_access,false);
});
