// Test-only Supabase-shaped HTTP fixture backed by real PostgreSQL + real RLS.
// Runs on loopback; never loads .env.local, real credentials or production data.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createDebateTestDatabase,debateTestUsers} from '../tests/helpers/debateTestDatabase.mjs';
import {createInlineEditorTestDatabase} from '../tests/helpers/inlineEditorTestDatabase.mjs';
import {seedDebateFixtures} from '../tests/helpers/debateFixtures.mjs';
const prelaunch=process.argv.includes('--prelaunch');
const fixturePort=Number(process.env.DEBATE_FIXTURE_PORT||3417),previewOrigin=process.env.DEBATE_PREVIEW_ORIGIN||'http://127.0.0.1:3117';
const db=await (prelaunch?createInlineEditorTestDatabase():createDebateTestDatabase());
if(prelaunch)for(const file of ['202610220001_debates_instant_discussion.sql','202610220002_debate_recording_lifecycle.sql','202610220003_debate_discussion_publication_repair.sql','202610220004_debate_discussion_publication_portable.sql'])await db.pg.exec(await readFile(new URL('../supabase/archive/legacy-migrations/'+file,import.meta.url),'utf8'));
const fixture=await seedDebateFixtures(db);
await fixture.update(fixture.live,{publication_status:'published',live_url:'https://www.youtube.com/watch?v=abcdefghijk',live_platform:'YouTube'});
await fixture.update(fixture.recorded,{publication_status:'published',recording_published:true,stage:'recording_available',summary:{introduction:'مقدمة محايدة خضعت للمراجعة المحلية.',arguments:'حجج الموقف الأول: المشاركة المباشرة.\nحجج الموقف الثاني: تنظيم المشاركة.\nالموقف الثالث: التوازن بين المقاربتين.',conclusion:'عرض المواقف دون اختيار فائز.'},summary_published:true});
let pending=null;
if(prelaunch){const saved=await fixture.rpc('save',null,{...fixture.draftData('prerecorded'),slug:'local-pending-recording',publication_status:'published',stage:'upcoming',title:'تسجيل متأخر للاختبار المحلي'});pending=saved.id;}
const passwords=new Map(debateTestUsers.map(u=>['user-'+u.id[0]+'@example.test',{id:u.id,password:'Local-test-967!'}])),tokens=new Map(),revoked=new Set();
function tokenFor(uid){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),token=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:randomUUID()})+'.local-browser-fixture';tokens.set(token,uid);return token;}
const userFor=async uid=>{const r=await db.pg.query('select * from auth.users where id=$1',[uid]),u=r.rows[0];return u?{id:u.id,email:u.email,email_confirmed_at:u.email_confirmed_at,aud:'authenticated',role:'authenticated',user_metadata:u.raw_user_meta_data,app_metadata:{provider:'email',providers:['email']},created_at:u.created_at}:null;};
async function sessionFor(uid){return {access_token:tokenFor(uid),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'local-refresh-'+uid,user:await userFor(uid)};}
const cors={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':previewOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Access-Control-Expose-Headers':'Content-Range,x-supabase-api-version','X-Supabase-Api-Version':'2024-01-01'};
const server=createServer(async(req,res)=>{
 const respond=(body,status=200,headers={})=>{res.writeHead(status,{...cors,...headers});res.end(body===null?'':JSON.stringify(body));};
 if(req.method==='OPTIONS')return respond(null,204);
 try{
  const url=new URL(req.url,'http://127.0.0.1:3417'),path=url.pathname;let raw='';for await(const c of req){raw+=c;if(raw.length>250000)throw Error('Fixture request too large');}const body=raw?JSON.parse(raw):{};
  const token=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'',uid=revoked.has(token)?null:tokens.get(token)||null;
  if(path==='/fixture/state')return respond({live:fixture.live,recorded:fixture.recorded,pending,users:debateTestUsers.map(u=>({id:u.id,role:u.role})),prelaunch,production:false});
  if(prelaunch&&path==='/fixture/debate-update'){await fixture.update(body.id,body.data);return respond({ok:true});}
  if(prelaunch&&path==='/fixture/debate-create'){const slug='local-auth-'+Date.now(),saved=await fixture.rpc('save',null,{...fixture.draftData('prerecorded'),slug,publication_status:'published',stage:'upcoming',scheduled_at:null});return respond({id:saved.id,slug});}
  if(prelaunch&&path==='/fixture/moderate'){if(!['comments','questions'].includes(body.kind))return respond({error:'Invalid fixture kind'},400);const row=(await db.pg.query('select updated_at from public.debate_'+body.kind+' where id=$1',[body.id])).rows[0];const result=await db.client(debateTestUsers[0].id).rpc('debate_admin_mutate',{p_action:'moderate',p_id:body.id,p_data:{kind:body.kind,status:body.status,updated_at:row?.updated_at,reason:'Local browser QA moderation'}});return respond(result.error||result.data,result.error?400:200);}
  if(prelaunch&&path==='/fixture/report-count')return respond((await db.pg.query('select count(*)::int total from public.debate_reports')).rows[0]);
  if(path==='/fixture/session')return respond(await sessionFor(body.user_id));
  if(path==='/fixture/confirm'){await db.pg.query('update auth.users set email_confirmed_at=now() where email=$1',[body.email]);return respond({ok:true});}
  if(path==='/fixture/revoke'){revoked.add(body.token);return respond({ok:true});}
  if(path==='/fixture/clear-rate'){await db.pg.exec('delete from public.debate_rate_limits');return respond({ok:true});}
  if(path==='/fixture/arena-seed'){
   const debate=body.debate_id||fixture.recorded;
   await db.pg.query('delete from public.debate_comments where debate_id=$1',[debate]);
   await db.pg.query('delete from public.debate_questions where debate_id=$1',[debate]);
   await db.pg.query('delete from public.debate_votes where debate_id=$1',[debate]);
   await db.pg.exec('delete from public.debate_rate_limits');
   await db.pg.query("insert into public.debate_comments(debate_id,user_id,body,status,created_at) select $1::uuid,case when n%2=0 then $2::uuid else $3::uuid end,'تعليق تجريبي للساحة '||n,'approved',now()-interval '1 hour'+n*interval '1 minute' from generate_series(1,50) n",[debate,debateTestUsers[3].id,debateTestUsers[5].id]);
   await db.pg.query("insert into public.debate_questions(debate_id,user_id,body,status,anonymous,created_at) select $1::uuid,case when n%2=0 then $2::uuid else $3::uuid end,'سؤال تجريبي للساحة حول المشاركة '||n,'approved',n%2=0,now()-interval '1 hour'+n*interval '45 seconds' from generate_series(1,30) n",[debate,debateTestUsers[3].id,debateTestUsers[5].id]);
   return respond({comments:50,questions:30,production:false});
  }
  if(path==='/auth/v1/signup'){
   if(passwords.has(body.email))return respond({user:null,session:null});
   const id=randomUUID();await db.pg.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)',[id,body.email,JSON.stringify(body.data||{})]);passwords.set(body.email,{id,password:body.password});debateTestUsers.push({id,role:null,name:body.data?.display_name,unconfirmed:true});return respond(await userFor(id));
  }
  if(path==='/auth/v1/token'){
   const entry=url.searchParams.get('grant_type')==='refresh_token'?{id:String(body.refresh_token).replace('local-refresh-','')}:passwords.get(body.email);
   if(!entry||url.searchParams.get('grant_type')!=='refresh_token'&&entry.password!==body.password)return respond({msg:'Invalid fixture login',code:'invalid_credentials'},400);
   const u=await userFor(entry.id);if(!u?.email_confirmed_at)return respond({msg:'Email not confirmed',code:'email_not_confirmed'},400);
   return respond(await sessionFor(entry.id));
  }
  if(path==='/auth/v1/user'){
   if(!uid)return respond({msg:'Invalid fixture session',code:'bad_jwt'},401);
   if(req.method==='PUT'){if(body.password){const u=await userFor(uid);passwords.set(u.email,{id:uid,password:body.password});}if(body.data)await db.pg.query('update auth.users set raw_user_meta_data=raw_user_meta_data||$2::jsonb where id=$1',[uid,JSON.stringify(body.data)]);}
   return respond(await userFor(uid));
  }
  if(path==='/auth/v1/logout'){revoked.add(token);return respond(null,204);}
  if(['/auth/v1/recover','/auth/v1/resend'].includes(path))return respond({});
  if(path.startsWith('/rest/v1/rpc/')){
   const name=path.split('/').at(-1);if(!/^(debate_|inline_|task_)/.test(name))return respond([]);
   const result=await db.client(uid).rpc(name,req.method==='GET'?Object.fromEntries(url.searchParams):body);
   return respond(result.error||result.data,result.error?result.error.code==='42501'?403:400:200);
  }
  if(path.startsWith('/rest/v1/')){
   const table=path.split('/').at(-1);if(!['editors','public_profiles','works'].includes(table)&&!/^debate/.test(table))return respond([],200,{'Content-Range':'*/0'});
   let query=db.client(uid).from(table).select(url.searchParams.get('select')||'*',{count:'exact'});
   for(const [key,value]of url.searchParams)if(value.startsWith('eq.'))query=query.eq(key,value.slice(3));
   for(const o of (url.searchParams.get('order')||'').split(',').filter(Boolean)){const [key,direction]=o.split('.');query=query.order(key,{ascending:direction!=='desc'});}
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);query=query.range(offset,offset+limit-1);
   const result=await query;if(result.error)return respond(result.error,403);
   const single=String(req.headers.accept).includes('application/vnd.pgrst.object+json');return respond(single?result.data[0]||null:result.data,200,{'Content-Range':result.data.length?`${offset}-${offset+result.data.length-1}/${result.count}`:`*/${result.count}`});
  }
  respond({error:'Unsupported local fixture request'},404);
 }catch(error){respond({error:'Local fixture error',message:error.message},500);}
});
server.listen(fixturePort,'127.0.0.1',()=>process.stdout.write('Isolated debate fixture ready at http://127.0.0.1:'+fixturePort+'\n'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.close();process.exit(0);}));
