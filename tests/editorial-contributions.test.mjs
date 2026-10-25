import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorialTestDatabase,inlineTestUsers} from './helpers/editorialTestDatabase.mjs';
import {seedDebateFixtures} from './helpers/debateFixtures.mjs';
import {createDefaultContentPages,mutateContentCatalog} from '../lib/contentPages.js';
test('committed direct edits, semantic no-ops, rollback, unique content and real identity',async()=>{
 const db=await createEditorialTestDatabase();try{
 const a=inlineTestUsers[0].id,b=inlineTestUsers[1].id;
 const rows=()=>db.pg.query('select * from public.editorial_contributions order by created_at');
 const insert=await db.run(a,"insert into public.issues(slug,number,title,pdf_url,issue_date) values('audit-local',901,'عدد محلي','https://example.test/file.pdf','2026-10-25') returning id");const id=insert.rows[0].id;
 assert.equal((await rows()).rows.length,1);assert.equal((await rows()).rows[0].actor_id,a);
 await db.run(a,'update public.issues set title=title where id=$1',[id]);assert.equal((await rows()).rows.length,1);
 for(let i=1;i<=5;i++)await db.run(b,'update public.issues set title=$1 where id=$2',['عدد محلي '+i,id]);
 await assert.rejects(db.run(a,"update public.issues set title='فشل',pdf_url='invalid' where id=$1",[id]));assert.equal((await rows()).rows.length,6);
 await db.run(b,'update public.issues set is_published=true where id=$1',[id]);
 const report=(await db.run(a,"select public.editorial_report('{}') result")).rows[0].result;
 assert.equal(report.summary.operations,7);assert.equal(report.summary.uniqueContent,1);assert.equal(report.summary.updates,5);assert.equal(report.summary.publishes,1);
 assert.equal(report.activity.at(-1).title,'عدد محلي');assert.equal(report.members.length,2);
 for(const user of [null,inlineTestUsers.find(u=>!u.role).id]){
  await assert.rejects(db.run(user,"select public.editorial_report('{}')"));
  if(user)assert.equal((await db.run(user,'select * from public.editorial_contributions')).rows.length,0);
 }
 await assert.rejects(db.run(a,"delete from public.editorial_contributions"));await assert.rejects(db.service("delete from public.editorial_contributions"));
 await db.run(a,'delete from public.issues where id=$1',[id]);assert.equal((await rows()).rows.length,8);
 const deleted=(await db.run(a,"select public.editorial_report('{}') result")).rows[0].result;assert.ok(deleted.activity.every(x=>x.deleted));
 assert.ok((await rows()).rows.every(x=>!('before_value' in x)&&!('after_value' in x)));
 }finally{await db.pg.close();}
});

test('inline corrections and undo keep one trusted event; failures and no-ops create none',async()=>{
 const db=await createEditorialTestDatabase();try{
 const actor=inlineTestUsers[0].id;
 const row=(await db.run(actor,"insert into public.issues(slug,number,title,pdf_url,issue_date,is_published) values('inline-audit',902,'قبل التصحيح','https://example.test/file.pdf','2026-10-25',true) returning *")).rows[0];
 await db.run(actor,"select public.editorial_inline_correction('issue',$1,$2,'{\"title\":\"بعد التصحيح\"}')",[row.id,row.revision]);
 let events=(await db.pg.query('select * from public.editorial_contributions where content_id=$1 order by created_at',[row.id])).rows;
 assert.equal(events.length,2);assert.equal(events[1].action,'correction');assert.equal(events[1].origin,'rpc:inline_correction');assert.deepEqual(events[1].changed_fields,['title']);
 await assert.rejects(db.run(actor,"select public.inline_content_save('issue',$1,1,'{\"title\":\"Stale\"}')",[row.id]));
 const current=(await db.pg.query('select revision from public.issues where id=$1',[row.id])).rows[0];
 const unpublished=(await db.run(actor,"select public.inline_content_save('issue',$1,$2,'{\"is_published\":false}') result",[row.id,current.revision])).rows[0].result;
 const audit=(await db.pg.query("select id from public.inline_content_audit where target_id=$1 and after_value->>'is_published'='false' order by created_at desc limit 1",[row.id])).rows[0];
 assert.ok(unpublished);await db.run(actor,'select public.inline_content_undo($1)',[audit.id]);
 events=(await db.pg.query('select * from public.editorial_contributions where content_id=$1 order by created_at',[row.id])).rows;
 assert.equal(events.length,4);assert.equal(events[2].action,'unpublish');assert.equal(events[3].action,'restore');
 }finally{await db.pg.close();}
});

