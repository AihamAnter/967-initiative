import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

// Same interface as the PGlite fixture, backed by a disposable real PostgreSQL
// database. Only explicitly opted-in loopback administrator URLs are accepted.
export async function createLocalPostgresDatabase(connection){
 const url=new URL(connection);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Only loopback PostgreSQL tests are permitted');
 const require=createRequire(path.resolve('.audit-tools/package.json')),{Client}=require('pg');
 const admin=new Client({connectionString:url.href,application_name:'967-security-admin'});await admin.connect();
 await admin.query('select pg_advisory_lock(967,230)'); // only test harness setup/teardown, never the guard itself
 const name='test_967_security_'+randomUUID().replaceAll('-',''),target=new URL(url);target.pathname='/'+name;
 const createdRoles=[];
 await admin.query('create database '+name);
 for(const role of ['anon','authenticated','service_role'])if(!(await admin.query('select exists(select 1 from pg_roles where rolname=$1) found',[role])).rows[0].found){await admin.query('create role '+role+' nologin'+(role==='service_role'?' bypassrls':''));createdRoles.push(role);}
 const client=new Client({connectionString:target.href,application_name:'967-security-fixture'});await client.connect();
 const pg={
  query:(...args)=>client.query(...args),exec:sql=>client.query(sql),
  transaction:async work=>{await client.query('begin');try{const result=await work(pg);await client.query('commit');return result;}catch(error){await client.query('rollback');throw error;}},
  close:async()=>{await client.end();await admin.query('drop database '+name+' with (force)');for(const role of createdRoles)await admin.query('drop role '+role);await admin.end();},
 };
 return pg;
}
