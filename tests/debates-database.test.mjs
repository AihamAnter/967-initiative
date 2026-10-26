import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createDebateTestDatabase,debateTestUsers} from './helpers/debateTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {handleDebateRequest} from '../lib/debateApi.js';
import {safeAccountReturn,validateDebateCommand,debateListState,formatDebateDateTime} from '../lib/debates.js';
import {readAudienceAccount} from '../lib/debateRepository.js';
import {buildSearchIndex} from '../lib/search.js';
import {buildSitemap,robotsPolicy} from '../lib/seo.js';

test('967 debates: isolated PostgreSQL, Auth boundary, privacy and complete workflows',async t=>{
 const db=await createDebateTestDatabase();t.after(()=>db.close());const f=await seedDebateFixtures(db),[A,B,M,U,N,V]=debateTestUsers;
 const audience=async(user,action,id,data={})=>db.client(user).rpc('debate_audience_mutate',{p_action:action,p_id:id||null,p_data:data});
 const ok=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
 const denied=r=>assert.ok(r.error,JSON.stringify(r));
 const api=async(user,body,{admin=false,account=false,origin}={})=>{const r=await handleDebateRequest(new Request('http://localhost/api/'+(admin?'admin/debates':account?'account':'debates'),{method:body?'POST':'GET',headers:{...(user?{authorization:'Bearer '+user}:{}),...(body?{'Content-Type':'application/json'}:{}),...(origin?{origin}:{})},...(body?{body:JSON.stringify(body)}:{})}),db.createDb,{admin,account});return {status:r.status,data:await r.json(),headers:r.headers};};
 t.beforeEach(()=>db.pg.exec('delete from public.debate_rate_limits'));
 await t.test('draft recordings, chapters, summaries and base tables are inaccessible to the public',async()=>{
  assert.deepEqual(ok(await db.client(null).rpc('debate_catalog')),[]);
  assert.equal(ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'})),null);
  denied(await db.client(null).from('debates').select('*'));
  assert.deepEqual((await db.client(U.id).from('debates').select('*')).data,[]);
  await f.update(f.recorded,{publication_status:'published'});
  const detail=ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'}));
  assert.equal(detail.recording_url,null);assert.deepEqual(detail.chapters,[]);assert.deepEqual(detail.summary,{});
  assert.equal(detail.participants.length,3);assert.equal(detail.stage,'announced');
 });
 await t.test('audience signup creates a profile and never an editor; consent cannot be omitted',async()=>{
  const user=randomUUID();await db.pg.query("insert into auth.users(id,raw_user_meta_data,email_confirmed_at) values($1,$2::jsonb,now())",[user,JSON.stringify({display_name:'مستخدم جديد',audience_terms:true,role:'management'})]);
  assert.equal((await db.pg.query('select count(*)::int n from public.public_profiles where user_id=$1',[user])).rows[0].n,1);
  assert.equal((await db.pg.query('select count(*)::int n from public.editors where user_id=$1',[user])).rows[0].n,0);
  const other=randomUUID();await db.pg.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[other]);
  denied(await audience(other,'profile',null,{display_name:'حساب بلا موافقة'}));
  ok(await audience(other,'profile',null,{display_name:'حساب بموافقة',accepted:true}));
  ok(await audience(other,'profile',null,{display_name:'اسم عرض معدل',show_avatar:false}));
  assert.equal((await db.pg.query('select display_name from public.public_profiles where user_id=$1',[other])).rows[0].display_name,'اسم عرض معدل');
 });
 await t.test('forged, revoked and cross-origin API requests are rejected; public viewers need no account',async()=>{
  assert.equal((await api(null,{action:'comment',data:{}})).status,401);
  assert.equal((await api('forged-token',null,{account:true})).status,401);
  assert.equal((await api(U.id,null,{admin:true})).status,403);
  assert.equal((await api(A.id,{action:'save',data:{}},{admin:true,origin:'https://attacker.invalid'})).status,403);
  assert.equal((await api(null,null)).status,200);
  assert.equal((await api(N.id,{action:'comment',data:{debate_id:f.recorded,body:'تعليق غير مؤكد'}})).status,403);
 });
 await t.test('database rejects unconfirmed direct RPC and forged table writes',async()=>{
  denied(await audience(N.id,'question',null,{debate_id:f.recorded,body:'هل يسمح لغير المؤكد بالسؤال؟'}));
  await assert.rejects(db.run(U.id,"insert into public.debates(slug,title,question,debate_type) values('forged','عنوان مزور','سؤال مزور','prerecorded')"));
  await assert.rejects(db.run(U.id,"update public.public_profiles set suspended=false where user_id=$1",[U.id]));
 });
 await t.test('prerecorded lifecycle publishes manually, embeds later and never enters live state',async()=>{
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:f.recorded,p_revision:(await f.get(f.recorded)).revision,p_data:{stage:'live',live_url:'https://youtube.com/live/test'}}));
  await f.update(f.recorded,{recording_published:true,stage:'recording_available'});
  const detail=ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'}));
  assert.ok(detail.recording_url);assert.equal(detail.chapters.length,2);assert.notEqual(detail.stage,'live');
 });
 await t.test('one vote per phase: edits update one row; closed polls reject writes; watch acknowledgement enforced',async()=>{
  let d=await f.full(f.recorded);const before=d.polls.find(p=>p.phase==='before'),after=d.polls.find(p=>p.phase==='after');
  denied(await audience(U.id,'vote',after.id,{debate_id:d.id,option_id:d.options[0].id}));
  ok(await audience(U.id,'vote',before.id,{debate_id:d.id,option_id:d.options[0].id}));
  ok(await audience(U.id,'vote',before.id,{debate_id:d.id,option_id:d.options[1].id}));
  assert.equal((await db.pg.query('select count(*)::int n from public.debate_votes where user_id=$1 and poll_id=$2',[U.id,before.id])).rows[0].n,1);
  ok(await audience(U.id,'vote',after.id,{debate_id:d.id,option_id:d.options[0].id,watched_confirmed:true}));
  await f.update(d.id,{polls:d.polls.map(p=>({...p,is_closed:true}))});
  denied(await audience(V.id,'vote',before.id,{debate_id:d.id,option_id:d.options[0].id}));
  denied(await db.client(B.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{polls:d.polls}}));
 });
 await t.test('no editor or other user can read individual votes, profiles or private helper aggregates',async()=>{
  assert.equal((await db.client(U.id).from('debate_votes').select('*')).data.length,2);
  assert.deepEqual((await db.client(A.id).from('debate_votes').select('*')).data,[]);
  assert.deepEqual((await db.client(M.id).from('debate_votes').select('*')).data,[]);
  assert.deepEqual((await db.client(V.id).from('debate_votes').select('*')).data,[]);
  assert.equal((await db.client(U.id).from('public_profiles').select('*')).data.length,1);
  denied(await db.client(A.id).rpc('debate_result_snapshot',{p_id:f.recorded,p_phase:'before'}));
  const response=await api(A.id,null,{admin:true});assert.equal(response.status,200);assert.ok(!('debate_votes' in response.data));assert.ok(!('public_profiles' in response.data));
 });
 await t.test('question moderation publishes only approved projection with pseudonym and no Auth ID',async()=>{
  const q=ok(await audience(U.id,'question',null,{debate_id:f.recorded,body:'هل يمكن توضيح أثر هذه المواقف؟',anonymous:true,axis:'المشاركة والتنمية'}));
  assert.equal(ok(await db.client(null).rpc('debate_discussion',{p_debate:f.recorded,p_kind:'questions'})).items.length,0);
  await f.rpc('moderate',q.id,{kind:'questions',status:'selected',reason:'سؤال مناسب للحوار'});
  const published=ok(await db.client(null).rpc('debate_discussion',{p_debate:f.recorded,p_kind:'questions'})).items[0];
  assert.equal(published.display_name,'مشارك');assert.ok(!('user_id' in published));assert.ok(!('email' in published));
  await f.rpc('moderate',q.id,{kind:'questions',status:'answered',reason:'أُجيب عنه تحريريًا'});
  denied(await audience(V.id,'question',null,{debate_id:f.recorded,body:'محور لا ينتمي إلى هذه المناظرة',axis:'محور مزور'}));
 });
 await t.test('participant removal explains audience question references and preserves all saved data',async()=>{
  const d=await f.full(f.recorded),target=d.participants[0];
  ok(await audience(V.id,'question',null,{debate_id:d.id,body:'سؤال لاختبار الحفاظ على توجيه المشارك',participant_id:target.id}));
  const removed=await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:d.revision,p_data:{participants:d.participants.slice(1),description:'تعديل لا ينبغي حفظه عند الفشل'}});
  assert.equal(removed.error.code,'22023');assert.match(removed.error.message,/Participant has audience questions/);
  assert.equal((await f.full(d.id)).participants.length,3);assert.equal((await f.get(d.id)).revision,d.revision);
 });
 await t.test('comment pending → approval → reply → edit/re-review → report → hide/delete; ownership enforced',async()=>{
  const c=ok(await audience(U.id,'comment',null,{debate_id:f.recorded,body:'تعليق محترم يحتاج إلى المراجعة'}));
  const discussion=()=>db.client(null).rpc('debate_discussion',{p_debate:f.recorded,p_kind:'comments'});
  const comment=async id=>(await db.pg.query('select * from public.debate_comments where id=$1',[id])).rows[0];
  const moderate=async(id,status)=>f.rpc('moderate',id,{kind:'comments',status,reason:'مراجعة وفق قواعد الحوار',updated_at:(await comment(id)).updated_at});
  assert.equal(ok(await discussion()).total,0);await moderate(c.id,'approved');
  const publicC=ok(await discussion()).items[0];assert.equal(publicC.display_name,U.name);assert.ok(!('user_id' in publicC));
  const reply=ok(await audience(V.id,'comment',null,{debate_id:f.recorded,parent_id:c.id,body:'رد على الفكرة باحترام'}));await moderate(reply.id,'approved');
  denied(await audience(V.id,'comment_edit',c.id,{body:'تعديل شخص آخر'}));
  const stale=await comment(c.id);ok(await audience(U.id,'comment_edit',c.id,{body:'نص معدل يحتاج موافقة جديدة'}));
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'moderate',p_id:c.id,p_data:{kind:'comments',status:'approved',reason:'مراجعة قديمة',updated_at:stale.updated_at}}));
  assert.equal((await comment(c.id)).status,'pending');await moderate(c.id,'approved');
  const report=ok(await audience(V.id,'report',c.id,{reason:'مراجعة هذا التعليق من فضلك'}));await f.rpc('moderate',report.id,{kind:'reports',status:'resolved',reason:'تمت مراجعة البلاغ'});
  await moderate(c.id,'hidden');assert.equal(ok(await discussion()).total,1);
  ok(await audience(U.id,'comment_delete',c.id));assert.equal((await comment(c.id)).status,'deleted');
  await moderate(reply.id,'rejected');assert.equal(ok(await discussion()).total,0);
 });
 await t.test('suggestions are private and convert atomically into one draft',async()=>{
  const s=ok(await audience(U.id,'suggestion',null,{title:'موضوع يستحق الحوار',question:'كيف نزيد فرص التنمية؟',explanation:'اقتراح محلي لاختبار الرحلة الكاملة',importance:'أهمية المشاركة المجتمعية',stances:'موقف أول وموقف ثان',suggested_speakers:''}));
  assert.deepEqual((await db.client(V.id).from('debate_suggestions').select('*')).data,[]);
  const converted=await f.rpc('convert',s.id);assert.equal((await f.get(converted.id)).publication_status,'draft');
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'convert',p_id:s.id}));
 });
 await t.test('live lifecycle requires explicit editorial confirmation despite elapsed schedule',async()=>{
  await f.update(f.live,{publication_status:'published',live_platform:'YouTube',live_url:'https://youtube.com/watch?v=abcdefghijk'});
  let d=ok(await db.client(null).rpc('debate_detail',{p_slug:'local-external-live'}));assert.equal(d.stage,'announced');
  const before=d.polls.find(p=>p.phase==='before');ok(await audience(U.id,'vote',before.id,{debate_id:d.id,option_id:d.options[0].id}));
  await f.update(d.id,{stage:'live'});assert.equal((await f.get(d.id)).stage,'live');
  await f.update(d.id,{stage:'ended'});
  await f.update(d.id,{recording_url:'https://youtu.be/abcdefghijk',recording_published:true,stage:'recording_available',summary:{introduction:'ملخص خضع للمراجعة',arguments:'مساحة متوازنة لكل موقف',conclusion:'خلاصة محايدة'},summary_published:true});
  d=ok(await db.client(null).rpc('debate_detail',{p_slug:'local-external-live'}));assert.equal(d.summary.conclusion,'خلاصة محايدة');
  ok(await audience(U.id,'vote',d.polls.find(p=>p.phase==='after').id,{debate_id:d.id,option_id:d.options[1].id}));
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{question:'تغيير السؤال بعد التصويت'}}));
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{debate_type:'prerecorded'}}));
  const full=await f.full(d.id);await f.update(d.id,{polls:full.polls.map(p=>({...p,is_closed:true}))});
  await f.rpc('results_publish',d.id,{phase:'before'},(await f.get(d.id)).revision);
  const publicResults=ok(await db.client(null).rpc('debate_detail',{p_slug:d.slug})).results;assert.equal(publicResults.before.suppressed,true);
  await f.update(d.id,{publication_status:'archived'});assert.equal(ok(await db.client(null).rpc('debate_detail',{p_slug:d.slug})).publication_status,'archived');
 });
 await t.test('preparation tasks use existing task center, retain links and reject duplicates',async()=>{
  await f.rpc('tasks',f.live,{},(await f.get(f.live)).revision);
  const tasks=await db.pg.query('select * from public.tasks where title like $1',['%حوار مباشر للاختبار المعزول%']);assert.equal(tasks.rows.length,11);assert.ok(tasks.rows.every(t=>t.links[0].includes('/admin/debates?debate=')));
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'tasks',p_id:f.live,p_revision:(await f.get(f.live)).revision}));
 });
 await t.test('one linked media work stays synchronized and cannot expose withdrawn recordings',async()=>{
  await f.rpc('media',f.recorded,{},(await f.get(f.recorded)).revision);await f.rpc('media',f.recorded,{},(await f.get(f.recorded)).revision);
  assert.equal((await db.pg.query('select count(*)::int n from public.works where debate_id=$1',[f.recorded])).rows[0].n,1);
  await f.update(f.recorded,{publication_status:'hidden'});
  assert.equal((await db.pg.query('select is_published from public.works where debate_id=$1',[f.recorded])).rows[0].is_published,false);
  await db.pg.query('update public.works set is_published=true where debate_id=$1',[f.recorded]);
  assert.equal((await db.pg.query('select is_published from public.works where debate_id=$1',[f.recorded])).rows[0].is_published,false);
  assert.equal(ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'})),null);
  await f.update(f.recorded,{publication_status:'published'});
 });
 await t.test('management-only suspension with reason, reactivation and immutable audit',async()=>{
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'suspend',p_id:U.id,p_data:{suspended:true,reason:'سبب واضح'}}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'suspend',p_id:U.id,p_data:{suspended:true,reason:'إساءة متكررة تستدعي المراجعة'}}));
  denied(await audience(U.id,'comment',null,{debate_id:f.recorded,body:'محاولة مشاركة أثناء التعطيل'}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'suspend',p_id:U.id,p_data:{suspended:false,reason:'انتهت مراجعة الحالة'}}));
  assert.deepEqual((await db.client(A.id).from('debate_moderation_actions').select('*')).data,[]);
  assert.ok((await db.client(M.id).from('debate_moderation_actions').select('*')).data.some(a=>a.actor_id===M.id&&a.reason==='انتهت مراجعة الحالة'));
 });
 await t.test('suspended owners can delete their comments while participation and other owners remain protected',async()=>{
  const comment=ok(await audience(V.id,'comment',null,{debate_id:f.recorded,body:'تعليق يحق لصاحبه حذفه بعد التعطيل'}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'suspend',p_id:V.id,p_data:{suspended:true,reason:'تعطيل محلي لاختبار الحذف'}}));
  denied(await audience(V.id,'comment_edit',comment.id,{body:'لا يمكن إنشاء محتوى جديد أثناء التعطيل'}));
  denied(await audience(U.id,'comment_delete',comment.id));
  ok(await audience(V.id,'comment_delete',comment.id));
  assert.equal((await db.pg.query('select status from public.debate_comments where id=$1',[comment.id])).rows[0].status,'deleted');
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'suspend',p_id:V.id,p_data:{suspended:false,reason:'انتهى اختبار الحذف'}}));
  denied(await db.client(V.id).rpc('debate_delete_rate'));
 });
 await t.test('per-account database rate limit resists direct RPC spam',async()=>{
  for(let i=0;i<5;i++)ok(await audience(V.id,'comment',null,{debate_id:f.recorded,body:'تعليق تجريبي رقم '+i}));
  const sixth=await audience(V.id,'comment',null,{debate_id:f.recorded,body:'تعليق يتجاوز الحد المسموح'});assert.equal(sixth.error.code,'P0429');
 });
 await t.test('stale debate revisions and cross-debate option IDs cannot change stored data',async()=>{
  const d=await f.get(f.recorded);await f.update(d.id,{description:'تعديل محفوظ في جلسة أخرى'});
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:d.revision,p_data:{description:'تعديل قديم'}}));
  const foreign=(await f.full(f.live)).options[0].id,own=await f.full(f.recorded);
  denied(await audience(V.id,'vote',own.polls[0].id,{debate_id:own.id,option_id:foreign,watched_confirmed:true}));
 });
 await t.test('immutable votes, timed phases, option locks and cross-debate references',async()=>{
  const saved=await f.rpc('save',null,{...f.draftData('prerecorded'),slug:'fixed-poll-test',publication_status:'published',recording_url:'https://youtu.be/abcdefghijk',recording_published:true,stage:'recording_available',polls:[{phase:'before',enabled:true,allow_change:false},{phase:'after',enabled:true,opens_at:'2099-01-01T00:00:00Z'}]});
  const d=await f.full(saved.id),pre=d.polls.find(p=>p.phase==='before'),after=d.polls.find(p=>p.phase==='after');
  ok(await audience(V.id,'vote',pre.id,{debate_id:d.id,option_id:d.options[0].id}));
  denied(await audience(V.id,'vote',pre.id,{debate_id:d.id,option_id:d.options[1].id}));
  denied(await audience(V.id,'vote',after.id,{debate_id:d.id,option_id:d.options[0].id,watched_confirmed:true}));
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{options:[{id:d.options[0].id,label:'خيار معدل',position:0},{...d.options[1],position:1}]}}));
  const foreignParticipant=(await f.full(f.recorded)).participants[0].id;
  denied(await audience(V.id,'question',null,{debate_id:d.id,body:'سؤال موجه إلى مشارك في مناظرة أخرى',participant_id:foreignParticipant}));
 });
 await t.test('public discussion paginates deterministically; hidden content never leaks',async()=>{
  const before=(await db.pg.query("select count(*)::int n from public.debate_comments where debate_id=$1 and status='approved'",[f.recorded])).rows[0].n;
  for(let i=0;i<25;i++)await db.pg.query("insert into public.debate_comments(debate_id,user_id,body,status,created_at) values($1,$2,$3,'approved',$4)",[f.recorded,V.id,'تعليق منشور لاختبار الصفحات '+i,new Date(Date.now()+i*1000)]);
  const first=ok(await db.client(null).rpc('debate_discussion',{p_debate:f.recorded,p_kind:'comments',p_page:1,p_order:'oldest'})),second=ok(await db.client(null).rpc('debate_discussion',{p_debate:f.recorded,p_kind:'comments',p_page:2,p_order:'oldest'}));
  assert.equal(first.items.length,20);assert.equal(first.total,before+25);assert.equal(second.items.length,before+5);assert.ok(!first.items.some(a=>second.items.some(b=>a.id===b.id)));
 });
 await t.test('aggregate math uses matched users only; snapshots approximate counts and suppress small cells',async()=>{
  const result=await f.rpc('save',null,{...f.draftData('prerecorded'),slug:'aggregate-test',publication_status:'published',recording_url:'https://youtu.be/abcdefghijk',recording_published:true,stage:'recording_available'}),d=await f.full(result.id),pre=d.polls.find(p=>p.phase==='before'),post=d.polls.find(p=>p.phase==='after');
  const voters=[];for(let i=0;i<20;i++){const uid=randomUUID();voters.push(uid);await db.pg.query("insert into auth.users(id,email_confirmed_at,raw_user_meta_data) values($1,now(),$2::jsonb)",[uid,JSON.stringify({display_name:'مشارك معزول '+i,audience_terms:true})]);ok(await audience(uid,'vote',pre.id,{debate_id:d.id,option_id:d.options[i<10?0:1].id}));ok(await audience(uid,'vote',post.id,{debate_id:d.id,option_id:d.options[(i<5||i>=10&&i<15)?1:0].id,watched_confirmed:true}));}
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'results_publish',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{phase:'before'}}));
  await f.update(d.id,{polls:d.polls.map(p=>({...p,is_closed:p.phase==='before'}))});
  await f.rpc('results_publish',d.id,{phase:'before'},(await f.get(d.id)).revision);
  let published=ok(await db.client(null).rpc('debate_detail',{p_slug:'aggregate-test'}));assert.equal(published.results.before.participants,20);assert.deepEqual(published.results.before.options.map(o=>o.percent),[50,50]);assert.ok(!published.results.after);
  await f.update(d.id,{polls:d.polls.map(p=>({...p,is_closed:true}))});await f.rpc('results_publish',d.id,{phase:'after'},(await f.get(d.id)).revision);
  published=ok(await db.client(null).rpc('debate_detail',{p_slug:'aggregate-test'}));assert.equal(published.results.paired.participants,20);assert.equal(published.results.paired.changed_percent,50);
  assert.ok(!JSON.stringify(published.results).includes(voters[0]));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible:false,reason:'إخفاء مؤقت للمراجعة'}}));
  assert.deepEqual(ok(await db.client(null).rpc('debate_detail',{p_slug:'aggregate-test'})).results,{});
  denied(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'save',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{polls:d.polls,reason:'إعادة فتح بعد النتائج'}}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'results_visibility',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{visible:true,reason:'اعتماد عرض اللقطة المحفوظة'}}));
  assert.deepEqual(ok(await db.client(null).rpc('debate_detail',{p_slug:'aggregate-test'})).results,published.results);
 });
 await t.test('disabled after polls cannot publish repeatable paired-only snapshots',async()=>{
  const created=await f.rpc('save',null,{...f.draftData('prerecorded'),slug:'disabled-phase-review',publication_status:'published',recording_url:'https://youtu.be/abcdefghijk',recording_published:true,stage:'recording_available'}),d=await f.full(created.id);
  for(let i=0;i<10;i++){
   const uid=randomUUID();await db.pg.query('insert into auth.users(id,email_confirmed_at,raw_user_meta_data) values($1,now(),$2::jsonb)',[uid,JSON.stringify({display_name:'مشارك محلي '+i,audience_terms:true})]);
   for(const p of d.polls)ok(await audience(uid,'vote',p.id,{debate_id:d.id,option_id:d.options[i<5?0:1].id,watched_confirmed:true}));
  }
  await f.update(d.id,{polls:d.polls.map(p=>({...p,is_closed:true,enabled:p.phase==='before'}))});
  for(let i=0;i<2;i++){
   const result=await db.client(A.id).rpc('debate_admin_mutate',{p_action:'results_publish',p_id:d.id,p_revision:(await f.get(d.id)).revision,p_data:{phase:'after'}});
   assert.equal(result.error.code,'22023');assert.match(result.error.message,/No enabled poll/);
  }
  assert.deepEqual((await f.get(d.id)).results,{});
 });
 await t.test('account vote context is private and remains available on later comment pages',async()=>{
  const owner=(await db.client(U.id).auth.getUser(U.id)).data.user;
  const history=await readAudienceAccount(db.client(U.id),owner,new URLSearchParams({activity:'1'}));
  assert.ok(history.debate_votes.items.some(v=>v.debate_slug&&v.phase&&v.option_label));
  const later=await readAudienceAccount(db.client(U.id),owner,new URLSearchParams({debate:f.recorded,page:'2'}));
  assert.equal(later.debate_votes.items.length,2);
  const other=await readAudienceAccount(db.client(V.id),(await db.client(V.id).auth.getUser(V.id)).data.user,new URLSearchParams({activity:'1'}));
  assert.ok(other.debate_votes.items.every(v=>v.user_id===V.id));
 });
 await t.test('reserved routes cannot be published, and management can explicitly repair older reserved URLs',async()=>{
  for(const slug of ['suggest','speakers']){
   const response=await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_data:{...f.draftData('prerecorded'),slug}});
   assert.ok(response.error);
  }
  // Simulate an old installation with a reserved URL before the corrective migration.
  await db.pg.exec('alter table public.debates disable trigger debate_slug_route_guard');
  const legacy=(await db.pg.query("insert into public.debates(slug,title,question,debate_type,first_published_at) values('suggest','رابط قديم للاختبار','سؤال للاختبار المحلي','prerecorded',now()) returning *")).rows[0];
  const migration=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../supabase/archive/legacy-migrations/202610200002_debates_review_fixes.sql',import.meta.url),'utf8'));
  await db.pg.exec(migration);
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'save',p_id:legacy.id,p_revision:legacy.revision,p_data:{slug:'repaired-legacy-route',reason:'إصلاح رابط قديم'}}));
  denied(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'save',p_id:legacy.id,p_revision:legacy.revision,p_data:{slug:'repaired-legacy-route'}}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'save',p_id:legacy.id,p_revision:legacy.revision,p_data:{slug:'repaired-legacy-route',reason:'إصلاح رابط محجوز سابق النشر'}}));
  const repaired=await f.get(legacy.id);assert.equal(repaired.slug,'repaired-legacy-route');assert.equal(repaired.publication_status,'draft');assert.equal(new Date(repaired.first_published_at).getTime(),new Date(legacy.first_published_at).getTime());
  // A legacy reserved URL must never prevent withdrawal of a speaker's consent.
  await db.pg.exec('alter table public.debates disable trigger debate_slug_route_guard');
  const legacyPublished=(await db.pg.query("insert into public.debates(slug,title,question,debate_type,publication_status,first_published_at) values('speakers','مناظرة قديمة للاختبار','سؤال للاختبار المحلي','prerecorded','published',now()) returning id")).rows[0];
  const speaker=await f.rpc('speaker',null,{slug:'legacy-withdraw-speaker',name:'مشارك يسحب موافقته',is_published:true});
  await db.pg.query('insert into public.debate_participants(debate_id,speaker_id) values($1,$2)',[legacyPublished.id,speaker.id]);
  await db.pg.exec(migration);
  await f.rpc('speaker',speaker.id,{is_published:false});
  assert.equal((await f.get(legacyPublished.id)).publication_status,'hidden');
 });
 await t.test('deletion requests disable participation; management anonymizes content and removes votes',async()=>{
  const existing=randomUUID();await db.pg.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[existing]);
  ok(await audience(existing,'deletion_request'));
  const deletionOnly=(await db.pg.query('select * from public.public_profiles where user_id=$1',[existing])).rows[0];assert.equal(deletionOnly.terms_accepted_at,null);assert.ok(deletionOnly.deletion_requested_at);
  ok(await audience(U.id,'deletion_request'));
  denied(await audience(U.id,'comment',null,{debate_id:f.recorded,body:'تعليق بعد طلب حذف الحساب'}));
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'anonymize',p_id:U.id,p_data:{reason:'تنفيذ طلب المستخدم لحذف الحساب'}}));
  assert.equal((await db.pg.query('select count(*)::int n from public.debate_votes where user_id=$1',[U.id])).rows[0].n,0);
  assert.equal((await db.pg.query('select display_name from public.public_profiles where user_id=$1',[U.id])).rows[0].display_name,'حساب محذوف');
 });
 await t.test('only management can permanently delete debates; task history survives deletion',async()=>{
  denied(await db.client(A.id).rpc('debate_admin_mutate',{p_action:'delete',p_id:f.live,p_revision:(await f.get(f.live)).revision,p_data:{reason:'لا يملك الصلاحية'}}));
  const before=(await db.pg.query('select count(*)::int n from public.tasks')).rows[0].n;
  ok(await db.client(M.id).rpc('debate_admin_mutate',{p_action:'delete',p_id:f.live,p_revision:(await f.get(f.live)).revision,p_data:{reason:'حذف بيانات الاختبار المعزولة'}}));
  assert.equal((await db.pg.query('select count(*)::int n from public.tasks')).rows[0].n,before);
 });
 await t.test('withdrawing a speaker hides related published debates and linked media',async()=>{
  const row=(await db.pg.query('select * from public.debate_speakers where id=$1',[f.speakers[0]])).rows[0];
  await f.rpc('speaker',row.id,{...row,is_published:false,reason:'سحب موافقة نشر ملف المشارك'});
  assert.equal((await f.get(f.recorded)).publication_status,'hidden');
  assert.equal(ok(await db.client(null).rpc('debate_detail',{p_slug:'local-prerecorded'})),null);
  assert.ok((await db.pg.query('select is_published from public.works where debate_id=$1',[f.recorded])).rows.every(x=>!x.is_published));
 });
});
test('public return paths, validation, search and SEO preserve audience privacy',()=>{
 assert.equal(safeAccountReturn('/debates/local-test#questions'),'/debates/local-test#questions');
 for(const bad of ['//evil.test','https://evil.test','/\\evil','/admin','/account/../../admin','/debates/%2f%2fevil']){
  const result=safeAccountReturn(bad);if(bad==='/debates/%2f%2fevil')assert.ok(result.startsWith('/debates/'));else assert.equal(result,'/account');
 }
 assert.throws(()=>validateDebateCommand({action:'save',data:{title:'اختبار',question:'سؤال',slug:'good',debate_type:'prerecorded',stage:'live'}},true));
 const published={id:'pub',slug:'public-debate',title:'مناظرة علنية',question:'سؤال منشور',publication_status:'published'},draft={...published,id:'draft',slug:'private-debate',publication_status:'draft'};
 const search=buildSearchIndex({debates:[published,draft]});assert.equal(search.length,1);assert.equal(search[0].type,'debates');
 const map=buildSitemap({debates:[published,draft]},{NODE_ENV:'production'});assert.ok(map.some(x=>x.url.endsWith('/debates/public-debate')));assert.ok(!map.some(x=>x.url.includes('private-debate')));
 assert.ok(robotsPolicy({NODE_ENV:'production'}).rules.every(r=>r.disallow.includes('/account')));
 for(const slug of ['suggest','speakers'])assert.throws(()=>validateDebateCommand({action:'save',data:{title:'اختبار',question:'سؤال',slug,debate_type:'prerecorded'}},true));
 assert.deepEqual(debateListState('?q=حوار&category=unknown&type=bad&stage=bad&sort=bad&page=-1'),{q:'حوار',category:'',type:'',stage:'',sort:'newest',page:1});
 assert.match(formatDebateDateTime('2026-10-20T22:30:00Z'),/21/);assert.match(formatDebateDateTime('2026-10-20T22:30:00Z'),/01:30/);assert.equal(formatDebateDateTime('bad-date'),'');
});
