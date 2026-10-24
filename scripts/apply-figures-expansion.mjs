import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {readFigureProfile,saveFigureProfile,validateFigureRecord} from '../lib/figureProfileRepository.js';
import {validateFigureProfile} from '../lib/figureProfiles.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(x=>!['--apply','--dry-run'].includes(x)))throw Error('Use --dry-run or --apply.');
const desired=JSON.parse(await readFile('data/yemeni-figures/profiles.json','utf8'));
const plan=JSON.parse(await readFile('data/yemeni-figures/expansion-plan-2026-10.json','utf8'));
const baseline=JSON.parse(await readFile('.audit-tools/figures-expansion/live-baseline.json','utf8'));
const actorId=process.env.EDITOR_ACTOR_ID||(baseline.managementActorIds.length===1?baseline.managementActorIds[0]:null);
if(!actorId)throw Error('An identified editorial actor is required.');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}});
const read=()=>fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const before=await read(),bySlug=new Map(before.map(x=>[x.slug,x]));
const {data:actor,error:actorError}=await db.from('editors').select('role').eq('user_id',actorId).maybeSingle();
if(actorError||!['management','admin'].includes(actor?.role))throw Error('The editorial actor no longer has permission.');
const changes=[];
// Entire preflight finishes before the first write. Each save also rechecks revision.
for(const item of desired){
 const record=validateFigureRecord(item.record),profile=validateFigureProfile(item.profile),change=plan.changes.find(x=>x.slug===record.slug);
 if(!change||hash({record,profile})!==change.afterHash)throw Error('Bundle changed after review: '+record.slug);
 const live=bySlug.get(record.slug),current=live?{record:validateFigureRecord(live),profile:await readFigureProfile(db,live)}:null;
 if(current&&isDeepStrictEqual(current,{record,profile}))continue;
 if(change.kind==='create'&&live)throw Error('An editor already created '+record.slug+'; review before updating.');
 if(change.kind==='update'&&(!live||hash(current)!==change.beforeHash||live.updated_at!==change.expectedRevision))throw Error('Concurrent editorial change: '+record.slug);
 changes.push({record:live?{...record,id:live.id}:record,profile,revision:live?.updated_at??null,kind:change.kind});
}
const report={mode:apply?'apply':'dry-run',reviewedAt:plan.reviewedAt,beforeCount:before.length,plannedInsertions:changes.filter(x=>x.kind==='create').length,plannedUpdates:changes.filter(x=>x.kind==='update').length,expectedAfterCount:before.length+changes.filter(x=>x.kind==='create').length,inserted:[],updated:[],errors:[]};
console.log(JSON.stringify({...report,inserted:undefined,updated:undefined},null,2));
if(!apply)process.exit(0);
const reportPath='docs/yemeni-figures-expansion-result-2026-10.json';
try{
 for(const [i,change]of changes.entries()){
  const saved=await saveFigureProfile(db,{record:change.record,profile:change.profile,revision:change.revision,actorId,role:actor.role});
  const recovered=await readFigureProfile(db,saved.record);
  if(!isDeepStrictEqual(saved.profile,recovered)||!isDeepStrictEqual(validateFigureRecord(saved.record),validateFigureRecord(change.record)))throw Error('Stored content did not match: '+change.record.slug);
  report[change.kind==='create'?'inserted':'updated'].push({slug:saved.record.slug,name:saved.record.full_name,id:saved.record.id,revision:saved.revision});
  console.log('Verified '+(i+1)+'/'+changes.length+' '+change.kind+' '+saved.record.slug);
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 }
 const after=await read();
 const remainingBaseline=baseline.entries.every(x=>after.some(r=>r.id===x.record.id&&r.slug===x.record.slug&&r.is_published===x.record.is_published));
 Object.assign(report,{afterCount:after.length,publishedCount:after.filter(x=>x.is_published).length,addedCount:report.inserted.length,updatedCount:report.updated.length,existingIdentitiesAndPublicationPreserved:remainingBaseline,verifiedProfiles:report.inserted.length+report.updated.length,completedAt:new Date().toISOString()});
 if(after.length!==report.expectedAfterCount||!remainingBaseline)throw Error('Final directory count or preservation verification failed.');
 await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,inserted:undefined,updated:undefined},null,2));
}catch(error){report.errors.push(error.message);await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');throw error;}
