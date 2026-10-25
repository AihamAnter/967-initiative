import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readPublicSetting,writePublicSetting} from '../lib/publicSettingRepository.js';

test('public settings compare-and-swap serializes simultaneous writes and preserves unrelated keys',async()=>{
 const pg=new PGlite();
 await pg.exec('create table site_settings(key text primary key,value jsonb,updated_at timestamptz);');
 const db={from(table){assert.equal(table,'site_settings');let action='read',payload,conditions=[];const query={select(){return query;},eq(key,value){conditions.push([key,value]);return query;},insert(row){action='insert';payload=row;return query;},update(row){action='update';payload=row;return query;},async maybeSingle(){try{let sql,params=[];if(action==='insert'){params=[payload.key,JSON.stringify(payload.value),payload.updated_at];sql='insert into site_settings values($1,$2::jsonb,$3) returning updated_at';}else{const where=conditions.map(([key,value])=>{assert.ok(['key','updated_at'].includes(key));params.push(value);return key+'=$'+params.length;}).join(' and ');if(action==='read')sql='select key,value,updated_at from site_settings where '+where;else{params.push(JSON.stringify(payload.value),payload.updated_at);sql='update site_settings set value=$'+(params.length-1)+'::jsonb,updated_at=$'+params.length+' where '+where+' returning updated_at';}}const result=await pg.query(sql,params);return {data:result.rows[0]?JSON.parse(JSON.stringify(result.rows[0])):null,error:null};}catch(error){return {data:null,error};}}};return query;}};
 try{
  const first=await writePublicSetting(db,'visibility',{works:true},null,()=>1000);
  await writePublicSetting(db,'district',{history:'original'},null,()=>1000);
  const results=await Promise.allSettled([writePublicSetting(db,'visibility',{works:false},first.revision,()=>2000),writePublicSetting(db,'visibility',{works:true},first.revision,()=>2000)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
  assert.deepEqual((await readPublicSetting(db,'visibility')).value,{works:false});
  assert.deepEqual((await readPublicSetting(db,'district')).value,{history:'original'});
  await assert.rejects(writePublicSetting(db,'visibility',{},null),error=>error.status===409);
  await assert.rejects(writePublicSetting(db,'visibility',{},undefined),error=>error.status===400);
 }finally{await pg.close();}
});
