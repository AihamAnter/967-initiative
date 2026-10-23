// Production READ ONLY: OpenAPI metadata and a null-target read RPC; no POST/SQL.
// Run: node --env-file=.env.local scripts/inspect-prelaunch-publication.mjs
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const report={checkedAt:new Date().toISOString(),issue:'L-01',readOnly:true,checks:{},conclusion:'Cannot verify production publication repair from public metadata alone. No mutation was attempted.'};
if(!origin||!anon)throw Error('Supabase configuration unavailable');
const get=async(path,key)=>{const r=await fetch(new URL(path,origin),{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json()};};
try{
 let r=await get('/rest/v1/',anon),serviceMetadata=false;
 if(r.status!==200&&service){r=await get('/rest/v1/',service);serviceMetadata=true;}
 const definitions=r.data?.definitions||{};
 report.checks.metadata={status:r.status,serviceMetadataOnly:serviceMetadata,available:Boolean(r.data?.definitions),commentsDefault:definitions.debate_comments?.properties?.status?.default??null,questionsDefault:definitions.debate_questions?.properties?.status?.default??null,lifecyclePresent:Boolean(definitions.debates?.properties?.recording_first_published_at)};
 if(report.checks.metadata.available)report.checks.expectedApprovedDefaults=report.checks.metadata.commentsDefault==='approved'&&report.checks.metadata.questionsDefault==='approved';
}catch{report.checks.metadata={unavailable:true};}
try{const r=await get('/rest/v1/rpc/debate_participation_state?p_debate=00000000-0000-4000-8000-000000000000',anon);report.checks.readRpc={status:r.status,nullTarget:r.data===null};}catch{report.checks.readRpc={unavailable:true};}
const out='docs/audit/prelaunch-fixes-2026-10/evidence';await mkdir(out,{recursive:true});await writeFile(out+'/production-publication-readonly.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
