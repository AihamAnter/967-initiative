import fs from 'node:fs';
import process from 'node:process';

const write=process.argv.includes('--write');
const root=new URL('../',import.meta.url),read=path=>JSON.parse(fs.readFileSync(new URL(path,root),'utf8'));
const universities=read('data/directories/universities.json'),medical=read('data/directories/medical-centers.json'),patch=read('data/directories/enrichment-2026-10-26.json');
const clone=value=>JSON.parse(JSON.stringify(value));
const relationKeys={
 programs:row=>[row.name,row.qualification,row.study_mode].map(value=>String(value||'').trim()).join('|'),
 specialties:row=>String(row.name||'').trim(),services:row=>String(row.name||'').trim(),hours:row=>String(row.label||'').trim(),branches:row=>[row.name,row.city].map(value=>String(value||'').trim()).join('|'),sources:row=>String(row.url||row.document_url||'').trim(),
};
function mergeRows(current,incoming,relation){
 const output=clone(current||[]),positions=new Map(output.map((row,index)=>[relationKeys[relation](row),index]));
 for(const row of incoming||[]){const key=relationKeys[relation](row);if(positions.has(key))output[positions.get(key)]={...output[positions.get(key)],...clone(row)};else{positions.set(key,output.length);output.push(clone(row));}}
 return output;
}
function applyUpdates(dataset,updates,relations){
 const positions=new Map(dataset.records.map((row,index)=>[row.stable_key,index])),changed=[];
 for(const update of updates){
  if(!positions.has(update.stable_key))throw Error(`Unknown stable_key in enrichment: ${update.stable_key}`);
  const index=positions.get(update.stable_key),before=dataset.records[index],after={...before,...clone(update.fields||{})};
  for(const relation of relations)after[relation]=mergeRows(before[relation],update[relation],relation);
  dataset.records[index]=after;changed.push(after.name_ar);
 }
 return changed;
}
function addRecords(dataset,records){
 const positions=new Map(dataset.records.map((row,index)=>[row.stable_key,index])),slugOwners=new Map(dataset.records.map(row=>[row.slug,row.stable_key])),added=[];
 for(const record of records){
  if(slugOwners.has(record.slug)&&slugOwners.get(record.slug)!==record.stable_key)throw Error(`Duplicate addition slug: ${record.slug}`);
  if(positions.has(record.stable_key)){
   const index=positions.get(record.stable_key),before=dataset.records[index],after={...before,...clone(record)};
   for(const relation of ['specialties','services','hours','branches','sources'])after[relation]=mergeRows(before[relation],record[relation],relation);
   dataset.records[index]=after;continue;
  }
  dataset.records.push(clone(record));positions.set(record.stable_key,dataset.records.length-1);slugOwners.set(record.slug,record.stable_key);added.push(record.name_ar);
 }
 return added;
}
const baselineUniversities=clone(universities.records),baselineMedical=clone(medical.records);
const enrichedUniversities=applyUpdates(universities,patch.universities,['programs','branches','sources']);
const enrichedMedical=applyUpdates(medical,patch.medical_centers,['specialties','services','hours','branches','sources']);
addRecords(medical,patch.medical_additions);
universities.generated_at=patch.generated_at;medical.generated_at=patch.generated_at;
universities.source_policy='Official and institutional sources are linked per claim. Publication, access, and status dates remain distinct; missing facts remain empty.';
medical.source_policy='Service evidence is dated per source and does not imply current availability. Call the facility before travel; missing facts remain empty.';

