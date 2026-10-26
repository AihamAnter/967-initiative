import fs from 'node:fs';
import process from 'node:process';
import {createClient} from '@supabase/supabase-js';

const args=new Set(process.argv.slice(2));
const option=name=>{const item=process.argv.slice(2).find(value=>value.startsWith(`--${name}=`));return item?.slice(name.length+3);};
const kind=option('kind')||'all',apply=args.has('--apply'),updateExisting=args.has('--update-existing'),preservePublication=args.has('--preserve-publication');
const limit=option('limit')?Number(option('limit')):Infinity;
if(!['all','universities','medical-centers'].includes(kind))throw Error('Use --kind=universities, --kind=medical-centers, or --kind=all.');
if(!Number.isFinite(limit)&&limit!==Infinity||limit<1)throw Error('--limit must be a positive number.');

const definitions=[
 {kind:'universities',file:'data/directories/universities.json',table:'universities',rpc:'directory_save_university',relations:['programs','branches','sources']},
 {kind:'medical-centers',file:'data/directories/medical-centers.json',table:'medical_centers',rpc:'directory_save_medical_center',relations:['specialties','services','hours','branches','sources']},
].filter(item=>kind==='all'||item.kind===kind);
const universityFields=['stable_key','slug','name_ar','name_en','institution_type','ownership','founded_year','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','email','social_links','admission_info','tuition_info','tuition_as_of','registration_url','languages','study_modes','education_levels','accreditation_status','accrediting_body','operating_status','verification_status','verified_at','is_published'];
const medicalFields=['stable_key','official_code','slug','name_ar','name_en','institution_type','ownership','operator_name','summary','governorate','city','district','address','latitude','longitude','map_url','logo_url','website','phone','emergency_phone','email','social_links','booking_url','emergency_available','operating_status','operating_status_as_of','verification_status','verified_at','facility_presence','care_level','access_status','building_status','equipment_status','is_published'];
const nullable=new Set(['name_en','governorate','city','district','address','map_url','logo_url','website','phone','email','tuition_as_of','registration_url','official_code','emergency_phone','booking_url','operating_status_as_of','verified_at']);
const cleanRecord=(record,medical)=>Object.fromEntries((medical?medicalFields:universityFields).map(key=>[key,nullable.has(key)&&record[key]===''?null:record[key]]).filter(([,value])=>value!==undefined));
const cleanSources=sources=>(sources||[]).map(source=>({title:source.title,url:source.url||source.document_url,publisher:source.publisher||'',source_type:source.source_type||'official_directory',checked_at:source.checked_at||source.verified_at,note:[source.note,source.document_url&&source.document_url!==source.url?`وثيقة المصدر: ${source.document_url}`:'',source.supports?.length?`يدعم: ${source.supports.join('، ')}`:''].filter(Boolean).join(' — ')}));
const relationArgs=(definition,record)=>definition.kind==='universities'?{p_programs:record.programs||[],p_branches:record.branches||[],p_sources:cleanSources(record.sources)}:{p_specialties:record.specialties||[],p_services:record.services||[],p_hours:record.hours||[],p_branches:record.branches||[],p_sources:cleanSources(record.sources)};

function validate(records,label){const keys=new Set(),slugs=new Set();for(const [index,row] of records.entries()){if(!row.stable_key||!row.slug||!row.name_ar)throw Error(`${label} row ${index+1} is missing its stable key, slug, or Arabic name.`);if(keys.has(row.stable_key))throw Error(`${label}: duplicate stable key ${row.stable_key}`);if(slugs.has(row.slug))throw Error(`${label}: duplicate slug ${row.slug}`);keys.add(row.stable_key);slugs.add(row.slug);if(!(row.sources||[]).length)throw Error(`${label}: ${row.slug} has no source.`);}return {records:records.length,stableKeys:keys.size,slugs:slugs.size};}

const batches=definitions.map(definition=>{const body=JSON.parse(fs.readFileSync(definition.file,'utf8')),records=body.records.slice(0,limit);return {definition,records,summary:validate(records,definition.kind)};});
console.log(JSON.stringify({mode:apply?'apply':'dry-run',updateExisting,preservePublication,collections:batches.map(({definition,summary})=>({kind:definition.kind,...summary}))},null,2));
if(!apply){console.log('Dry run complete. No database connection was opened and no rows were written.');process.exit(0);}
if(process.env.DIRECTORY_IMPORT_CONFIRM!=='I_UNDERSTAND_THIS_WRITES_DIRECTORY_DATA')throw Error('Refusing to write. Set DIRECTORY_IMPORT_CONFIRM=I_UNDERSTAND_THIS_WRITES_DIRECTORY_DATA and pass --apply.');
if(preservePublication&&process.env.DIRECTORY_PUBLISH_CONFIRM!=='I_REVIEWED_DIRECTORY_PUBLICATION')throw Error('Refusing to preserve publication. Set DIRECTORY_PUBLISH_CONFIRM=I_REVIEWED_DIRECTORY_PUBLICATION after editorial review.');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required only for --apply.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),failures=[];let created=0,updated=0,skipped=0;
for(const {definition,records} of batches){for(const record of records){try{const lookup=await db.from(definition.table).select('id,stable_key,revision').eq('stable_key',record.stable_key).maybeSingle();if(lookup.error)throw lookup.error;if(lookup.data&&!updateExisting){skipped++;continue;}const data=cleanRecord(record,definition.kind==='medical-centers');if(!preservePublication)data.is_published=false;const call=await db.rpc(definition.rpc,{p_id:lookup.data?.id||null,p_revision:lookup.data?.revision||null,p_record:data,...relationArgs(definition,record),p_origin:'import:institution-directory'});if(call.error)throw call.error;lookup.data?updated++:created++;}catch(error){failures.push({kind:definition.kind,stable_key:record.stable_key,error:error.message});}}}
console.log(JSON.stringify({created,updated,skipped,failed:failures.length,failures},null,2));
if(failures.length)process.exitCode=1;
