import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pageIsVisible,validatePageVisibility} from '../lib/pageVisibility.js';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const users={
 management:'20000000-0000-4000-8000-000000000001',
 admin:'20000000-0000-4000-8000-000000000002',
 unconfirmed:'20000000-0000-4000-8000-000000000003',
 banned:'20000000-0000-4000-8000-000000000004',
 regular:'20000000-0000-4000-8000-000000000005',
};
test('editor SQL helpers honor email confirmation and bans through direct authenticated/RLS calls',async t=>{
 const pg=new PGlite();
 t.after(()=>pg.close());
 await pg.exec([
  'create role anon nologin',
  'create role authenticated nologin',
  'create schema auth',
  'create table auth.users(id uuid primary key,email_confirmed_at timestamptz,banned_until timestamptz)',
  'create table public.editors(user_id uuid primary key,role text not null)',
  "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$",
  "create function public.editorial_can_read() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.editors e join auth.users u on u.id=e.user_id where e.user_id=(select auth.uid()) and e.role in ('admin','management') and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now()))$$",
  'grant usage on schema public,auth to anon,authenticated',
  'grant execute on function auth.uid() to anon,authenticated',
  'create table public.editor_data(id integer primary key,label text)',
  "insert into public.editor_data values(1,'private')",
  'alter table public.editor_data enable row level security',
  'grant select on public.editor_data to authenticated'
 ].join(';\n')+';');
 for(const [name,id] of Object.entries(users)){
  await pg.query('insert into auth.users(id,email_confirmed_at,banned_until) values($1,$2,$3)',[id,name==='unconfirmed'?null:'2026-01-01',name==='banned'?'2099-01-01':null]);
  if(name!=='regular')await pg.query('insert into public.editors(user_id,role) values($1,$2)',[id,name==='management'?'management':'admin']);
 }
 await pg.exec(read('supabase/migrations/20261031000500_editor_role_session_guards.sql'));
 await pg.exec('create policy editor_read on public.editor_data for select to authenticated using (public.is_editor());');
 async function probe(user,role='authenticated'){
  return pg.transaction(async tx=>{
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);
   await tx.exec('set local role '+role);
   return (await tx.query('select public.is_editor() as editor,public.is_967_editor() as old_editor,public.is_management() as manager,public.is_ranking_editor() as ranking,public.debate_role() as debate,public.task_role() as task,(select count(*)::int from public.editor_data) as private_rows')).rows[0];
  });
 }
 const manager=await probe(users.management);
 assert.deepEqual(manager,{editor:true,old_editor:true,manager:true,ranking:true,debate:'management',task:'management',private_rows:1});
 const admin=await probe(users.admin);
 assert.equal(admin.editor,true);assert.equal(admin.manager,false);assert.equal(admin.debate,'admin');assert.equal(admin.task,'admin');
 for(const id of [users.unconfirmed,users.banned,users.regular]){
  const state=await probe(id);
  assert.equal(state.editor,false,id);assert.equal(state.old_editor,false,id);
  assert.equal(state.manager,false,id);assert.equal(state.ranking,false,id);
  assert.equal(state.debate,null,id);assert.equal(state.task,null,id);
  assert.equal(state.private_rows,0,id);
 }
 const visitor=await probe(null,'anon');
 assert.equal(visitor.editor,false);assert.equal(visitor.manager,false);assert.equal(visitor.ranking,false);
 assert.equal(visitor.debate,null);assert.equal(visitor.task,null);
});
test('nested figure visibility requires BOTH atlas and figure sections',()=>{
 const atlasHidden=validatePageVisibility({atlas:false,figures:true});
 const figuresHidden=validatePageVisibility({atlas:true,figures:false});
 for(const visibility of [atlasHidden,figuresHidden]){
  assert.equal(pageIsVisible('/yemen-map/figures/someone',visibility),false);
  assert.equal(pageIsVisible('/yemen-map#yemeni-figures',visibility),false);
 }
 assert.equal(pageIsVisible('/yemeni-figures/person',atlasHidden),true);
 assert.equal(pageIsVisible('/yemen-map/figures/person',validatePageVisibility({})),true);
 assert.equal(pageIsVisible('/yemen-map?region=YE19#map',figuresHidden),true);
});
test('server-side section layouts protect public nested routes without changing visual layout',()=>{
 for(const [path,section] of [
  ['app/games/layout.jsx','games'],
  ['app/yemen-history/layout.jsx','history'],
  ['app/yemeni-figures/layout.jsx','figures'],
  ['app/yemen-map/layout.jsx','atlas'],
  ['app/debates/layout.jsx','debates'],
  ['app/universities/layout.jsx','universities'],
  ['app/medical-centers/layout.jsx','medical'],
 ]){
  const source=read(path);
  assert.ok(source.includes('PublicPageBoundary')||source.includes('InteriorLayout'),path);
  if(source.includes('PublicPageBoundary'))assert.ok(source.includes('section="'+section+'"'),path);
 }
 assert.match(read('components/design/PublicPageBoundary.jsx'),/sectionIsVisible\(section,settings\.pageVisibility\)/);
 assert.match(read('app/school/studio/page.jsx'),/SchoolStudio/); // Editor access continues through authenticated APIs.
});
