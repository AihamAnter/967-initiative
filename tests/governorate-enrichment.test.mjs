import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {governorateHeritageSources,governorateProfileSections,isGovernorateId} from '../lib/governorateEditorial.js';

const batches=['2026-10-27-atlas-governorates-batch-1.sql','2026-10-27-atlas-governorates-batch-2.sql'];
const fields=['description','history','geography','economy','landmarks'];
test('the 22 governorates all have substantive additions across the five knowledge fields',async()=>{
 const loaded=[];
 for(const file of batches){
  const sql=await readFile(new URL('../scripts/editorial/'+file,import.meta.url),'utf8');
  const embedded=sql.match(/jsonb_array_elements\('((?:''|[^'])*)'::jsonb\)/);
  assert.ok(embedded,'No immutable content JSON in '+file);
  const rows=JSON.parse(embedded[1].replaceAll("''","'"));
  assert.equal(rows.length,11);
  for(const field of fields)assert.ok(sql.includes("g."+field+"=p.obj->>'old_"+field+"'"),'missing CAS guard on '+field);
  assert.match(sql,/revision=g\.revision\+1/);
  assert.doesNotMatch(sql,/\b(population|area_km2|district_count)\s*=/i);
  assert.doesNotMatch(sql,/\bDELETE\s+FROM\b|\bDROP\s+TABLE\b|\bTRUNCATE\b/i);
  loaded.push(...rows);
 }
 assert.equal(loaded.length,22);
 assert.equal(new Set(loaded.map(x=>x.id)).size,22);
 for(const row of loaded){
  assert.equal(isGovernorateId(row.id),true);
  for(const field of fields){
   assert.ok(row[field].startsWith(row['old_'+field]),row.id+' overwrites base '+field);
   assert.ok(row[field].length>row['old_'+field].length+110,row.id+' insufficient enrichment '+field);
   assert.ok(row[field].includes('\n\n'),row.id+' missing paragraph separation '+field);
  }
 }
});
test('UNESCO links are limited to relevant verified landmark governorates',()=>{
 assert.deepEqual(Object.keys(governorateHeritageSources).sort(),['YE13','YE18','YE19','YE26','YE32']);
 for(const [id,links] of Object.entries(governorateHeritageSources)){
  assert.equal(isGovernorateId(id),true);
  assert.equal(links.length,1);
  assert.match(links[0].url,/^https:\/\/whc\.unesco\.org\/en\/list\/\d+\/$/);
 }
 assert.equal(governorateProfileSections.length,5);
 assert.equal(isGovernorateId('YE1301'),false,'district ID cannot render a governorate page');
});
