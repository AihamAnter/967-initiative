// Insert-only, source-reviewed expansion. Existing published/draft entries are never updated.
import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {validateFigureRecord,readFigureProfile,saveFigureProfile} from '../lib/figureProfileRepository.js';
import {validateFigureProfile} from '../lib/figureProfiles.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(x=>!['--apply','--dry-run'].includes(x)))throw Error('Use --dry-run (default) or --apply.');
const baseline=JSON.parse(await readFile('.audit-tools/figures-expansion-100/live-baseline.json','utf8'));
const plan=JSON.parse(await readFile('data/yemeni-figures/additions-100-plan.json','utf8'));
const additions=JSON.parse(await readFile('data/yemeni-figures/additions-100.json','utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const norm=x=>String(x).normalize('NFKC').replace(/[\u064b-\u065fـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
const ids=p=>new Set(p.sources.flatMap(s=>s.url.match(/wikidata\.org\/(?:wiki|entity)\/(Q\d+)/)?.[1]||[]));
const actorId=process.env.EDITOR_ACTOR_ID||(baseline.managementActorIds.length===1?baseline.managementActorIds[0]:null);
if(!actorId)throw Error('An identified editorial actor is required.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}});
const read=()=>fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const before=await read(),bySlug=new Map(before.map(x=>[x.slug,x]));
const baselineSlugs=new Set(baseline.entries.map(x=>x.record.slug)),additionSlugs=new Set(additions.map(x=>x.record.slug));
if(baseline.entries.length!==170||baselineSlugs.size!==170||additionSlugs.size!==100||plan.beforeCount!==170||plan.afterCount!==270)throw Error('Unexpected baseline or expansion size.');
if(before.some(x=>!baselineSlugs.has(x.slug)&&!additionSlugs.has(x.slug)))throw Error('The directory has unrelated additions after the baseline; reconcile before inserting this batch.');
const {data:actor,error}=await db.from('editors').select('role').eq('user_id',actorId).maybeSingle();if(error||!['admin','management'].includes(actor?.role))throw Error('Editorial permission unavailable.');
if(additions.length!==100||plan.addedCount!==100)throw Error('Expected exactly 100 reviewed additions.');
const liveProfiles=new Map(),qids=new Set();
for(let i=0;i<before.length;i+=5)await Promise.all(before.slice(i,i+5).map(async r=>{const p=await readFigureProfile(db,r);liveProfiles.set(r.slug,p);if(p)for(const q of ids(p))qids.add(q);}));
// Detect editorial edits or removal of any of the original 170 before starting.
for(const entry of baseline.entries){const r=bySlug.get(entry.record.slug);if(!r||!isDeepStrictEqual(r,entry.record)||!isDeepStrictEqual(liveProfiles.get(r.slug),entry.profile))throw Error('An existing profile changed after baseline: '+entry.record.slug);}
const pending=[],seenNames=new Set(before.map(x=>norm(x.full_name)));
for(const input of additions){const item={record:validateFigureRecord(input.record),profile:validateFigureProfile(input.profile)},change=plan.changes.find(x=>x.slug===item.record.slug);
 if(!change||change.hash!==hash(item))throw Error('Content changed after review: '+item.record.slug);
 const r=bySlug.get(item.record.slug);
 if(r){if(!isDeepStrictEqual(validateFigureRecord(r),item.record)||!isDeepStrictEqual(liveProfiles.get(r.slug),item.profile))throw Error('Slug already exists with different content: '+r.slug);continue;}
 if(seenNames.has(norm(item.record.full_name)))throw Error('Name already exists: '+item.record.full_name);
 for(const q of ids(item.profile)){if(qids.has(q))throw Error('Identity already exists: '+q);qids.add(q);}
 seenNames.add(norm(item.record.full_name));pending.push(item);
}
const result={mode:apply?'apply':'dry-run',reviewedAt:plan.reviewedAt,beforeCount:before.length,baselineCount:baseline.entries.length,batchCount:additions.length,alreadyPresent:additions.length-pending.length,plannedInsertions:pending.length,plannedUpdates:0,expectedAfterCount:before.length+pending.length,inserted:[],errors:[]};
console.log(JSON.stringify({...result,inserted:undefined},null,2));if(!apply)process.exit(0);
const output='docs/yemeni-figures-additions-100-result.json';
try{
 for(const [i,item]of pending.entries()){
  const saved=await saveFigureProfile(db,{record:item.record,profile:item.profile,revision:null,actorId,role:actor.role});
  const recovered=await readFigureProfile(db,saved.record);
  if(!isDeepStrictEqual(validateFigureRecord(saved.record),item.record)||!isDeepStrictEqual(recovered,item.profile))throw Error('Saved verification failed: '+item.record.slug);
  result.inserted.push({slug:saved.record.slug,name:saved.record.full_name,id:saved.record.id,revision:saved.revision});
  await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log('Verified '+(i+1)+'/'+pending.length+' '+saved.record.slug);
 }
 const after=await read();const unchanged=before.every(r=>isDeepStrictEqual(after.find(x=>x.id===r.id),r));
 Object.assign(result,{afterCount:after.length,publishedCount:after.filter(x=>x.is_published).length,addedThisRunCount:result.inserted.length,addedCount:additions.length,existingRecordsUnchanged:unchanged,verifiedNewProfiles:result.alreadyPresent+result.inserted.length,completedAt:new Date().toISOString()});
 if(!unchanged||after.length!==result.expectedAfterCount||after.length!==270)throw Error('Final count or preservation verification failed.');
 await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,inserted:undefined},null,2));
}catch(error){result.errors.push(error.message);await writeFile(output,JSON.stringify(result,null,2)+'\n');throw error;}
