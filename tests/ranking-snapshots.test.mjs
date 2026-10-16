import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaultRankingIndicators,rankingCategories} from '../lib/rankingCatalog.js';
import {validateRankingDataset,buildRanking,getDefaultRankingYear} from '../lib/rankings.js';

test('every published ranking has a verified, attributed bundle with Yemen and same-year world/Arab rankings',async()=>{
  assert.equal(defaultRankingIndicators.length,40);
  assert.equal(rankingCategories.length,11);
  assert.equal(new Set(defaultRankingIndicators.map(row=>row.slug)).size,40);
  for(const indicator of defaultRankingIndicators){
    const dataset=JSON.parse(await readFile(new URL(`../data/rankings/${indicator.slug}.json`,import.meta.url),'utf8'));
    validateRankingDataset(dataset,indicator.code);
    assert.ok(dataset.source.sourceOrganization,indicator.slug+' original attribution');
    assert.ok(dataset.source.sourceNote,indicator.slug+' source definition');
    assert.ok(!dataset.countries.some(row=>['WLD','ARB','HIC','LIC','AFE'].includes(row.code)));
    const year=getDefaultRankingYear(dataset);
    if(!indicator.is_published)continue;
    assert.ok(Number.isInteger(year),indicator.slug+' Yemen available');
    for(const scope of ['world','arab']){
      const rows=buildRanking(dataset,{year,scope,direction:indicator.direction});
      const yemen=rows.find(row=>row.code==='YEM');
      assert.ok(yemen,indicator.slug+' '+scope);
      assert.ok(rows.length>=5);
      const exact=dataset.values.find(row=>row.country==='YEM'&&row.year===year);
      assert.equal(yemen.value,exact.value);
      assert.ok(yemen.rank>=1&&yemen.rank<=rows.length);
    }
  }
});
