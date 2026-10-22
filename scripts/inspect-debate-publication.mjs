// READ ONLY: metadata and public build assets, never SQL or user content.
// Run: node --env-file=.env.local scripts/inspect-debate-publication.mjs
import {mkdir,writeFile} from 'node:fs/promises';

const report={checked_at:new Date().toISOString(),read_only:true,configuration:{supabase_configured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),service_key_present:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),database_connection_present:Boolean(process.env.DATABASE_URL||process.env.SUPABASE_DB_URL)},checks:{}};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const get=async(address,credential=key)=>{const r=await fetch(address,{headers:url&&new URL(address).origin===new URL(url).origin?{apikey:credential,Authorization:'Bearer '+credential}: {},signal:AbortSignal.timeout(15000)});return {status:r.status,text:await r.text()};};
if(url&&key){report.configuration.supabase_origin=new URL(url).origin;
 try{let r=await get(url+'/rest/v1/');const usedService=r.status!==200&&Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);if(usedService)r=await get(url+'/rest/v1/',process.env.SUPABASE_SERVICE_ROLE_KEY);const schema=JSON.parse(r.text),definitions=schema.definitions||{};report.checks.database_schema={http_status:r.status,metadata_only_service_access:usedService,comments_status_default:definitions.debate_comments?.properties?.status?.default??null,questions_status_default:definitions.debate_questions?.properties?.status?.default??null,lifecycle_column_present:Boolean(definitions.debates?.properties?.recording_first_published_at),api_schema_available:Boolean(schema.definitions),error_code:schema.code||null,error_message:schema.message||schema.error||null};}catch(e){report.checks.database_schema={unavailable:true,error:e.cause?.code||e.name};}
 try{const r=await get(url+'/rest/v1/rpc/debate_participation_state?p_debate=00000000-0000-4000-8000-000000000000');report.checks.lifecycle_rpc={http_status:r.status,returns_null:r.text==='null',error_code:r.status===200?null:JSON.parse(r.text).code};}catch(e){report.checks.lifecycle_rpc={unavailable:true,error:e.cause?.code||e.name};}
}
const configured=process.env.NEXT_PUBLIC_SITE_URL,site=configured?.startsWith('https://')?configured:'https://967-initiative.vercel.app';report.configuration.site_origin=new URL(site).origin;
try{const r=await get(new URL('/debates',site)),scripts=[...r.text.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),site).href).filter(address=>new URL(address).origin===new URL(site).origin);report.checks.public_site={http_status:r.status,script_count:scripts.length,matching_supabase_origin:false};
 const chunks=await Promise.allSettled(scripts.map(get));const origins=new Set();for(const chunk of chunks)if(chunk.status==='fulfilled')for(const m of chunk.value.text.matchAll(/https:\/\/[a-z0-9-]+\.supabase\.co/g))origins.add(m[0]);report.checks.public_site.public_supabase_origins=[...origins];report.checks.public_site.matching_supabase_origin=origins.has(report.configuration.supabase_origin);
}catch(e){report.checks.public_site={unavailable:true,error:e.cause?.code||e.name};}
await mkdir('.audit-tools',{recursive:true});
await writeFile('.audit-tools/discussion-deployment-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
