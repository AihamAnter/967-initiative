import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fallbackMedicalCenters,fallbackUniversities,institutionSearchFields,relatedInstitutions} from '../lib/institutionDirectories.js';
import {matchesSearch} from '../lib/search.js';
import {listStateSearch,readListState,collectionDefaults} from '../lib/listState.js';
import {pageIsVisible} from '../lib/pageVisibility.js';
import {publicReadingHref,readingContentItem} from '../lib/readingList.js';
import {buildSitemap} from '../lib/seo.js';
import {institutionSchema} from '../lib/seo-schema.js';
import {contextualHref,safeNavigationSource} from '../lib/navigationContext.js';

test('real institution datasets meet targets, retain sources, stable identities and broad coverage',()=>{
 assert.ok(fallbackUniversities.length>=100);assert.ok(fallbackMedicalCenters.length>=150);
 for(const [label,rows] of [['universities',fallbackUniversities],['medical',fallbackMedicalCenters]]){
  assert.equal(new Set(rows.map(row=>row.stableKey)).size,rows.length,`${label} stable keys`);
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,`${label} slugs`);
  assert.ok(rows.every(row=>row.name&&row.sources.length&&row.sources.every(source=>/^https?:\/\//.test(source.url||source.document_url))));
  assert.ok(rows.every(row=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)));
 }
 assert.ok(new Set(fallbackUniversities.map(row=>row.governorate).filter(Boolean)).size>=10);
 assert.equal(new Set(fallbackMedicalCenters.map(row=>row.governorate).filter(Boolean)).size,22);
 assert.ok(fallbackMedicalCenters.every(row=>row.operatingStatusAsOf==='2023-12-31'&&row.verificationStatus==='needs_review'));
 assert.ok(fallbackMedicalCenters.every(row=>row.phone===null&&row.emergencyAvailable===null),'unknown contact and emergency facts stay unknown');
});

test('directory search, compound URL filters and related records use only stored facts',()=>{
 const university=fallbackUniversities.find(row=>row.governorate==='تعز');
 assert.ok(university);assert.equal(matchesSearch('تعز',institutionSearchFields(university,'university')),true);
 const center=fallbackMedicalCenters.find(row=>row.governorate==='سقطرى');
 assert.ok(center);assert.equal(matchesSearch('سقطرى',institutionSearchFields(center,'medical')),true);
 const state={...collectionDefaults.medicalCenters,q:'مستشفى',governorate:'تعز',type:'hospital',page:2};
 const search=listStateSearch('',state,collectionDefaults.medicalCenters);
 assert.deepEqual(readListState(search,collectionDefaults.medicalCenters),state);
 const related=relatedInstitutions(center,fallbackMedicalCenters,'medical');
 assert.ok(related.every(row=>row.id!==center.id&&(row.governorate===center.governorate||row.type===center.type)));
 const source=safeNavigationSource('/universities?q=جامعة&governorate=تعز&ownership=government#universities-directory');
 assert.ok(source.includes('governorate='));assert.ok(source.includes('#universities-directory'));
 assert.equal(new URL(contextualHref('/universities/example',source),'https://local.test').searchParams.get('from'),source);
 assert.equal(safeNavigationSource('/medical-centers?specialty=باطنية&service=مختبر#medical-directory').startsWith('/medical-centers?'),true);
});

test('visibility, reading later, sitemap and schema include only public directory records',()=>{
 assert.equal(pageIsVisible('/universities/example',{universities:false}),false);
 assert.equal(pageIsVisible('/medical-centers/example',{medicalCenters:false}),false);
 assert.deepEqual(readingContentItem({kind:'university',href:'/universities/edu-a',title:'جامعة'}),{kind:'university',href:'/universities/edu-a',title:'جامعة'});
 assert.equal(publicReadingHref('/medical-centers/health-1','?from=%2Fadmin'),'/medical-centers/health-1');
 const env={NODE_ENV:'production',NEXT_PUBLIC_SITE_URL:'https://example.test'};
 const items=buildSitemap({universities:[{...fallbackUniversities[0],is_published:true}],medicalCenters:[{...fallbackMedicalCenters[0],is_published:true},{...fallbackMedicalCenters[1],is_published:false}]},env);
 assert.ok(items.some(item=>item.url.includes('/universities/')));assert.equal(items.filter(item=>item.url.includes('/medical-centers/health-')).length,1);
 const medicalSchema=institutionSchema(fallbackMedicalCenters[0],'medical');
 assert.ok(['Hospital','MedicalOrganization'].includes(medicalSchema['@type']));
 assert.equal(medicalSchema.availableService,undefined,'unknown emergency availability does not become a claim');
 assert.equal(institutionSchema({...fallbackUniversities[0],is_published:false},'university'),null);
});

test('migration and importer keep protected writes, revisions, source gating and explicit apply confirmation',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/202610250007_institution_directories.sql',import.meta.url),'utf8');
 const importer=fs.readFileSync(new URL('../scripts/import-institution-directories.mjs',import.meta.url),'utf8');
 for(const table of ['universities','university_programs','university_branches','university_sources','medical_centers','medical_center_specialties','medical_center_services','medical_center_hours','medical_center_branches','medical_center_sources'])assert.ok(sql.includes(`'${table}'`),`${table} is included in the protected table loop`);
 assert.match(sql,/alter table public\.%I enable row level security/);
 assert.match(sql,/Stale university revision/);assert.match(sql,/Stale medical-center revision/);
 assert.match(sql,/Published university requires a source/);assert.match(sql,/Published medical center requires a source/);
 assert.match(sql,/Management role required/);assert.match(sql,/directory_batch/);
 assert.match(importer,/if\(!apply\)/);assert.match(importer,/DIRECTORY_IMPORT_CONFIRM/);assert.match(importer,/DIRECTORY_PUBLISH_CONFIRM/);
 assert.match(importer,/if\(lookup\.data&&!updateExisting\)/);assert.doesNotMatch(importer,/\.delete\(/);
});
