import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  emptyIndicatorEditorial,normalizeIndicatorEditorial,electricityEditorialDraft,
  editorialReferencesToText,parseEditorialReferences,safeEditorialReference,validateIndicatorEditorial,
} from '../lib/indicatorEditorial.js';

test('the published explainer remains opt-in, and the electricity example is an unpublished draft',()=>{
  assert.equal(emptyIndicatorEditorial.is_published,false);
  assert.equal(electricityEditorialDraft.is_published,false);
  assert.match(electricityEditorialDraft.intro,/86\.3%/);
  assert.match(electricityEditorialDraft.historical_context,/42\.2/);
  assert.equal(normalizeIndicatorEditorial(null).is_published,false);
  assert.deepEqual(normalizeIndicatorEditorial({intro:'شرح',is_published:true}).reference_links,[]);
});

test('editorial references accept useful HTTP(S) sources and block unsafe inputs',()=>{
  const refs=parseEditorialReferences('البنك الدولي | https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=YE\nمنهجية | https://databank.worldbank.org/');
  assert.equal(refs.length,2);
  assert.equal(parseEditorialReferences(editorialReferencesToText(refs)).length,2);
  assert.equal(safeEditorialReference({title:'  مشروع   ',url:'https://example.org/a'}).url,'https://example.org/a');
  for(const url of ['javascript:alert(1)','data:text/html,abc','ftp://example.org','https://name:password@example.org/','/relative','http://host/a b'])
    assert.equal(safeEditorialReference({title:'مراجع المؤشر',url}),null,url);
  assert.throws(()=>parseEditorialReferences('اسم بلا رابط'),/بصيغة/);
  assert.throws(()=>parseEditorialReferences('مصدر | javascript:alert(1)'),/صالح/);
  assert.throws(()=>parseEditorialReferences('مرجع | https://example.org\nمرجع آخر | https://example.org'),/تكرر/);
  assert.throws(()=>parseEditorialReferences(Array.from({length:11},(_,index)=>'مرجع '+index+' | https://example.org/'+index).join('\n')),/عشرة/);
});

test('editorial validation prevents accidental publication before review and never edits numeric series',()=>{
  const draft=validateIndicatorEditorial(electricityEditorialDraft);
  assert.equal(draft.is_published,false);
  assert.equal(draft.reference_links.length,2);
  assert.deepEqual(Object.keys(draft).sort(),[
    'intro','why_it_matters','historical_context','limitations','source_notes','reference_links','reviewed_on','is_published',
  ].sort());
  assert.throws(()=>validateIndicatorEditorial({...electricityEditorialDraft,is_published:true}),/تاريخ مراجعة/);
  assert.throws(()=>validateIndicatorEditorial({...electricityEditorialDraft,intro:'قصير',is_published:true,reviewed_on:'2026-10-27'}),/الخلاصة/);
  const approved=validateIndicatorEditorial({...electricityEditorialDraft,is_published:true,reviewed_on:'2026-10-27'});
  assert.equal(approved.is_published,true);
  assert.equal(approved.reviewed_on,'2026-10-27');
  assert.throws(()=>validateIndicatorEditorial({...electricityEditorialDraft,intro:'ن'.repeat(1601)}),/الحد/);
});

test('database migration has RLS, authenticated-only RPC and a draft default',async()=>{
  const migration=await readFile(new URL('../supabase/migrations/20261027004810_stat_indicator_editorial.sql',import.meta.url),'utf8');
  assert.match(migration,/alter table public\.stat_indicator_editorial enable row level security/i);
  assert.match(migration,/is_published boolean not null default false/i);
  assert.match(migration,/public\.editorial_can_read\(\)/i);
  assert.match(migration,/stale editorial revision/i);
  assert.match(migration,/revoke all on function public\.editorial_stat_indicator_enrichment_save\(uuid,bigint,jsonb\) from public, anon/i);
  assert.match(migration,/grant execute on function public\.editorial_stat_indicator_enrichment_save\(uuid,bigint,jsonb\) to authenticated/i);
  assert.doesNotMatch(migration,/\binsert into public\.stat_values\b/i);
});
