import fs from 'node:fs';
import process from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {directoryBundleDiff,normalizeDirectorySource} from '../lib/directoryImportMerge.js';

const argv=process.argv.slice(2),args=new Set(argv);
const option=name=>argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
const kind=option('kind')||'all',apply=args.has('--apply'),previewDiff=args.has('--preview-diff'),updateExisting=args.has('--update-existing'),overwriteExisting=args.has('--overwrite-existing'),preservePublication=args.has('--preserve-publication'),enrichedOnly=args.has('--enriched-only');
const publishNewKeys=new Set((option('publish-new')||'').split(',').map(value=>value.trim()).filter(Boolean));
const limit=option('limit')?Number(option('limit')):Infinity,reportPath=option('report');
if(!['all','universities','medical-centers'].includes(kind))throw Error('Use --kind=universities, --kind=medical-centers, or --kind=all.');
if((!Number.isFinite(limit)&&limit!==Infinity)||limit<1)throw Error('--limit must be a positive number.');
if(apply&&!updateExisting&&overwriteExisting)throw Error('--overwrite-existing requires --update-existing.');
if(apply&&previewDiff)throw Error('Choose either --preview-diff or --apply.');
if(overwriteExisting)throw Error('--overwrite-existing is disabled because imports must not replace existing editorial values. Review conflicts individually in the admin editor.');

const definitions=[
 {kind:'universities',file:'data/directories/universities.json',table:'universities',rpc:'directory_save_university',relations:['programs','branches','sources'],projection:'*,programs:university_programs(*),branches:university_branches(*),sources:university_sources(*)'},
 {kind:'medical-centers',file:'data/directories/medical-centers.json',table:'medical_centers',rpc:'directory_save_medical_center',relations:['specialties','services','hours','branches','sources'],projection:'*,specialties:medical_center_specialties(*),services:medical_center_services(*),hours:medical_center_hours(*),branches:medical_center_branches(*),sources:medical_center_sources(*)'},
].filter(item=>kind==='all'||item.kind===kind);
const universityFields=['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'];
const medicalFields=['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'];
const nullable=new Set(['name_en','governorate','city','district','address','map_url','logo_url','website','phone','email','tuition_as_of','registration_url','official_code','emergency_phone','booking_url','operating_status_as_of','verified_at']);
const cleanRecord=(record,medical)=>Object.fromEntries((medical?medicalFields:universityFields).map(key=>[key,nullable.has(key)&&record[key]===''?null:record[key]]).filter(([,value])=>value!==undefined));
const cleanSources=sources=>(sources||[]).map(normalizeDirectorySource);
const cleanRelationRow=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['id','university_id','medical_center_id'].includes(key)));
const relationArgs=(definition,relations)=>definition.kind==='universities'?{
 p_programs:(relations.programs||[]).map(cleanRelationRow),p_branches:(relations.branches||[]).map(cleanRelationRow),p_sources:cleanSources(relations.sources),
}:{
 p_specialties:(relations.specialties||[]).map(cleanRelationRow),p_services:(relations.services||[]).map(cleanRelationRow),p_hours:(relations.hours||[]).map(cleanRelationRow),p_branches:(relations.branches||[]).map(cleanRelationRow),p_sources:cleanSources(relations.sources),
};

function validate(records,label){
 const keys=new Set(),slugs=new Set();
 for(const [index,row] of records.entries()){
  if(!row.stable_key||!row.slug||!row.name_ar)throw Error(`${label} row ${index+1} is missing its stable key, slug, or Arabic name.`);
  if(keys.has(row.stable_key))throw Error(`${label}: duplicate stable key ${row.stable_key}`);
  if(slugs.has(row.slug))throw Error(`${label}: duplicate slug ${row.slug}`);
  keys.add(row.stable_key);slugs.add(row.slug);
  if(!(row.sources||[]).length)throw Error(`${label}: ${row.slug} has no source.`);
  const sourceKeys=(row.sources||[]).map(source=>String(source.url||source.document_url||'').trim().replace(/\/$/,'').toLowerCase());
  if(new Set(sourceKeys).size!==sourceKeys.length)throw Error(`${label}: ${row.slug} has duplicate source URLs.`);
 }
 return {records:records.length,stableKeys:keys.size,slugs:slugs.size};
}

