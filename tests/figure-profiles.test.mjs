import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {emptyFigureProfile,validateFigureProfile,figureProfilePath} from '../lib/figureProfiles.js';
import {readFigureProfile,saveFigureProfile,deleteFigureProfile,validateFigureRecord} from '../lib/figureProfileRepository.js';
import {mapYemeniFigure,toFigureDirectoryCard} from '../lib/yemeniFigures.js';
import {figureSchema} from '../lib/seo-schema.js';

const sample=()=>({slug:'source-linked-figure',full_name:'Reference Figure',known_for:'Writer',field:'Literature',governorate_id:'',era:'معاصرة',birth_year:1970,death_year:null,short_bio:'A concise biography.',display_order:1,is_published:false});
const detailed=()=>({...emptyFigureProfile(),reviewedAt:'2026-10-19',sources:[{id:'archive',title:'Original archive',url:'https://example.org/archive',publisher:'Archive',accessedAt:'2026-10-19'}],sections:[{id:'life',title:'Life',paragraphs:['A source-linked biography.'],sourceIds:['archive']}],timeline:[{id:'publication',year:1998,title:'Publication',sourceIds:['archive']}],works:[{id:'book',title:'Book',year:1998,sourceIds:['archive']}],gallery:[{id:'photo',url:'https://example.org/photo.webp',alt:'At a documented event',kind:'context',credit:'Photographer',license:'CC BY-SA 4.0',sourceUrl:'https://example.org/photo',sourceIds:['archive']}],notes:['Some dates are approximate.']});
function memoryDb({beforeWrite,writeError,storageError}={}){
 const state={rows:[],files:new Map(),writes:0};
 const db={storage:{from(bucket){assert.equal(bucket,'figure-profiles');return {async upload(path,body,options){assert.equal(options.upsert,false);if(storageError)return {error:storageError};if(state.files.has(path))return {error:{statusCode:409}};state.files.set(path,body);return {data:{path},error:null};},async download(path){return state.files.has(path)?{data:new Blob([state.files.get(path)]),error:null}:{data:null,error:{status:404}};},async remove(paths){for(const p of paths)state.files.delete(p);return {error:null};}};}},from(table){assert.equal(table,'yemeni_figures');let action='read',payload,filters={};const query={select(){return query;},eq(key,value){filters[key]=value;return query;},insert(value){action='insert';payload=value;return query;},update(value){action='update';payload=value;return query;},delete(){action='delete';return query;},async maybeSingle(){if(action==='read')return {data:structuredClone(state.rows.find(r=>r.id===filters.id)||null),error:null};if(beforeWrite)await beforeWrite(state);if(writeError)return {data:null,error:writeError};const index=state.rows.findIndex(r=>r.id===filters.id&&r.updated_at===filters.updated_at);if(action!=='insert'&&index===-1)return {data:null,error:null};if(action==='insert'&&state.rows.some(r=>r.slug===payload.slug))return {data:null,error:{code:'23505'}};let result;if(action==='insert'){state.rows.push(structuredClone(payload));result=payload;}if(action==='update'){state.rows[index]=structuredClone(payload);result=payload;}if(action==='delete'){result=state.rows.splice(index,1)[0];}state.writes++;return {data:structuredClone(result),error:null};}};return query;}};return {db,state};
}

test('structured figures preserve sources, dates, image rights and editorial notes without unknown fields',()=>{
 const p=detailed(),clean=validateFigureProfile({...p,privateEmail:'must not store'});assert.equal(clean.timeline[0].year,1998);assert.equal(clean.gallery[0].license,'CC BY-SA 4.0');assert.equal(clean.notes[0],p.notes[0]);assert.equal(clean.privateEmail,undefined);
 for(const patch of [{sources:[{...p.sources[0],url:'javascript:alert(1)'}]},{sections:[{...p.sections[0],sourceIds:['missing']}]},{timeline:[{...p.timeline[0],year:'1998x'}]},{reviewedAt:'2026-02-31'},{gallery:[{...p.gallery[0],license:''}]}])assert.throws(()=>validateFigureProfile({...p,...patch}));
 assert.throws(()=>validateFigureRecord({...sample(),website:'https://user:password@example.org'}));
 assert.equal(validateFigureRecord(sample()).image_credit,'');assert.equal(validateFigureRecord(sample()).image_source_url,null);
 assert.throws(()=>figureProfilePath({id:'../secret',updated_at:new Date().toISOString()}));
});

test('private immutable profiles round trip with their base row and preserve publication on edits',async()=>{
 const {db,state}=memoryDb(),first=await saveFigureProfile(db,{record:sample(),profile:detailed(),revision:null,role:'admin'},()=>1000000000000);
 assert.equal(first.record.is_published,false);assert.equal(state.files.size,1);assert.deepEqual(await readFigureProfile(db,first.record),first.profile);
 const next=await saveFigureProfile(db,{record:{...first.record,is_published:true},profile:{...first.profile,notes:['Edited']},revision:first.revision,role:'management'},()=>1000000000000);
 assert.notEqual(next.revision,first.revision);assert.equal(state.files.size,2);assert.equal(next.record.is_published,true);assert.deepEqual((await readFigureProfile(db,next.record)).notes,['Edited']);assert.deepEqual((await readFigureProfile(db,first.record)).notes,detailed().notes);
 await assert.rejects(saveFigureProfile(db,{record:first.record,profile:detailed(),revision:first.revision,role:'admin'}),e=>e.status===409);assert.equal(state.writes,2);
});

