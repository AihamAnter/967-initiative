import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

// Opt in only to a local PostgreSQL administrator. A NEW randomly named database
// is created and removed; existing database tables are never used for fixtures.
// PGlite intentionally cannot satisfy this independent-session test.
const connection=process.env.TEST_POSTGRES_ADMIN_URL;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('S-02 real PostgreSQL: two independent sessions cannot remove both management accounts',{skip:!connection?'TEST_POSTGRES_ADMIN_URL is unset; independent-session verification was not requested':false,timeout:120000},async t=>{
 const local=new URL(connection);
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(local.hostname),'Only loopback PostgreSQL is permitted');
 const require=createRequire(path.resolve('.audit-tools/package.json')),{Client}=require('pg');
 const admin=new Client({connectionString:local.href,application_name:'967-guard-admin'});await admin.connect();
 await admin.query('select pg_advisory_lock(967,230)'); // coordinate disposable test roles with the RLS suite
 const name='test_967_guard_'+randomUUID().replaceAll('-',''),target=new URL(local);target.pathname='/'+name;
 const createdRoles=[];let control;
 await admin.query('create database '+name);
 t.after(async()=>{if(control)await control.end();await admin.query('drop database '+name+' with (force)');for(const role of createdRoles)await admin.query('drop role '+role);await admin.end();});
 for(const role of ['anon','authenticated','service_role'])if(!(await admin.query('select exists(select 1 from pg_roles where rolname=$1) found',[role])).rows[0].found){await admin.query('create role '+role+' nologin');createdRoles.push(role);}
 control=new Client({connectionString:target.href,application_name:'967-guard-control'});await control.connect();
 await control.query("create table public.editors(user_id text primary key,role text not null);insert into public.editors values('one','management'),('two','management');");
 await control.query(await readFile(new URL('../supabase/archive/legacy-migrations/202610230002_management_guard.sql',import.meta.url),'utf8'));
 for(const isolation of ['read committed','repeatable read'])for(const operation of ['demote','delete']){
  await t.test(isolation+' '+operation,async()=>{
   await control.query("insert into public.editors values('one','management'),('two','management') on conflict(user_id) do update set role='management'");
   const a=new Client({connectionString:target.href,application_name:'967-guard-a'}),b=new Client({connectionString:target.href,application_name:'967-guard-b'});
   await Promise.all([a.connect(),b.connect()]);
   try{
    await Promise.all([a.query('begin isolation level '+isolation),b.query('begin isolation level '+isolation)]);
    const [apid,bpid]=await Promise.all([a.query('select pg_backend_pid() pid'),b.query('select pg_backend_pid() pid')]);
    assert.notEqual(apid.rows[0].pid,bpid.rows[0].pid,'Separate real PostgreSQL connections');
    await b.query('select count(*) from public.editors'); // establish RR snapshot before A modifies
    const mutation=id=>operation==='delete'?"delete from public.editors where user_id='"+id+"'":"update public.editors set role='admin' where user_id='"+id+"'";
    await a.query(mutation('one'));
    const second=b.query(mutation('two')).then(result=>({result}),error=>({error}));
    let blocked=false;
    for(let attempt=0;attempt<80;attempt++){
     blocked=(await control.query("select exists(select 1 from pg_stat_activity where pid=$1 and wait_event_type='Lock') blocked",[bpid.rows[0].pid])).rows[0].blocked;
     if(blocked)break;await pause(25);
    }
    assert.ok(blocked,'Second independent session reached a real PostgreSQL lock wait');
    await a.query('commit');
    const outcome=await second;
    assert.ok(outcome.error,'Second removal must fail and roll back');
    assert.ok(['23514','40001'].includes(outcome.error.code),outcome.error.code);
    await b.query('rollback');
    assert.equal((await control.query("select count(*)::int n from public.editors where role='management'")).rows[0].n,1);
    assert.equal((await control.query('select manager_count from public.management_guard')).rows[0].manager_count,1);
    t.diagnostic(JSON.stringify({isolation,operation,independentConnections:true,observedLockWait:true,rejectedCode:outcome.error.code,remainingManagement:1,guardCount:1}));
   }finally{await Promise.all([a.end(),b.end()]);}
  });
 }
});
