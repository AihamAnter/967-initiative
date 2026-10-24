import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {validateFigureRecord,readFigureProfile} from '../lib/figureProfileRepository.js';
import {validateFigureProfile,figureProfilePath} from '../lib/figureProfiles.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
const baseline=JSON.parse(await readFile('.audit-tools/figures-expansion-100/live-baseline.json','utf8'));
const desired=JSON.parse(await readFile('data/yemeni-figures/profiles.json','utf8'));
const additions=JSON.parse(await readFile('data/yemeni-figures/additions-100.json','utf8'));
const desiredSlugs=new Set(desired.map(x=>x.record.slug));
if(baseline.entries.length!==170||desired.length!==270||desiredSlugs.size!==270||additions.length!==100||new Set(additions.map(x=>x.record.slug)).size!==100||[...baseline.entries,...additions].some(x=>!desiredSlugs.has(x.record.slug)))throw Error('Incomplete or duplicate verification catalog.');
const options={auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}};
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options),anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const rows=await fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const visible=await fetchAllRows(()=>anon.from('yemeni_figures').select('slug',{count:'exact'}).order('id'));
const result={verifiedAt:new Date().toISOString(),figures:rows.length,published:rows.filter(x=>x.is_published).length,anonymousVisible:visible.length,expectedTotal:baseline.entries.length+100,verifiedProfiles:0,verifiedNewProfiles:0,existingRecordsUnchanged:true,existingProfilesUnchanged:true,http:[],errors:[]};
const newSlugs=new Set(additions.map(x=>x.record.slug));
const actualProfiles=new Map();
for(let i=0;i<desired.length;i+=5){await Promise.all(desired.slice(i,i+5).map(async item=>{
 const r=rows.find(x=>x.slug===item.record.slug);if(!r){result.errors.push('Missing '+item.record.slug);return;}
 const p=await readFigureProfile(db,r);
 actualProfiles.set(r.slug,p);
 if(!isDeepStrictEqual(validateFigureRecord(r),validateFigureRecord(item.record))||!isDeepStrictEqual(p,validateFigureProfile(item.profile)))result.errors.push('Content mismatch '+r.slug);
 else{result.verifiedProfiles++;if(newSlugs.has(r.slug))result.verifiedNewProfiles++;}
}));}
for(const old of baseline.entries){const current=rows.find(x=>x.slug===old.record.slug);if(!current||!isDeepStrictEqual(current,old.record))result.existingRecordsUnchanged=false;if(!isDeepStrictEqual(actualProfiles.get(old.record.slug),old.profile))result.existingProfilesUnchanged=false;}
const {data:buckets,error}=await db.storage.listBuckets();if(error)throw error;
result.profileBucketPrivate=buckets.find(b=>b.id==='figure-profiles')?.public===false;
const denied=await anon.storage.from('figure-profiles').download(figureProfilePath(rows[0]));result.anonymousProfileObjectDenied=Boolean(denied.error)&&!denied.data;
// Every new route gets an independent public HTTP check; do not inspect only DB rows.
const requests=[{path:'/yemen-map',expected:[additions[0].record.full_name]},...additions.map(x=>({path:'/yemen-map/figures/'+x.record.slug,expected:[x.record.full_name,x.profile.sections[1].title,x.profile.sections[1].paragraphs[0].slice(0,60)]})),{path:'/yemen-map/figures/abdullah-al-baradouni',expected:['عبد الله البردوني']}];
for(let i=0;i<requests.length;i+=4){await Promise.all(requests.slice(i,i+4).map(async x=>{
 try{const r=await fetch('https://967-initiative.vercel.app'+x.path,{signal:AbortSignal.timeout(45000)}),body=await r.text();const check={path:x.path,status:r.status,expectedContentFound:x.expected.every(value=>body.includes(value))};result.http.push(check);if(!r.ok||!check.expectedContentFound)result.errors.push('Public content '+x.path);}catch(error){result.http.push({path:x.path,error:error.message});result.errors.push('Public content '+x.path);}
}));}
if(result.figures!==result.expectedTotal||result.published!==result.expectedTotal||result.anonymousVisible!==result.expectedTotal||result.verifiedProfiles!==270||result.verifiedNewProfiles!==100||!result.existingRecordsUnchanged||!result.existingProfilesUnchanged||!result.profileBucketPrivate||!result.anonymousProfileObjectDenied)result.errors.push('Directory verification failed.');
await writeFile('docs/yemeni-figures-additions-100-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,http:{checked:result.http.length,passed:result.http.filter(x=>x.status===200&&x.expectedContentFound).length}},null,2));
if(result.errors.length)process.exitCode=1;