const enrichment=enrichedOnly?JSON.parse(fs.readFileSync('data/directories/enrichment-2026-10-26.json','utf8')):null;
const enrichedKeys=enrichment?new Set([...enrichment.universities,...enrichment.medical_centers,...enrichment.medical_additions].map(row=>row.stable_key)):null;
const batches=definitions.map(definition=>{const body=JSON.parse(fs.readFileSync(definition.file,'utf8')),records=body.records.filter(row=>!enrichedKeys||enrichedKeys.has(row.stable_key)).slice(0,limit);return {definition,records,summary:validate(records,definition.kind)};});
const selectedKeys=new Set(batches.flatMap(({records})=>records.map(row=>row.stable_key)));
for(const key of publishNewKeys)if(!selectedKeys.has(key))throw Error(`--publish-new contains a stable_key outside this import: ${key}`);
const summary={mode:apply?'apply':previewDiff?'preview-diff':'offline-dry-run',updateExisting,overwriteExisting,preservePublication,enrichedOnly,publishNew:[...publishNewKeys],collections:batches.map(({definition,summary:item})=>({kind:definition.kind,...item}))};
console.log(JSON.stringify(summary,null,2));
if(!apply&&!previewDiff){console.log('Offline validation complete. No database connection was opened and no rows were written.');process.exit(0);}

if(apply&&process.env.DIRECTORY_IMPORT_CONFIRM!=='I_UNDERSTAND_THIS_WRITES_DIRECTORY_DATA')throw Error('Refusing to write. Set DIRECTORY_IMPORT_CONFIRM=I_UNDERSTAND_THIS_WRITES_DIRECTORY_DATA and pass --apply.');
if(apply&&publishNewKeys.size&&process.env.DIRECTORY_NEW_PUBLICATION_CONFIRM!=='I_REVIEWED_EACH_NEW_DIRECTORY_RECORD')throw Error('Refusing to publish new records. Set DIRECTORY_NEW_PUBLICATION_CONFIRM=I_REVIEWED_EACH_NEW_DIRECTORY_RECORD and list each stable_key with --publish-new=.');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for preview or apply.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),failures=[],changes=[];
let created=0,updated=0,unchanged=0,skipped=0;
for(const {definition,records} of batches){
 for(const incoming of records){
  try{
   const lookup=await db.from(definition.table).select(definition.projection).eq('stable_key',incoming.stable_key).maybeSingle();
   if(lookup.error)throw lookup.error;
   if(lookup.data&&!updateExisting){skipped++;changes.push({kind:definition.kind,stable_key:incoming.stable_key,action:'skip-existing'});continue;}
   const medical=definition.kind==='medical-centers';let data,relations,diff;
   if(lookup.data){
    diff=directoryBundleDiff(lookup.data,incoming,definition.relations,{overwrite:overwriteExisting});
    if(!diff.changed){unchanged++;changes.push({kind:definition.kind,stable_key:incoming.stable_key,action:'unchanged',conflicts:diff.conflicts});continue;}
    data=cleanRecord(diff.record,medical);relations=diff.relations;
    changes.push({kind:definition.kind,stable_key:incoming.stable_key,action:'update',...diff.changes,conflicts:diff.conflicts});
   }else{
    data=cleanRecord(incoming,medical);data.is_published=publishNewKeys.has(incoming.stable_key);
    relations=Object.fromEntries(definition.relations.map(relation=>[relation,incoming[relation]||[]]));
    changes.push({kind:definition.kind,stable_key:incoming.stable_key,action:data.is_published?'create-published-approved':'create-draft',relationCounts:Object.fromEntries(definition.relations.map(relation=>[relation,relations[relation].length]))});
   }
   if(!apply)continue;
   const origin=!lookup.data&&data.is_published?`import:institution-directory:approved-publish:${incoming.stable_key}`:'import:institution-directory';
   const call=await db.rpc(definition.rpc,{p_id:lookup.data?.id||null,p_revision:lookup.data?.revision||null,p_record:data,...relationArgs(definition,relations),p_origin:origin});
   if(call.error)throw call.error;
   lookup.data?updated++:created++;
  }catch(error){failures.push({kind:definition.kind,stable_key:incoming.stable_key,error:error.message});}
 }
}
const result={...summary,created,updated,unchanged,skipped,planned:changes.filter(row=>['update','create-draft','create-published-approved'].includes(row.action)).length,conflicts:changes.reduce((total,row)=>total+(row.conflicts?.length||0),0),failed:failures.length,changes,failures};
console.log(JSON.stringify(result,null,2));
if(reportPath)fs.writeFileSync(reportPath,`${JSON.stringify(result,null,2)}\n`,'utf8');
if(failures.length)process.exitCode=1;
