// Local-only Supabase-shaped adapter backed by real PostgreSQL (PGlite).
// Identity tokens here are UUID fixtures, never real Supabase credentials.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export const taskTestUsers=[
 {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'admin',name:'أدمن ألف'},
 {id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',role:'admin',name:'أدمن باء'},
 {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',role:'management',name:'إدارة جيم'},
 {id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',role:null,name:'مستخدم عادي'},
];
export async function createTaskTestDatabase(){
 const tokenUser=token=>{if(taskTestUsers.some(u=>u.id===token))return token;try{if(!token.endsWith('.local-browser-fixture'))return null;const sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;return taskTestUsers.some(u=>u.id===sub)?sub:null;}catch{return null;}};
 const pg=new PGlite();
 await pg.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.editors(user_id uuid primary key references auth.users(id),role text not null,added_at timestamptz default now());
 alter table public.editors enable row level security;
 create policy own_editor on public.editors for select to authenticated using(user_id=auth.uid());grant select on public.editors to authenticated;`);
 for(const u of taskTestUsers){await pg.query('insert into auth.users values($1,$2::jsonb)',[u.id,JSON.stringify({full_name:u.name})]);if(u.role)await pg.query('insert into public.editors(user_id,role) values($1,$2)',[u.id,u.role]);}
 await pg.exec(await readFile(new URL('../../supabase/task-center.sql',import.meta.url),'utf8'));
 const run=(user,sql,params=[])=>pg.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user||'']);await tx.exec('set local role '+(user?'authenticated':'anon'));return tx.query(sql,params);});
 const normalize=value=>JSON.parse(JSON.stringify(value,(_k,v)=>v));
 const tableNames=['editors','tasks','task_projects','task_subtasks','task_comments','task_activity','task_notifications'];
 function client(user){return {
  auth:{getUser:async token=>{const u=taskTestUsers.find(x=>x.id===tokenUser(token));return u?{data:{user:{id:u.id,user_metadata:{full_name:u.name}}},error:null}:{data:{user:null},error:{status:401}};}},
  rpc:async(name,args={})=>{try{
   let result;
   if(name==='task_mutate')result=await run(user,'select public.task_mutate($1,$2,$3,$4::jsonb) result',[args.p_action,args.p_id,args.p_revision,JSON.stringify(args.p_data)]);
   else if(name==='task_team')result=await run(user,'select * from public.task_team()');
   else if(name==='task_refresh_reminders')result=await run(user,'select public.task_refresh_reminders()');else throw Error('Unsupported test RPC');
   return {data:normalize(name==='task_mutate'?result.rows[0].result:result.rows),error:null};
  }catch(e){return {data:null,error:{code:e.code,message:e.message}};}},
  from:table=>{
   if(!tableNames.includes(table))throw Error('Unsupported test table');
   let columns='*',single=false,exact=false,updates=null,range=null,limit=null;const where=[],orders=[];
   const identifier=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Unsafe test identifier');return '"'+value+'"';};
   const query={
    select(c='*',options={}){columns=c;exact=options.count==='exact';return query;},
    eq(k,v){where.push([identifier(k)+' = ',v]);return query;},
    is(k,v){if(v!==null)throw Error('Unsupported test condition');where.push([identifier(k)+' is null']);return query;},
    order(k,{ascending=true}={}){orders.push(identifier(k)+(ascending?' asc':' desc'));return query;},
    range(start,end){range=[start,end];return query;},limit(value){limit=value;return query;},maybeSingle(){single=true;return query;},update(value){updates=value;return query;},
    then(resolve,reject){return (async()=>{try{
     const params=[];const bind=v=>{params.push(v);return '$'+params.length;};
     const prefix=updates?'update public.'+identifier(table)+' set '+Object.entries(updates).map(([k,v])=>identifier(k)+'='+bind(v)).join(','):'select '+(columns==='*'?'*':columns.split(',').map(identifier).join(','))+' from public.'+identifier(table);
     const conditions=where.length?' where '+where.map(([q,v])=>q+(v===undefined?'':bind(v))).join(' and '):'';
     const result=await run(user,prefix+conditions+(updates?' returning *':(orders.length?' order by '+orders.join(','):'')+(range?' limit '+(range[1]-range[0]+1)+' offset '+range[0]:limit?' limit '+limit:'')),params);
     const data=normalize(result.rows).map(r=>{if(r.due_date)r.due_date=r.due_date.slice(0,10);return r;});
     let count=null;if(exact){const counted=await run(user,'select count(*)::int n from public.'+identifier(table)+conditions,params);count=counted.rows[0].n;}
     return {data:single?data[0]||null:data,error:null,count};
    }catch(e){return {data:null,error:{code:e.code,message:e.message},count:null};}})().then(resolve,reject);}
   };return query;
  },
 };}
 const createDb=request=>client(tokenUser(request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''));
 return {pg,client,createDb,close:()=>pg.close(),run};
}
