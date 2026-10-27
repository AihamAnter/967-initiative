import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {electricityEditorialDraft,validateIndicatorEditorial} from '../lib/indicatorEditorial.js';

const ids={
  editor:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  visitor:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  indicator:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
};

test('editorial migration: draft isolation, guarded writes, published reads and concurrent revision safety',async t=>{
  const pg=new PGlite();t.after(()=>pg.close());
  await pg.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable
      as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.editors(user_id uuid primary key references auth.users(id),role text);
    create table public.stat_indicators(id uuid primary key,is_published boolean default true,
      hide_when_incomplete boolean default false,data_status text default 'partial');
    grant usage on schema public,auth to anon,authenticated;
    grant select on public.stat_indicators to anon,authenticated;
    create function public.editorial_can_read() returns boolean language sql stable security definer
      set search_path to '' as $$select exists(
        select 1 from public.editors e join auth.users u on e.user_id=u.id
        where e.user_id=auth.uid() and e.role in ('admin','management') and u.email_confirmed_at is not null
      )$$;`);
  await pg.query('insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now())',[ids.editor,ids.visitor]);
  await pg.query("insert into public.editors values($1,'admin')",[ids.editor]);
  await pg.query('insert into public.stat_indicators(id,is_published,hide_when_incomplete,data_status) values($1,true,false,\'partial\')',[ids.indicator]);
  const migration=await readFile(new URL('../supabase/migrations/20261027004810_stat_indicator_editorial.sql',import.meta.url),'utf8');
  await pg.exec(migration);
  const run=async(user,sql,params=[])=>pg.transaction(async tx=>{
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);
    await tx.exec('set local role '+(user?'authenticated':'anon'));
    return tx.query(sql,params);
  });
  const save=(user,revision,payload)=>run(user,
    'select to_jsonb(public.editorial_stat_indicator_enrichment_save($1::uuid,$2::bigint,$3::jsonb)) as saved',
    [ids.indicator,revision,JSON.stringify(payload)]);
  const select=(user)=>run(user,'select indicator_id,intro,is_published,revision from public.stat_indicator_editorial');
  const draft=validateIndicatorEditorial(electricityEditorialDraft);
  await assert.rejects(save(null,null,draft),{code:'42501'});
  await assert.rejects(save(ids.visitor,null,draft),{code:'42501'});
  assert.equal((await select(null)).rows.length,0);
  const inserted=await save(ids.editor,null,draft);
  assert.equal(inserted.rows[0].saved.is_published,false);
  assert.equal(Number(inserted.rows[0].saved.revision),1);
  assert.equal((await select(null)).rows.length,0);
  assert.equal((await select(ids.visitor)).rows.length,0);
  assert.equal((await select(ids.editor)).rows.length,1);
  await assert.rejects(run(ids.editor,
    "update public.stat_indicator_editorial set intro='HACK' where indicator_id=$1",[ids.indicator]),{code:'42501'});
  const published=validateIndicatorEditorial({...electricityEditorialDraft,reviewed_on:'2026-10-27',is_published:true});
  const updated=await save(ids.editor,1,published);
  assert.equal(updated.rows[0].saved.is_published,true);
  assert.equal(Number(updated.rows[0].saved.revision),2);
  assert.equal((await select(null)).rows.length,1);
  assert.equal((await select(ids.visitor)).rows.length,1);
  await assert.rejects(save(ids.editor,1,published),{code:'40001'});
  await assert.rejects(save(ids.editor,2,{...published,reference_links:[{title:'خطير',url:'javascript:alert(1)'}]}),{code:'22023'});
  assert.equal((await select(null)).rows[0].intro,published.intro);

  await pg.query('update public.stat_indicators set is_published=false where id=$1',[ids.indicator]);
  assert.equal((await select(null)).rows.length,0,'unpublished parent hides approved narrative');
  assert.equal((await select(ids.editor)).rows.length,1,'editor can still access the draft table');
});
