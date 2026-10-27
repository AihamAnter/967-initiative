import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isGeneralEncyclopediaSource,figureNeedsIndependentSources,getFigureEditorialReview,editorialFigureReviews} from '../lib/figureEditorialReview.js';
import {auditFigurePackages} from '../lib/figureSourceAudit.js';

const files=['profiles.json','additions-2026-10-25.json'];
const packages=(await Promise.all(files.map(async file=>JSON.parse(await readFile(new URL('../data/yemeni-figures/'+file,import.meta.url),'utf8'))))).flat();

test('all 282 archived figure profiles have internal citation integrity and image provenance',()=>{
 const audit=auditFigurePackages(packages);
 assert.equal(audit.counters.profiles,282);
 assert.equal(new Set(packages.map(x=>x.record.slug)).size,282);
 assert.equal(audit.issues.length,0,JSON.stringify(audit.issues.slice(0,10)));
 assert.equal(audit.counters.noReferences,0);
 assert.equal(audit.counters.uncitedContent,0);
 assert.equal(audit.counters.brokenReferenceIds,0);
 assert.equal(audit.counters.invalidSourceUrls,0);
 assert.equal(audit.counters.imagesWithoutProvenance,0);
 assert.ok(audit.counters.generalOnly>100,'The audit must reveal encyclopedia-only biographies');
 assert.ok(audit.counters.sources>750);
});

test('source-quality notices are based only on reference domains, not guessed from biographies',()=>{
 assert.equal(isGeneralEncyclopediaSource({url:'https://ar.wikipedia.org/wiki/A'}),true);
 assert.equal(isGeneralEncyclopediaSource({url:'https://www.wikidata.org/wiki/Q1'}),true);
 assert.equal(isGeneralEncyclopediaSource({url:'https://en.wikipedia.org/wiki/A'}),true);
 assert.equal(isGeneralEncyclopediaSource({url:'https://www.cambridge.org/core/books'}),false);
 assert.equal(isGeneralEncyclopediaSource({url:'https://fake-wikipedia.org/wiki/A'}),false);
 assert.equal(figureNeedsIndependentSources({sources:[{url:'https://ar.wikipedia.org/wiki/A'},{url:'https://www.wikidata.org/wiki/Q1'}]}),true);
 assert.equal(figureNeedsIndependentSources({sources:[{url:'https://ar.wikipedia.org/wiki/A'},{url:'https://www.loc.gov/item/123'}]}),false);
 assert.equal(figureNeedsIndependentSources({sources:[]}),false);
});

test('historical research notes are specific, cited and do not mutate archived profiles',()=>{
 assert.equal(Object.keys(editorialFigureReviews).length,5);
 for(const [slug,item] of Object.entries(editorialFigureReviews)){
  assert.ok(packages.some(x=>x.record.slug===slug),'The note must be attached to a real figure: '+slug);
  assert.ok(item.text.length>140);
  assert.ok(item.sources.length>0);
  assert.ok(item.sources.every(x=>x.url.startsWith('https://')&&!isGeneralEncyclopediaSource(x)));
  assert.equal(getFigureEditorialReview(slug),item);
 }
 assert.equal(getFigureEditorialReview('non-existent-person'),null);
});
