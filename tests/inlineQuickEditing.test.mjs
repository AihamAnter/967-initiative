import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const file=path=>readFileSync(new URL(path,root),'utf8');
const wrapper=file('components/inline/InlineContentEditor.jsx');
const editor=file('components/inline/InlineAdvancedEditor.jsx');
const endpoint=file('app/api/admin/inline-quick/route.js');

test('every advanced public content type now mounts a real inline form',()=>{
 for(const kind of ['university','medical_center','statistic','ranking','district']){
  assert.match(wrapper,new RegExp("['\"]"+kind+"['\"]"));
  assert.match(editor,new RegExp("\\b"+kind+":\\s*\\["));
 }
 assert.ok(wrapper.includes('<InlineAdvancedEditor {...props}/>'));
 assert.ok(wrapper.includes('<BaseInlineContentEditor {...props}/>'));
});

test('all quick-edit save branches use existing verified endpoints',()=>{
 assert.ok(editor.includes("'/api/admin/inline-quick'"));
 assert.ok(editor.includes("'/api/admin/rankings'"));
 assert.ok(editor.includes("'/api/admin/districts?id='"));
 assert.ok(editor.includes("onSaved?.(target,result)"));
 assert.ok(editor.includes('onDirtyChange?.(dirty)'));
 assert.ok(editor.includes('onBusyChange?.(busy)'));
 assert.ok(editor.includes('window.confirm'));
});

test('new read/write route verifies editor roles and rejects arbitrary fields',()=>{
 for(const invariant of [
  'authorizeEditorRequest(request,db)',
  'readJsonObject(request',
  "keys.some(key=>!config.allowed.includes(key))",
  "inputId(writing?body.id:params.get('id'))",
  "item.revision!==body.revision",
  "item.updated_at!==body.revision",
  "eq('updated_at',body.revision)",
  "db.rpc(config.rpc",
  "p_revision:body.revision",
  'relations'
 ])assert.ok(endpoint.includes(invariant),invariant);
 assert.ok(!endpoint.includes('service_role'));
});

test('quick directory save keeps source metadata and relation groups intact',()=>{
 for(const key of ['p_programs','p_specialties','p_services','p_hours','p_branches','p_sources'])assert.ok(endpoint.includes(key));
 for(const key of ['sources:university_sources(*)','sources:medical_center_sources(*)'])assert.ok(endpoint.includes(key));
 assert.ok(endpoint.includes('const {id:relationId'));
 assert.ok(endpoint.includes('return rest;'));
 assert.ok(endpoint.includes('directory_save_university'));
 assert.ok(endpoint.includes('directory_save_medical_center'));
});

test('the existing editor keeps all previously supported types and extends company stories',()=>{
 for(const key of ["issue:[","work:[","company:[","professional:[","figure:[","page:[","governorate:[","district:["])assert.ok(wrapper.includes(key));
 assert.ok(wrapper.includes("field('story','قصة المنشأة'"));
 assert.ok(wrapper.includes("field('impact','الأثر والنشاط'"));
});
