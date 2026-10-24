import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {readFigureProfile,validateFigureRecord} from '../lib/figureProfileRepository.js';
import {validateFigureProfile,figureProfilePath} from '../lib/figureProfiles.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}});
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}});
const desired=JSON.parse(await readFile('data/yemeni-figures/profiles.json','utf8'));
const rows=await fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const publicRows=await fetchAllRows(()=>anon.from('yemeni_figures').select('slug',{count:'exact'}).order('id'));
const result={verifiedAt:new Date().toISOString(),figures:rows.length,published:rows.filter(x=>x.is_published).length,anonymousVisible:publicRows.length,verifiedProfiles:0,errors:[],http:[]};
for(let i=0;i<desired.length;i+=5){await Promise.all(desired.slice(i,i+5).map(async item=>{
 const record=rows.find(x=>x.slug===item.record.slug);if(!record){result.errors.push('Missing '+item.record.slug);return;}
 const profile=await readFigureProfile(db,record);
 if(!isDeepStrictEqual(validateFigureRecord(record),validateFigureRecord(item.record))||!isDeepStrictEqual(profile,validateFigureProfile(item.profile)))result.errors.push('Mismatch '+record.slug);
 else result.verifiedProfiles++;
}));}
const {data:buckets,error}=await db.storage.listBuckets();if(error)throw error;
result.profileBucketPrivate=buckets.find(x=>x.id==='figure-profiles')?.public===false;
const denied=await anon.storage.from('figure-profiles').download(figureProfilePath(rows[0]));
result.anonymousProfileObjectDenied=Boolean(denied.error)&&!denied.data;
const base='https://967-initiative.vercel.app';
for(const [path,text]of [['/yemen-map','عبد العزيز المقالح'],['/yemen-map/figures/abdulaziz-al-maqaleh','كتاب صنعاء'],['/yemen-map/figures/hayel-saeed-anam','1938'],['/yemen-map/figures/alaa-al-sasi','التأهل إلى كأس آسيا'],['/yemen-map/figures/abdullah-al-baradouni','عبد الله البردوني']]){
 try{const r=await fetch(base+path,{signal:AbortSignal.timeout(30000)}),html=await r.text();const check={path,status:r.status,expectedContentFound:html.includes(text)};result.http.push(check);if(!r.ok||!check.expectedContentFound)result.errors.push('Public page '+path);}catch(error){result.http.push({path,error:error.message});result.errors.push('Public page '+path);}
}
if(result.figures!==170||result.published!==170||result.anonymousVisible!==170||!result.profileBucketPrivate||!result.anonymousProfileObjectDenied)result.errors.push('Directory count, publication or storage verification failed.');
await writeFile('docs/yemeni-figures-expansion-verification-2026-10.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
if(result.errors.length)process.exitCode=1;
