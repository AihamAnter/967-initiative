import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createLocalPostgresDatabase} from './localPostgresDatabase.mjs';
export const securityUsers={admin:'10000000-0000-4000-8000-000000000001',manager:'10000000-0000-4000-8000-000000000002',regular:'10000000-0000-4000-8000-000000000003',unconfirmed:'10000000-0000-4000-8000-000000000004',suspended:'10000000-0000-4000-8000-000000000005',revoked:'10000000-0000-4000-8000-000000000006',manager2:'10000000-0000-4000-8000-000000000007'};
export const securitySql=name=>readFile(new URL('../../supabase/'+name,import.meta.url),'utf8');
export async function createPrelaunchSecurityDatabase(){
 const real=process.env.TEST_SECURITY_POSTGRES_ADMIN_URL;
 const pg=real?await createLocalPostgresDatabase(real):new PGlite();
 await pg.exec(`${real?'':'create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;'}
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`);
 await pg.exec((await securitySql('schema.sql')).replace('create extension if not exists pgcrypto;',''));
 for(const [name,id] of Object.entries(securityUsers))await pg.query('insert into auth.users(id,email,email_confirmed_at,banned_until) values($1,$2,$3,$4)',[id,name+'@example.test',name==='unconfirmed'?null:'2026-01-01',name==='suspended'?'2099-01-01':null]);
 for(const name of ['admin','manager','unconfirmed','suspended','revoked','manager2'])await pg.query('insert into public.editors(user_id) values($1)',[securityUsers[name]]);
 await pg.exec(await securitySql('admin-roles.sql'));
 await pg.query("update public.editors set role=case when user_id in ($1,$2) then 'management' else 'admin' end",[securityUsers.manager,securityUsers.manager2]);
 await pg.exec((await securitySql('yemen-in-numbers.sql')).split('insert into public.stat_sections')[0].replace('create extension if not exists pgcrypto;',''));
 await pg.exec(await securitySql('task-center.sql'));
 await pg.exec(await securitySql('archive/legacy-migrations/202610200001_debates.sql'));
 const run=(user,sql,params=[],role=user?'authenticated':'anon')=>pg.transaction(async tx=>{
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);await tx.exec('set local role '+role);return tx.query(sql,params);
 });
 const migrate=async()=>{for(const file of ['202610230001_prelaunch_roles_rls.sql','202610230002_management_guard.sql','202610230003_contact_workflow.sql'])await pg.exec(await securitySql('archive/legacy-migrations/'+file));};
 return {pg,run,migrate,close:()=>pg.close()};
}
