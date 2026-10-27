import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isEnrichedRankingDescription} from '../lib/rankingEditorial.js';

const scripts=[
 '2026-10-27-ranking-batch-1.sql',
 '2026-10-27-ranking-batch-2.sql',
];
const load=async name=>{
 const content=await readFile(new URL('../scripts/editorial/'+name,import.meta.url),'utf8');
 const found=content.match(/jsonb_array_elements\('((?:''|[^'])*)'::jsonb\)/);
 assert.ok(found,'Missing literal reviewed JSON in '+name);
 const entries=JSON.parse(found[1].replaceAll("''","'"));
 assert.match(content,/i\.is_published AND i\.description=input\.item->>'old'/);
 return entries;
};
test('all 39 published ranking indicators have meaningful explanations and guarded SQL',async()=>{
 const batches=await Promise.all(scripts.map(load));
 assert.deepEqual(batches.map(x=>x.length),[20,19]);
 const records=batches.flat();
 assert.equal(new Set(records.map(x=>x.slug)).size,39);
 assert.equal(records.some(x=>x.slug==='literacy'),false,'The unpublished literacy entry must remain untouched');
 for(const item of records){
  assert.match(item.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(item.old.length>=10,'original description must be recorded for compare-and-swap');
  assert.ok(isEnrichedRankingDescription(item.description),item.slug+' lacks one of the substantive editorial panels');
  assert.notEqual(item.description,item.old,item.slug+' was not enriched');
  assert.ok(item.description.length<=3000);
 }
});