test('every editorial table is covered, nested debate saves coalesce and audience activity is excluded',async()=>{
 const db=await createEditorialTestDatabase();try{
 const actor=inlineTestUsers[0].id;
 const fixtures=[
 ["insert into public.works(slug,title,external_url) values('audit-work','عمل محلي','https://example.test') returning id",'work'],
 ["insert into public.yemeni_companies(slug,name,category,location) values('audit-company','شركة محلية','اختبار','تعز') returning id",'company'],
 ["insert into public.professionals(slug,full_name,profession_title,category,location,services) values('audit-person','مهني محلي','نجار','أعمال','تعز',array['خدمة']) returning id",'professional'],
 ["insert into public.governorates(id,name_ar) values('YE99','محافظة محلية') returning id",'governorate'],
 ["insert into public.districts(id,governorate_id,name_ar) values('YE9901','YE99','مديرية محلية') returning id",'district'],
 ["insert into public.stat_sections(slug,name) values('audit-section','قسم محلي') returning id",'statistic_section'],
 ["insert into public.stat_sources(name) values('مصدر محلي') returning id",'statistic_source']];
 for(const [sql,type]of fixtures){const id=(await db.run(actor,sql)).rows[0].id;assert.equal((await db.pg.query('select content_type from public.editorial_contributions where content_id=$1',[id])).rows[0].content_type,type);}
 const debate=await seedDebateFixtures(db);const before=(await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n;
 await debate.update(debate.recorded,{chapters:[{title:'مقدمة محدثة',start_seconds:0},{title:'مواقف محدثة',start_seconds:300}]});
 const after=(await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n;assert.equal(after,before+1);
 await debate.update(debate.recorded,{chapters:[{title:'مقدمة محدثة',start_seconds:0},{title:'مواقف محدثة',start_seconds:300}]});
 assert.equal((await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n,after,'identical child rewrite is not a contribution');
 const ordinary=inlineTestUsers.find(u=>!u.role&&!u.unconfirmed).id;
 await db.pg.query("insert into public.debate_questions(debate_id,user_id,body) values($1,$2,'سؤال محلي لا يعد تحريرًا')",[debate.live,ordinary]);
 assert.equal((await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n,after);
 }finally{await db.pg.close();}
});

test('verified service writes are attributed, profile-only edits recorded, settings and ranking use CAS',async()=>{
 const db=await createEditorialTestDatabase();try{
 const actor=inlineTestUsers[0].id,manager=inlineTestUsers.find(u=>u.role==='management').id;
 const call=async(kind,id,revision,data,action='update',profile=false)=>(await db.service('select public.editorial_service_save($1,$2,$3,$4::jsonb,$5,$6,$7) result',[kind,id,revision,JSON.stringify(data),actor,action,profile])).rows[0].result.record;
 const id='99999999-9999-4999-8999-999999999999',figure={id,slug:'service-figure',full_name:'شخصية محلية',known_for:'أديب',field:'الأدب',governorate_id:'',governorate_name:'',era:'تاريخية',short_bio:'سيرة محلية',display_order:0,is_published:false,updated_at:'2026-10-25T10:00:00Z'};
 await call('figure',id,null,figure,'create',true);
 await call('figure',id,figure.updated_at,{...figure,updated_at:'2026-10-25T10:00:01Z'},'update',false);
 await call('figure',id,'2026-10-25T10:00:01Z',{...figure,updated_at:'2026-10-25T10:00:02Z'},'update',true);
 const events=(await db.pg.query('select * from public.editorial_contributions where content_id=$1 order by created_at',[id])).rows;assert.equal(events.length,2);assert.equal(events[1].actor_id,actor);assert.deepEqual(events[1].changed_fields,['profile']);
 await assert.rejects(db.run(actor,"select public.editorial_service_save('figure',$1,null,'{}',$2)",[id,manager]));
 const setting=await call('setting','public_page_visibility_v1',null,{version:1,sections:{figures:false}});
 await assert.rejects(call('setting','public_page_visibility_v1',null,{version:1,sections:{figures:true}}),e=>e.code==='40001');
 await call('setting','public_page_visibility_v1',setting.updated_at,{version:1,sections:{figures:true}});
 await assert.rejects(call('setting','secret_key',null,{password:'never-log-me'}));
 const rank=await call('ranking',null,null,{slug:'audit-ranking',name:'مؤشر محلي',category:'economic',unit:'نسبة',code:'SP.POP.TOTL',direction:'desc',better:'contextual',description:'اختبار',display_order:0,is_published:false});
 await call('ranking',rank.id,rank.updated_at,{payload:{version:1,indicatorCode:rank.code},summary:{}},'snapshot');
 await assert.rejects(call('ranking',rank.id,rank.updated_at,{payload:{version:1,indicatorCode:'OTHER.CODE'},summary:{}},'snapshot'));
 const snapshotEvents=(await db.pg.query("select * from public.editorial_contributions where content_type='ranking'")).rows;assert.equal(snapshotEvents.length,2);assert.ok(snapshotEvents.every(e=>e.actor_id===actor));
 const payload={key:'public_content_pages_v1',value:{version:1,pages:[{id:'local-page',slug:'local-page',title:'صفحة محلية',description:'شرح',isPublished:false}]},updated_at:'2026-10-25T10:00:00Z'};
 await db.service("select public.editorial_service_save('page','public_content_pages_v1',null,$1::jsonb,$2,'create',false,'[]')",[JSON.stringify(payload),actor]);
 const pageEvent=(await db.pg.query("select * from public.editorial_contributions where content_type='page'")).rows;assert.equal(pageEvent.length,1);assert.equal(pageEvent[0].actor_id,actor);assert.equal(pageEvent[0].is_published,false);
 }finally{await db.pg.close();}
});

test('indicator and source links commit atomically, preserve metadata and reject stale writers',async()=>{
 const db=await createEditorialTestDatabase();try{
 const actor=inlineTestUsers[0].id;
 const section=(await db.run(actor,"insert into public.stat_sections(slug,name) values('s-local','قسم محلي') returning id")).rows[0].id;
 const domain=(await db.run(actor,"insert into public.stat_domains(section_id,slug,name) values($1,'d-local','مجال محلي') returning id",[section])).rows[0].id;
 const source=(await db.run(actor,"insert into public.stat_sources(name) values('مصدر موثق محلي') returning id")).rows[0].id;
 const payload={domain_id:domain,slug:'i-local',name:'مؤشر محلي',unit:'نسبة',short_description:'',definition:'',improvement_direction:'contextual',measurement_method:'',data_status:'complete',chart_type:'line',adopted_source_id:source,is_published:false,hide_when_incomplete:true};
 const save=async(id,revision,data,sources)=>(await db.run(actor,'select public.editorial_statistic_save($1,$2,$3::jsonb,array(select jsonb_array_elements_text($4::jsonb))::uuid[]) result',[id,revision,JSON.stringify(data),JSON.stringify(sources)])).rows[0].result.record;
 const record=await save(null,null,payload,[source]);
 await assert.rejects(db.run(actor,'select public.editorial_statistic_save($1,$2,$3::jsonb,null)',[record.id,record.updated_at,JSON.stringify(payload)]),e=>e.code==='22023');
 assert.equal((await db.pg.query("select count(*)::int n from public.editorial_contributions where content_id=$1",[record.id])).rows[0].n,1);
 await db.run(actor,"update public.stat_indicator_sources set methodology='منهجية محفوظة',series_label='سلسلة محفوظة' where indicator_id=$1",[record.id]);
 const next=await save(record.id,record.updated_at,{...payload,name:'عنوان مصحح'},[source]);
 const link=(await db.pg.query('select * from public.stat_indicator_sources where indicator_id=$1',[record.id])).rows[0];assert.equal(link.methodology,'منهجية محفوظة');assert.equal(link.series_label,'سلسلة محفوظة');
 await assert.rejects(save(record.id,record.updated_at,payload,[source]),e=>e.code==='40001');
 const count=(await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n;
 await assert.rejects(save(record.id,next.updated_at,{...payload,name:'لن يحفظ'},[source,'99999999-9999-4999-8999-999999999999']));
 assert.equal((await db.pg.query('select name from public.stat_indicators where id=$1',[record.id])).rows[0].name,'عنوان مصحح');assert.equal((await db.pg.query('select count(*)::int n from public.editorial_contributions')).rows[0].n,count);
 const value=(await db.run(actor,'insert into public.stat_values(indicator_id,source_id,year,value,is_published) values($1,$2,2025,50,true) returning id',[record.id,source])).rows[0].id;
 assert.equal((await db.pg.query("select count(*)::int n from public.editorial_contributions where content_type='statistic_value'")).rows[0].n,1);
 await db.run(actor,'update public.stat_sections set is_published=true where id=$1',[section]);await db.run(actor,'update public.stat_domains set is_published=true where id=$1',[domain]);await db.run(actor,"update public.stat_indicators set is_published=true,slug='new-indicator-route' where id=$1",[record.id]);
 let report=(await db.run(actor,"select public.editorial_report('{}') result")).rows[0].result;let entry=report.activity.find(e=>e.content_id===value);assert.equal(entry.current_published,true);assert.equal(entry.current_path,'/yemen-in-numbers/indicator/new-indicator-route');
 await db.run(actor,'update public.stat_domains set is_published=false where id=$1',[domain]);report=(await db.run(actor,"select public.editorial_report('{}') result")).rows[0].result;assert.equal(report.activity.find(e=>e.content_id===value).current_published,false);
 await db.run(inlineTestUsers.find(u=>u.role==='management').id,'delete from public.stat_indicators where id=$1',[record.id]);
 report=(await db.run(actor,"select public.editorial_report('{}') result")).rows[0].result;assert.ok(report.activity.filter(e=>e.content_id===value).every(e=>e.deleted));
 }finally{await db.pg.close();}
});

test('unconfirmed, banned and revoked editors cannot read events or aggregates',async()=>{
 const db=await createEditorialTestDatabase();try{
 const user=inlineTestUsers.find(u=>u.unconfirmed).id;
 await db.pg.query("insert into public.editors(user_id,role) values($1,'admin')",[user]);
 assert.equal((await db.run(user,'select * from public.editorial_audit_activation')).rows.length,0);await assert.rejects(db.run(user,"select public.editorial_report('{}')"),e=>e.code==='42501');
 await db.pg.query("update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 day' where id=$1",[user]);
 await assert.rejects(db.run(user,"select public.editorial_report('{}')"),e=>e.code==='42501');await db.pg.query('update auth.users set banned_until=null where id=$1',[user]);
 assert.ok((await db.run(user,"select public.editorial_report('{}') result")).rows[0].result.activatedAt);
 await db.pg.query('delete from public.editors where user_id=$1',[user]);assert.equal((await db.run(user,'select * from public.editorial_contributions')).rows.length,0);await assert.rejects(db.run(user,"select public.editorial_report('{}')"));
 }finally{await db.pg.close();}
});

test('first persistence of existing public page defaults attributes only the real change',async()=>{
 for(const action of ['update','create','delete','noop']){
  const db=await createEditorialTestDatabase();try{
   const actor=inlineTestUsers.find(u=>u.role==='management').id,baseline=createDefaultContentPages();
   const first=baseline.find(p=>p.slug==='about');
   const input=action==='create'?{...baseline.find(p=>p.kind==='article'),id:'new-local-page',slug:'new-local-page',title:'صفحة جديدة'}:action==='update'?{...first,title:'عنوان معدل الآن'}:first;
   const pages=action==='noop'?baseline:mutateContentCatalog(baseline,action,input,'management','2026-10-25T10:00:00Z');
   const payload={key:'public_content_pages_v1',value:{version:1,pages},updated_at:'2026-10-25T10:00:00Z'};
   await assert.rejects(db.run(actor,"insert into public.site_settings(key,value) values('public_content_pages_v1',$1::jsonb)",[JSON.stringify(payload.value)]),e=>e.code==='42501');
   await db.service("select public.editorial_service_save('page','public_content_pages_v1',null,$1::jsonb,$2,'create',false,$3::jsonb)",[JSON.stringify(payload),actor,JSON.stringify(baseline)]);
   const events=(await db.pg.query("select * from public.editorial_contributions where content_type='page'")).rows;
   assert.equal(events.length,action==='noop'?0:1,action);if(action!=='noop'){assert.equal(events[0].action,action);assert.equal(events[0].actor_id,actor);assert.equal(events[0].content_id,input.id);}
  }finally{await db.pg.close();}
 }
});
