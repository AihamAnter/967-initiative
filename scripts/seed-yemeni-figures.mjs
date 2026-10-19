import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {FIGURE_PROFILE_BUCKET,FIGURE_PROFILE_MAX_BYTES,validateFigureProfile} from '../lib/figureProfiles.js';
import {validateFigureRecord,saveFigureProfile,readFigureProfile} from '../lib/figureProfileRepository.js';
import {createTimedFetch} from '../lib/requestSecurity.js';

async function main(){
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(arg=>!['--apply','--dry-run'].includes(arg)))throw Error('Use --dry-run (default) or --apply.');
const {NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key}=process.env;
if(!url||!key)throw Error('Supabase environment variables are missing.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createTimedFetch(30000)}});
const catalog=JSON.parse(await readFile('data/yemeni-figures/profiles.json','utf8'));
for(const item of catalog){validateFigureRecord(item.record);validateFigureProfile(item.profile);}
const read=()=>fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const before=await read(),known=new Set(before.map(r=>r.slug)),pending=catalog.filter(r=>!known.has(r.record.slug));
const report={mode:apply?'apply':'dry-run',reviewedAt:'2026-10-19',catalogFigures:catalog.length,existingFigures:before.length,insertCount:pending.length,skipped:catalog.filter(r=>known.has(r.record.slug)).map(r=>r.record.slug),existingSnapshotHash:createHash('sha256').update(JSON.stringify(before)).digest('hex')};
if(!apply){console.log(JSON.stringify(report,null,2));return;}

const buckets=await db.storage.listBuckets();if(buckets.error)throw Error('Cannot inspect storage configuration.');
let privateBucket=buckets.data.find(b=>b.id===FIGURE_PROFILE_BUCKET);
if(!privateBucket){const result=await db.storage.createBucket(FIGURE_PROFILE_BUCKET,{public:false,fileSizeLimit:FIGURE_PROFILE_MAX_BYTES,allowedMimeTypes:['application/json']});if(result.error)throw Error('Cannot create the private figure profile bucket.');}
else if(privateBucket.public)throw Error('Figure profile bucket must be private; no content was imported.');
const mediaBucket=buckets.data.find(b=>b.id==='media');if(!mediaBucket?.public)throw Error('Expected the existing public media bucket.');
const mirrors=new Map(),inserted=[];
for(const original of pending){
 const {record,profile}=structuredClone(original);
 for(const photo of profile.gallery){
  if(!photo.url.startsWith('/images/figures/'))throw Error('Expected a reviewed local image asset.');
  const local=photo.url;
  if(!mirrors.has(local)){
   const bytes=await readFile('public'+local),object='figures/reference-2026-10-19/'+local.split('/').at(-1);
   const upload=await db.storage.from('media').upload(object,bytes,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
   if(upload.error&&Number(upload.error.statusCode)!==409)throw Error('Cannot store an attributed figure image.');
   mirrors.set(local,db.storage.from('media').getPublicUrl(object).data.publicUrl);
  }
  photo.url=mirrors.get(local);
 }
 if(profile.gallery[0])record.image_url=profile.gallery[0].url;
 const saved=await saveFigureProfile(db,{record,profile,revision:null,role:'management'});
 const recovered=await readFigureProfile(db,saved.record);
 if(!isDeepStrictEqual(recovered,saved.profile))throw Error('Stored profile verification failed for '+record.slug);
 inserted.push({slug:record.slug,id:saved.record.id,revision:saved.revision,sections:profile.sections.length,events:profile.timeline.length,works:profile.works.length,photos:profile.gallery.length});
 console.log('Verified '+inserted.length+'/'+pending.length+': '+record.slug);
}
const after=await read(),unchanged=before.every(row=>isDeepStrictEqual(after.find(r=>r.id===row.id),row));
const result={...report,insertedCount:inserted.length,afterFigures:after.length,publishedFigures:after.filter(r=>r.is_published).length,existingRecordsUnchanged:unchanged,privateProfilesVerified:inserted.length,uploadedImages:mirrors.size,sections:inserted.reduce((n,r)=>n+r.sections,0),events:inserted.reduce((n,r)=>n+r.events,0),works:inserted.reduce((n,r)=>n+r.works,0),photos:inserted.reduce((n,r)=>n+r.photos,0),inserted,completedAt:new Date().toISOString()};
await writeFile('docs/yemeni-figures-import-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,inserted:undefined},null,2));
if(!unchanged)throw Error('Existing records changed during import; inspect the report. This script never updates existing records.');
}
await main();
