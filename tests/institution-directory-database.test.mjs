import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const admin='10000000-0000-4000-8000-000000000001',manager='10000000-0000-4000-8000-000000000002';
const base={stable_key:'test:university',slug:'test-university',name_ar:'جامعة اختبار موثقة',institution_type:'university',ownership:'government',summary:'سجل معزول لاختبار سلامة الدليل.',social_links:[],languages:[],study_modes:[],education_levels:[],accreditation_status:'not_asserted',accrediting_body:'',operating_status:'unknown',verification_status:'verified',verified_at:'2026-10-25',is_published:true};
const sources=[{title:'مصدر رسمي للاختبار',url:'https://example.test/source',publisher:'جهة رسمية',source_type:'government',checked_at:'2026-10-25',note:''}];

test('directory migration runs in isolation and enforces atomic saves, RLS, CAS and recoverable deletion',async()=>{
 const db=new PGlite();
 const run=async(role,user,sql,params=[])=>db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[user||'',role]);await tx.exec(`set local role ${role}`);return tx.query(sql,params);});
 try{
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
   grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
   create table public.editors(user_id uuid primary key references auth.users(id),role text not null);
   create function public.is_editor() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.editors where user_id=auth.uid() and role in ('admin','management'))$$;
   grant execute on function public.is_editor() to anon,authenticated,service_role;
   create table public.editorial_contributions(transaction_id bigint not null,content_type text not null,content_id text not null,action text not null,changed_fields text[] not null default '{}',unique(transaction_id,content_type,content_id));
   create function public.editorial_emit(p_type text,p_section text,p_id text,p_before jsonb,p_after jsonb,p_path text,p_fields text[] default null) returns void language plpgsql security definer set search_path='' as $$declare b jsonb:=coalesce(p_before,'{}')-array['updated_at','created_at','revision'];a jsonb:=coalesce(p_after,'{}')-array['updated_at','created_at','revision'];begin if p_before is not null and p_after is not null and b=a and coalesce(cardinality(p_fields),0)=0 then return;end if;insert into public.editorial_contributions values(txid_current(),p_type,p_id,case when p_before is null then 'create' when p_after is null then 'delete' else 'update' end,coalesce(p_fields,'{}')) on conflict(transaction_id,content_type,content_id) do update set changed_fields=editorial_contributions.changed_fields||excluded.changed_fields;end$$;
   create table public.preexisting_data(id int primary key,value text);insert into public.preexisting_data values(1,'preserved');
   insert into auth.users(id,email_confirmed_at) values('${admin}',now()),('${manager}',now());insert into public.editors values('${admin}','admin'),('${manager}','management');`);
  await db.exec(await fs.readFile(new URL('../supabase/migrations/202610250007_institution_directories.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select value from public.preexisting_data')).rows[0].value,'preserved');
  const save=`select public.directory_save_university($1::uuid,$2::bigint,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::text) value`;
  const inserted=await run('service_role',null,save,[null,null,JSON.stringify(base),'[]','[]',JSON.stringify(sources),'import:test']);
  const id=inserted.rows[0].value.id;
  assert.equal((await run('anon',null,'select count(*)::int count from public.universities')).rows[0].count,1);
  await assert.rejects(run('authenticated',admin,"update public.universities set summary='forged' where id=$1",[id]),/permission denied/i);
  const first=await run('authenticated',admin,save,[id,1,JSON.stringify({...base,summary:'تعديل أول موثق'}),'[]','[]',JSON.stringify(sources),'admin:directory']);
  assert.equal(first.rows[0].value.revision,2);
  await assert.rejects(run('authenticated',admin,save,[id,1,JSON.stringify({...base,summary:'تعديل متزامن قديم'}),'[]','[]',JSON.stringify(sources),'admin:directory']),/Stale university revision/);
  const eventsBefore=(await db.query('select count(*)::int count from public.editorial_contributions')).rows[0].count;
  const unchanged=await run('authenticated',admin,save,[id,2,JSON.stringify({...base,summary:'تعديل أول موثق'}),'[]','[]',JSON.stringify(sources),'admin:directory']);
  assert.equal(unchanged.rows[0].value.revision,3);
  assert.equal((await db.query('select count(*)::int count from public.editorial_contributions')).rows[0].count,eventsBefore,'semantic no-op emits no contribution');
  await assert.rejects(run('authenticated',admin,"select public.directory_set_deleted('university',$1,3,true)",[id]),/Management role required/);
  await run('authenticated',manager,"select public.directory_set_deleted('university',$1,3,true)",[id]);
  assert.equal((await run('anon',null,'select count(*)::int count from public.universities')).rows[0].count,0);
  assert.equal((await run('authenticated',admin,'select count(*)::int count from public.universities')).rows[0].count,1);
  await assert.rejects(run('service_role',null,save,[null,null,JSON.stringify({...base,stable_key:'test:no-source',slug:'test-no-source'}),'[]','[]','[]','import:test']),/requires a source/);
 }finally{await db.close();}
});
