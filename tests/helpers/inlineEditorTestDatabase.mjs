import {readFile} from 'node:fs/promises';
import {createDebateTestDatabase,debateTestUsers} from './debateTestDatabase.mjs';
export {debateTestUsers as inlineTestUsers};
export async function createInlineEditorTestDatabase(options){
 const base=await createDebateTestDatabase(options),{pg,run}=base;
 await pg.exec('create role service_role nologin bypassrls;grant usage on schema public to service_role;');
 const sql=name=>readFile(new URL('../../supabase/'+name,import.meta.url),'utf8');
 const schema=await sql('schema.sql');
 await pg.exec(schema.slice(schema.indexOf('create table if not exists public.issues ('),schema.indexOf('create table if not exists public.messages (')));
 for(const [file,table] of [['yemeni-products.sql','yemeni_companies'],['professionals.sql','professionals']]){const source=await sql(file);await pg.exec(source.slice(source.indexOf('create table if not exists public.'+table+' ('),source.indexOf('create index')));}
 await pg.exec(await sql('yemen-map.sql'));
 for(const table of ['issues','yemeni_companies','professionals'])await pg.exec(`alter table public.${table} enable row level security;grant select on public.${table} to anon,authenticated;grant insert,update,delete on public.${table} to authenticated;create policy fixture_public on public.${table} for select to anon,authenticated using(is_published);create policy fixture_editor on public.${table} for all to authenticated using(public.debate_role() is not null) with check(public.debate_role() is not null);`);
 await pg.exec('grant insert,update,delete on public.works to authenticated;create policy fixture_works_write on public.works for all to authenticated using(public.debate_role() is not null) with check(public.debate_role() is not null);');
 await pg.exec(await sql('migrations/202610210001_inline_editor.sql'));
 const normalize=value=>JSON.parse(JSON.stringify(value));
 const ident=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Unsafe identifier');return '"'+value+'"';};
 function client(user){const c=base.client(user);return {...c,
  rpc:async(name,args={})=>{if(name==='task_team'||!/^(inline_|task_)/.test(name))return c.rpc(name,args);try{if(!/^(inline|task)_[a-z_]+$/.test(name))throw Error('Unsafe RPC');const entries=Object.entries(args),params=entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v);const result=await run(user,'select public.'+ident(name)+'('+entries.map(([k],i)=>ident(k)+'=> $'+(i+1)+(k==='p_data'?'::jsonb':'')).join(',')+') result',params);return {data:normalize(result.rows[0].result),error:null};}catch(e){return {data:null,error:{code:e.code,message:e.message}};}},
  from(table){if(!['issues','yemeni_companies','professionals','governorates','districts','inline_content_audit','tasks','task_activity'].includes(table))return c.from(table);let columns='*',single=false,exact=false,limit=null,range=null;const where=[],orders=[];const q={select(s='*',opts={}){columns=s;exact=opts.count==='exact';return q;},eq(k,v){where.push([k,v]);return q;},order(k,{ascending=true}={}){orders.push(ident(k)+(ascending?' asc':' desc'));return q;},range(a,b){range=[a,b];return q;},limit(n){limit=n;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){return (async()=>{try{const params=where.map(([,v])=>v),condition=where.length?' where '+where.map(([k],i)=>ident(k)+'=$'+(i+1)).join(' and '):'';const result=await run(user,'select '+(columns==='*'?'*':columns.split(',').map(ident).join(','))+' from public.'+ident(table)+condition+(orders.length?' order by '+orders.join(','):'')+(range?' limit '+(range[1]-range[0]+1)+' offset '+range[0]:limit?' limit '+limit:''),params);const count=exact?(await run(user,'select count(*)::int n from public.'+ident(table)+condition,params)).rows[0].n:null;const rows=normalize(result.rows);return {data:single?rows[0]||null:rows,error:null,count};}catch(e){return {data:null,error:{code:e.code,message:e.message}};}})().then(resolve,reject);}};return q;},
 };}
 const tokenUser=token=>{if(debateTestUsers.some(u=>u.id===token))return token;try{if(!token.endsWith('.local-browser-fixture'))return null;const sub=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;return debateTestUsers.some(u=>u.id===sub)?sub:null;}catch{return null;}};
 return {...base,client,createDb:request=>client(tokenUser(request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''))};
}
