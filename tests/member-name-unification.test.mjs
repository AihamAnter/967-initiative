import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {accountRow} from '../lib/managementUsers.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids={
 old:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 existing:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 email:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 oauth:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 named:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 invalid:'ffffffff-ffff-4fff-8fff-ffffffffffff'
};

test('profile migration backfills entered names but preserves chosen profiles and debate consent',async t=>{
 const pg=new PGlite();t.after(()=>pg.close());
 await pg.exec([
  'create role anon nologin',
  'create role authenticated nologin',
  'create schema auth',
  "create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb,created_at timestamptz not null default now())",
  'create table public.public_profiles(user_id uuid primary key references auth.users(id),display_name text not null,terms_accepted_at timestamptz,created_at timestamptz not null default now())',
  "create function public.debate_profile_signup() returns trigger language plpgsql as $$begin return new;end$$",
  'create trigger debate_profile_signup after insert on auth.users for each row execute function public.debate_profile_signup()'
 ].join(';\n')+';');
 const insert=async(id,meta)=>pg.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,JSON.stringify(meta)]);
 await insert(ids.old,{full_name:'  هدى القحطاني  '});
 await insert(ids.existing,{full_name:'الاسم الأساسي',display_name:'الاسم المُختار'});
 await pg.query('insert into public.public_profiles(user_id,display_name,terms_accepted_at) values($1,$2,now())',[ids.existing,'اسم عرض مخصص']);
 await pg.exec(read('supabase/migrations/20261103142658_unify_public_member_names_signup_and_backfill.sql'));
 const old=(await pg.query('select display_name,terms_accepted_at from public.public_profiles where user_id=$1',[ids.old])).rows[0];
 const existing=(await pg.query('select display_name,terms_accepted_at from public.public_profiles where user_id=$1',[ids.existing])).rows[0];
 assert.equal(old.display_name,'هدى القحطاني');
 assert.equal(old.terms_accepted_at,null,'a public profile must not imply debate terms acceptance');
 assert.equal(existing.display_name,'اسم عرض مخصص','existing chosen names must not be overwritten');
 assert.ok(existing.terms_accepted_at!==null);
 await insert(ids.email,{display_name:'صالح العريقي',full_name:'صالح العريقي',audience_terms:true});
 await insert(ids.oauth,{full_name:'  ليلى أحمد  '});
 await insert(ids.named,{name:'ياسمين محمد'});
 await insert(ids.invalid,{full_name:'X'});
 const rows=(await pg.query('select user_id,display_name,terms_accepted_at from public.public_profiles')).rows;
 const byId=new Map(rows.map(p=>[p.user_id,p]));
 assert.equal(byId.get(ids.email)?.display_name,'صالح العريقي');
 assert.ok(byId.get(ids.email)?.terms_accepted_at,'accepted debate terms recorded on email signup');
 assert.equal(byId.get(ids.oauth)?.display_name,'ليلى أحمد');
 assert.equal(byId.get(ids.oauth)?.terms_accepted_at,null,'OAuth profile should not imply debate consent');
 assert.equal(byId.get(ids.named)?.display_name,'ياسمين محمد');
 assert.equal(byId.has(ids.invalid),false,'do not invent public names without a valid entered name');
 const functions=(await pg.query("select has_function_privilege('anon','public.debate_profile_signup()','execute') as guest,has_function_privilege('authenticated','public.debate_profile_signup()','execute') as member")).rows[0];
 assert.deepEqual(functions,{guest:false,member:false});
});

test('new email registrations store one chosen name for both Auth fields',()=>{
 const form=read('components/debates/AudienceAuth.jsx');
 assert.match(form,/data:\{display_name:displayName,full_name:displayName,audience_terms:true\}/);
 assert.match(form,/هذا الاسم سيظهر في ملفك الشخصي وبحث الأعضاء/);
 const sql=read('supabase/migrations/20261103142658_unify_public_member_names_signup_and_backfill.sql');
 assert.ok(sql.indexOf("raw_user_meta_data->>'display_name'")<sql.lastIndexOf("raw_user_meta_data->>'full_name'"));
});

test('management, account pages and search use the same public display name',()=>{
 const auth={id:ids.existing,email:'private@example.test',user_metadata:{full_name:'اسم تسجيل الدخول'},app_metadata:{provider:'google'}};
 const row=accountRow(auth,null,Date.now(),'اسم عرض مخصص');
 assert.equal(row.name,'اسم عرض مخصص');
 assert.equal(accountRow(auth,null).name,'اسم تسجيل الدخول','safe fallback if no public profile exists');
 const api=read('app/api/admin/users/route.js');
 assert.match(api,/\.from\('public_profiles'\)\.select\('user_id,display_name'\)/);
 assert.match(api,/profileNames\.get\(user\.id\)/);
 const account=read('components/account/AccountWorkspace.jsx');
 const legacy=read('components/debates/AudienceAccount.jsx');
 assert.match(account,/profile\?\.display_name\|\|user\.user_metadata\?\.display_name/);
 assert.match(legacy,/!account\.profile\?\.terms_accepted_at/);
 assert.match(account,/!profile\?\.terms_accepted_at&&<label/);
 assert.match(account,/accepted:Boolean\(profile\?\.terms_accepted_at\)\|\|profileForm\.accepted_terms===true/);
});