test('concurrent row changes, duplicate routes and storage failures cannot overwrite published content',async()=>{
 const {db,state}=memoryDb({beforeWrite(s){if(s.rows.length)s.rows[0].updated_at='2026-10-20T00:00:00.000Z';}});
 const first=await saveFigureProfile(db,{record:sample(),profile:detailed(),revision:null,role:'management'});
 await assert.rejects(saveFigureProfile(db,{record:first.record,profile:detailed(),revision:first.revision,role:'admin'}),e=>e.status===409);assert.equal(state.writes,1);assert.equal(state.files.size,1);
 const duplicate=memoryDb();await saveFigureProfile(duplicate.db,{record:sample(),profile:detailed(),revision:null,role:'admin'});await assert.rejects(saveFigureProfile(duplicate.db,{record:sample(),profile:detailed(),revision:null,role:'admin'}),e=>e.status===409);assert.equal(duplicate.state.files.size,1);
 const offline=memoryDb({storageError:{statusCode:503}});await assert.rejects(saveFigureProfile(offline.db,{record:sample(),profile:detailed(),revision:null,role:'admin'}),e=>e.status===503);assert.equal(offline.state.rows.length,0);
 const uncertain=memoryDb({writeError:{message:'Network timeout'}});await assert.rejects(saveFigureProfile(uncertain.db,{record:sample(),profile:detailed(),revision:null,role:'admin'}),e=>e.status===503);assert.equal(uncertain.state.files.size,1,'An uncertain commit must not lose its uploaded biography');
});

test('deletion is management-only, revision checked, and leaves historical files private',async()=>{
 const {db,state}=memoryDb(),saved=await saveFigureProfile(db,{record:sample(),profile:detailed(),revision:null,role:'admin'});
 await assert.rejects(deleteFigureProfile(db,{id:saved.record.id,revision:saved.revision,role:'admin'}),e=>e.status===403);
 await assert.rejects(deleteFigureProfile(db,{id:saved.record.id,revision:'2000-01-01',role:'management'}),e=>e.status===409);
 await deleteFigureProfile(db,{id:saved.record.id,revision:saved.revision,role:'management'});assert.equal(state.rows.length,0);assert.equal(state.files.size,1);
 await assert.rejects(saveFigureProfile(db,{record:sample(),profile:detailed(),revision:null,role:'reader'}),e=>e.status===403);
});

test('corrupt or unavailable profile storage fails explicitly instead of erasing the saved biography',async()=>{
 const {db,state}=memoryDb(),saved=await saveFigureProfile(db,{record:sample(),profile:detailed(),revision:null,role:'admin'});
 state.files.set(figureProfilePath(saved.record),'invalid json');await assert.rejects(readFigureProfile(db,saved.record),e=>e.status===503);
 state.files.clear();assert.equal(await readFigureProfile(db,saved.record),null);
});

test('directory payload stays compact and context images never become Person portraits',()=>{
 const figure={...mapYemeniFigure({...sample(),image_credit:'صورة سياقية — Photographer',image_url:'https://example.org/photo.webp'}),profile:validateFigureProfile(detailed())};
 const card=toFigureDirectoryCard(figure);assert.equal(card.profile,undefined);assert.equal(card.biographyText,undefined);assert.equal(card.imageKind,'context');assert.equal(figureSchema(figure)?.image,undefined);
 assert.equal(figureSchema({...figure,profile:{...figure.profile,historicity:'traditional'}}),null);
});

test('every imported figure has real editable source-linked content, with honest uncertain dates and attributed images',()=>{
 const rows=JSON.parse(readFileSync('data/yemeni-figures/profiles.json','utf8'));assert.equal(rows.length,120);assert.equal(new Set(rows.map(r=>r.record.slug)).size,120);
 let events=0,works=0,photos=0;
 for(const {record,profile} of rows){validateFigureRecord(record);validateFigureProfile(profile);assert.ok(profile.sections.length);assert.ok(profile.sources.length>=2);assert.ok(profile.sources.every(s=>!s.revisionUrl||/oldid=\d+$/.test(s.revisionUrl)));assert.equal(record.is_demo,undefined);for(const image of profile.gallery){assert.ok(image.credit);assert.ok(image.sourceUrl.startsWith('https://commons.wikimedia.org/'));if(image.url.startsWith('/'))assert.ok(existsSync('public'+image.url));}events+=profile.timeline.length;works+=profile.works.length;photos+=profile.gallery.length;}
 assert.ok(events>400);assert.ok(works>250);assert.ok(photos>=80);assert.equal(rows.find(x=>x.record.slug==='al-hamdani').record.death_year,null);assert.equal(rows.find(x=>x.record.slug==='queen-bilqis').profile.historicity,'traditional');assert.equal(rows.find(x=>x.record.slug==='q72433980').record.governorate_id,'');
});
