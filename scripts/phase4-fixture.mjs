// Isolated integration server: no .env files, no external network, no real users.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createInlineEditorTestDatabase,inlineTestUsers} from '../tests/helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from '../tests/helpers/debateFixtures.mjs';
const port=3439,origin='http://127.0.0.1:3139';
const db=await createInlineEditorTestDatabase();
for(const file of ['202610220001_debates_instant_discussion.sql','202610220002_debate_recording_lifecycle.sql','202610220003_debate_discussion_publication_repair.sql','202610220004_debate_discussion_publication_portable.sql'])await db.pg.exec(await readFile(new URL('../supabase/archive/legacy-migrations/'+file,import.meta.url),'utf8'));
await db.pg.exec(await readFile(new URL('../supabase/add-site-settings.sql',import.meta.url),'utf8'));
const figureSql=await readFile(new URL('../supabase/yemeni-figures.sql',import.meta.url),'utf8');
await db.pg.exec(figureSql.slice(0,figureSql.indexOf('-- Figure portraits')));
await db.pg.query("insert into public.yemeni_figures(slug,full_name,known_for,field,governorate_id,governorate_name,era,short_bio,is_published) values('local-figure','شخصية الاختبار المحلي','بيانات معزولة لا تنشر','الأدب','YE19','حضرموت','معاصرة','ملف للتحقق من ربط دليل الشخصيات بالمحافظة.',true)");
await db.pg.exec('grant all on all tables in schema public to service_role;');
const fixture=await seedDebateFixtures(db);
await fixture.update(fixture.live,{publication_status:'published',comments_open:true,questions_open:true});
await fixture.update(fixture.recorded,{publication_status:'published',recording_published:true,stage:'recording_available'});
const bounds=JSON.parse(await readFile(new URL('../public/data/yemen-map/yemen-boundaries.json',import.meta.url),'utf8'));
for(const g of bounds.governorates)await db.pg.query('insert into public.governorates(id,name_ar,name_en) values($1,$2,$3)',[g.id,g.nameAr,g.nameEn]);
for(const d of bounds.districts)await db.pg.query('insert into public.districts(id,governorate_id,name_ar,name_en) values($1,$2,$3,$4)',[d.id,d.governorateId,d.nameAr,d.nameEn]);
const tokenMap=new Map(),passwords=new Map(inlineTestUsers.map(u=>['user-'+u.id[0]+'@example.test',{id:u.id,password:'Local-test-967!'}])),revoked=new Set(),codes=new Map(),mailbox=[];
let confirmEmail=true;
const jsonSafe=value=>JSON.parse(JSON.stringify(value));
const ident=value=>{if(!/^[a-z_]+$/.test(value))throw Error('Invalid fixture identifier');return '"'+value+'"';};
const userFor=async id=>{const row=(await db.pg.query('select * from auth.users where id=$1',[id])).rows[0];return row?{id,email:row.email,email_confirmed_at:row.email_confirmed_at,aud:'authenticated',role:'authenticated',user_metadata:row.raw_user_meta_data,app_metadata:{provider:'email',providers:['email']},created_at:row.created_at}:null;};
async function sessionFor(id){const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),token=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:randomUUID()})+'.local-browser-fixture';tokenMap.set(token,id);return {access_token:token,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'local-refresh-'+id,user:await userFor(id)};}
const cors={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Expose-Headers':'Content-Range,x-supabase-api-version','X-Supabase-Api-Version':'2024-01-01'};
async function sqlFor(uid,service,sql,params=[]){if(!service)return db.run(uid,sql,params);return db.pg.transaction(async tx=>{await tx.exec('set local role service_role');return tx.query(sql,params);});}
const server=createServer(async(req,res)=>{
 const send=(body,status=200,extra={})=>{res.writeHead(status,{...cors,...extra});res.end(body===null?'':JSON.stringify(jsonSafe(body)));};
 if(req.method==='OPTIONS')return send(null,204);
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port),pathname=url.pathname;
  let raw='';for await(const part of req){raw+=part;if(raw.length>700000)throw Error('Fixture body too large');}const body=raw?JSON.parse(raw):{};
  const token=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'',uid=revoked.has(token)?null:tokenMap.get(token)||null,service=token==='fixture-service';
  if(pathname==='/fixture/state')return send({production:false,live:fixture.live,recorded:fixture.recorded,users:inlineTestUsers,mailbox,confirmEmail});
  if(pathname==='/fixture/session')return send(await sessionFor(body.user_id));
  if(pathname==='/fixture/auth-mode'){confirmEmail=body.confirmEmail;return send({ok:true});}
  if(pathname==='/fixture/confirm'){await db.pg.query('update auth.users set email_confirmed_at=now() where email=$1',[body.email]);return send({ok:true});}
  if(pathname==='/fixture/revoke'){revoked.add(body.token);return send({ok:true});}
  if(pathname==='/fixture/clear-rate'){await db.pg.exec('delete from public.debate_rate_limits');return send({ok:true});}
  if(pathname==='/fixture/setting'){await db.pg.query('insert into public.site_settings(key,value,updated_at) values($1,$2::jsonb,now()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at',[body.key,JSON.stringify(body.value)]);return send({ok:true});}
  if(pathname==='/fixture/arena-seed'){
   const id=body.debate_id||fixture.live;
   await db.pg.query("delete from public.debate_comments where debate_id=$1",[id]);await db.pg.query("delete from public.debate_questions where debate_id=$1",[id]);
   await db.pg.query("insert into public.debate_comments(debate_id,user_id,body,status,created_at) select $1,$2,'تعليق محلي '||n||' — نناقش الفكرة ونراجع مصادرها باحترام.','approved',now()-interval '1 hour'+n*interval '1 minute' from generate_series(1,35)n",[id,inlineTestUsers[5].id]);
   await db.pg.query("insert into public.debate_questions(debate_id,user_id,body,status,anonymous,created_at) select $1,$2,'سؤال محلي '||n||' — كيف يمكن تطبيق هذه الفكرة في الواقع؟','approved',n%2=0,now()-interval '1 hour'+n*interval '1 minute' from generate_series(1,15)n",[id,inlineTestUsers[5].id]);
   return send({ok:true});
  }
  if(pathname==='/auth/v1/settings')return send({external:{email:true},disable_signup:false,mailer_autoconfirm:!confirmEmail});
  if(pathname==='/auth/v1/signup'){
   if(passwords.has(body.email))return send({msg:'User already registered',code:'user_already_exists'},422);
   const id=randomUUID();await db.pg.query('insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3::jsonb,$4)',[id,body.email,JSON.stringify(body.data||{}),confirmEmail?null:new Date().toISOString()]);passwords.set(body.email,{id,password:body.password});inlineTestUsers.push({id,role:null,name:body.data?.display_name});
   if(!confirmEmail)return send(await sessionFor(id));mailbox.push({kind:'signup',email:body.email,redirectTo:url.searchParams.get('redirect_to')});return send(await userFor(id));
  }
  if(pathname==='/auth/v1/token'){
   const grant=url.searchParams.get('grant_type');
   if(grant==='pkce'){const id=codes.get(body.auth_code);if(!id)return send({code:'flow_state_expired'},400);codes.delete(body.auth_code);return send(await sessionFor(id));}
   const entry=grant==='refresh_token'?{id:String(body.refresh_token).replace('local-refresh-','')}:passwords.get(body.email);
   if(!entry||grant!=='refresh_token'&&entry.password!==body.password)return send({code:'invalid_credentials'},400);
   const user=await userFor(entry.id);if(!user?.email_confirmed_at)return send({code:'email_not_confirmed'},400);return send(await sessionFor(entry.id));
  }
  if(pathname==='/auth/v1/recover'){
   const entry=passwords.get(body.email);if(entry){const code=randomUUID();codes.set(code,entry.id);mailbox.push({kind:'recovery',email:body.email,code,redirectTo:url.searchParams.get('redirect_to')});}return send({});
  }
  if(pathname==='/auth/v1/resend'){mailbox.push({kind:'resend',email:body.email});return send({});}
  if(pathname==='/auth/v1/user'){
   if(!uid)return send({code:'bad_jwt'},401);
   if(req.method==='PUT'){if(body.password){const user=await userFor(uid);passwords.set(user.email,{id:uid,password:body.password});}if(body.data)await db.pg.query('update auth.users set raw_user_meta_data=raw_user_meta_data||$2::jsonb where id=$1',[uid,JSON.stringify(body.data)]);}
   return send(await userFor(uid));
  }
  if(pathname==='/auth/v1/logout'){revoked.add(token);return send(null,204);}
  if(pathname.startsWith('/rest/v1/rpc/')){
   const name=pathname.split('/').at(-1);if(!/^(debate|inline|task)_[a-z_]+$/.test(name))return send({code:'PGRST202'},404);
   const args=req.method==='GET'?Object.fromEntries(url.searchParams):body,entries=Object.entries(args),params=entries.map(([,value])=>typeof value==='object'&&value!==null?JSON.stringify(value):value);
   const result=await sqlFor(uid,service,'select public.'+ident(name)+'('+entries.map(([key],i)=>ident(key)+'=> $'+(i+1)+(['p_data','p_value'].includes(key)?'::jsonb':'')).join(',')+') result',params);
   return send(result.rows[0]?.result??null);
  }
  if(pathname.startsWith('/rest/v1/')){
   const table=pathname.split('/').at(-1);if(!/^[a-z_]+$/.test(table))return send({code:'PGRST205'},404);
   const exists=(await db.pg.query('select to_regclass($1) name',['public.'+table])).rows[0].name;if(!exists)return send([],200,{'Content-Range':'*/0'});
   const params=[],bind=value=>{params.push(value);return '$'+params.length;},conditions=[];
   for(const [key,value]of url.searchParams){if(['select','order','limit','offset','on_conflict'].includes(key))continue;if(value.startsWith('eq.'))conditions.push(ident(key)+'='+bind(value.slice(3)));else if(value==='is.null')conditions.push(ident(key)+' is null');else if(value.startsWith('in.('))conditions.push(ident(key)+'=any('+bind(value.slice(4,-1).split(','))+'::text[])');else if(value.startsWith('like.'))conditions.push(ident(key)+' like '+bind(value.slice(5)));}
   const where=conditions.length?' where '+conditions.join(' and '):'',single=String(req.headers.accept).includes('application/vnd.pgrst.object+json');
   if(req.method==='GET'||req.method==='HEAD'){
    const columns=url.searchParams.get('select')||'*',select=columns==='*'?'*':columns.split(',').map(ident).join(','),order=(url.searchParams.get('order')||'').split(',').filter(Boolean).map(value=>{const [key,direction]=value.split('.');return ident(key)+(direction==='desc'?' desc':' asc');}).join(',');
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);
    if(!Number.isInteger(offset)||!Number.isInteger(limit)||offset<0||limit<1)throw Error('Invalid fixture pagination');
    const result=await sqlFor(uid,service,'select '+select+' from public.'+ident(table)+where+(order?' order by '+order:'')+' limit '+limit+' offset '+offset,params),count=(await sqlFor(uid,service,'select count(*)::int n from public.'+ident(table)+where,params)).rows[0].n;
    return send(single?result.rows[0]??null:result.rows,200,{'Content-Range':result.rows.length?`${offset}-${offset+result.rows.length-1}/${count}`:`*/${count}`});
   }
   if(req.method==='POST'){
    const rows=Array.isArray(body)?body:[body],saved=[];for(const row of rows){const keys=Object.keys(row),values=keys.map(key=>bind(typeof row[key]==='object'&&row[key]!==null?JSON.stringify(row[key]):row[key]));const result=await sqlFor(uid,service,'insert into public.'+ident(table)+'('+keys.map(ident).join(',')+') values('+values.join(',')+') returning *',params);saved.push(...result.rows);}return send(single?saved[0]:saved,201);
   }
   if(req.method==='PATCH'){const setters=Object.entries(body).map(([key,value])=>ident(key)+'='+bind(typeof value==='object'&&value!==null?JSON.stringify(value):value));const result=await sqlFor(uid,service,'update public.'+ident(table)+' set '+setters.join(',')+where+' returning *',params);return send(single?result.rows[0]??null:result.rows);}
   if(req.method==='DELETE'){const result=await sqlFor(uid,service,'delete from public.'+ident(table)+where+' returning *',params);return send(single?result.rows[0]??null:result.rows);}
  }
  return send({error:'Unsupported isolated fixture endpoint'},404);
 }catch(error){send({code:error.code||'fixture_failure',message:error.message},['42501'].includes(error.code)?403:['23505','40001'].includes(error.code)?409:400);}
});
server.listen(port,'127.0.0.1',()=>console.log('Isolated phase 4 fixture ready: '+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