const meaningful=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
function stats(records,kind){
 const relation=kind==='universities'?'programs':'services';
 return {total:records.length,governorates:new Set(records.map(row=>row.governorate).filter(Boolean)).size,with_location:records.filter(row=>meaningful(row.governorate)||meaningful(row.city)||meaningful(row.address)).length,with_contact:records.filter(row=>meaningful(row.phone)||meaningful(row.email)||meaningful(row.website)).length,with_phone:records.filter(row=>meaningful(row.phone)).length,with_website:records.filter(row=>meaningful(row.website)).length,with_address:records.filter(row=>meaningful(row.address)).length,with_map:records.filter(row=>meaningful(row.map_url)||(row.latitude!==null&&row.latitude!==undefined&&row.longitude!==null&&row.longitude!==undefined)).length,with_programs:records.filter(row=>(row.programs||[]).length).length,programs:records.reduce((sum,row)=>sum+(row.programs||[]).length,0),with_specialties:records.filter(row=>(row.specialties||[]).length).length,specialties:records.reduce((sum,row)=>sum+(row.specialties||[]).length,0),with_services:records.filter(row=>(row.services||[]).length).length,services:records.reduce((sum,row)=>sum+(row.services||[]).length,0),with_depth:records.filter(row=>(row[relation]||[]).length).length,needs_review:records.filter(row=>row.verification_status!=='verified').length,source_rows:records.reduce((sum,row)=>sum+(row.sources||[]).length,0),unique_source_urls:new Set(records.flatMap(row=>(row.sources||[]).map(source=>source.url||source.document_url).filter(Boolean))).size,by_governorate:Object.fromEntries([...new Set(records.map(row=>row.governorate||'غير محددة'))].map(name=>[name,records.filter(row=>(row.governorate||'غير محددة')===name).length])),by_type:Object.fromEntries([...new Set(records.map(row=>row.institution_type))].map(name=>[name,records.filter(row=>row.institution_type===name).length]))};
}
const before=patch.baseline||{universities:stats(baselineUniversities,'universities'),medical_centers:stats(baselineMedical,'medical-centers')},after={universities:stats(universities.records,'universities'),medical_centers:stats(medical.records,'medical-centers')};
const coverage={generated_at:patch.generated_at,universities:after.universities,medical_centers:after.medical_centers};
const allSources=[...patch.universities,...patch.medical_centers,...patch.medical_additions].flatMap(row=>row.sources||[]),conflicts=allSources.filter(source=>source.conflict_note),undated=allSources.filter(source=>!source.source_published_at&&!source.status_as_of);
const verificationQueue=records=>records.filter(row=>row.verification_status!=='verified').map(row=>({stable_key:row.stable_key,name:row.name_ar,status:row.verification_status,status_as_of:row.operating_status_as_of||row.verified_at||null}));
const report={generated_at:patch.generated_at,before,after,enriched:{universities:enrichedUniversities,medical_centers:enrichedMedical,medical_additions:patch.medical_additions.map(row=>row.name_ar)},verification_queue:{universities:verificationQueue(universities.records),medical_centers:verificationQueue(medical.records)},source_audit:{sources_added:allSources.length,total_source_rows:after.universities.source_rows+after.medical_centers.source_rows,unique_source_urls:new Set([...universities.records,...medical.records].flatMap(row=>(row.sources||[]).map(source=>source.url||source.document_url).filter(Boolean))).size,conflicts:conflicts.map(source=>({url:source.url,note:source.conflict_note})),without_publication_or_status_date:undated.map(source=>source.url)},publication:{production_import_applied:false,production_migration_applied:false,source_records_marked_published:patch.medical_additions.filter(row=>row.is_published).length}};
console.log(JSON.stringify(report,null,2));
if(write){
 fs.writeFileSync(new URL('data/directories/universities.json',root),`${JSON.stringify(universities,null,2)}\n`,'utf8');
 fs.writeFileSync(new URL('data/directories/medical-centers.json',root),`${JSON.stringify(medical,null,2)}\n`,'utf8');
 fs.writeFileSync(new URL('data/directories/coverage.json',root),`${JSON.stringify(coverage,null,2)}\n`,'utf8');
 fs.writeFileSync(new URL('docs/research/institution-enrichment-audit-2026-10-26.json',root),`${JSON.stringify(report,null,2)}\n`,'utf8');
}
