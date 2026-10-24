// Assemble the reviewed second expansion without modifying any prior profile.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateFigureRecord} from '../lib/figureProfileRepository.js';
import {validateFigureProfile} from '../lib/figureProfiles.js';
import {mapYemeniFigure} from '../lib/yemeniFigures.js';
const root='.audit-tools/figures-expansion-100';
const baseline=JSON.parse(await readFile(root+'/live-baseline.json','utf8'));
const oldLocal=JSON.parse(await readFile(root+'/catalog-before.json','utf8'));
const batches=['arts','culture','public','root'];
const expected=[35,25,30,10];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const norm=value=>String(value).normalize('NFKC').replace(/[\u064b-\u065fـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
export const identity=profile=>[...new Set(profile.sources.flatMap(s=>s.url.match(/(?:www\.)?wikidata\.org\/(?:wiki|entity)\/(Q\d+)/)?.[1]||[]))];
const prior=baseline.entries.map(({record,profile})=>({record:validateFigureRecord(record),profile:validateFigureProfile(profile)})).sort((a,b)=>a.record.display_order-b.record.display_order);
if(prior.length!==170||!isDeepStrictEqual(prior,oldLocal.map(x=>({record:validateFigureRecord(x.record),profile:validateFigureProfile(x.profile)}))))throw Error('The live baseline differs from the prior catalog; reconcile the editorial changes before assembly.');
const slugs=new Set(prior.map(x=>x.record.slug)),names=new Set(prior.map(x=>norm(x.record.full_name))),qids=new Set(prior.flatMap(x=>identity(x.profile)));
const additions=[];
for(const [i,batch]of batches.entries()){
 const rows=JSON.parse(await readFile('data/yemeni-figures/batch-100-'+batch+'.json','utf8'));
 if(rows.length!==expected[i])throw Error('Expected '+expected[i]+' profiles in '+batch);
 for(const raw of rows){
  const record=validateFigureRecord({...raw.record,display_order:171+additions.length}),profile=validateFigureProfile(raw.profile);
  if(slugs.has(record.slug)||names.has(norm(record.full_name)))throw Error('Duplicate name or route: '+record.full_name);
  for(const qid of identity(profile)){if(qids.has(qid))throw Error('Duplicate identity '+qid+': '+record.full_name);qids.add(qid);}
  const prose=profile.sections.flatMap(s=>s.paragraphs).join(' ');
  if(profile.sections.length<4||prose.length<1400||profile.facts.length<5||profile.sources.length<2)throw Error('Incomplete biography: '+record.full_name+' ('+prose.length+' characters)');
  if(profile.timeline.length<3)throw Error('Incomplete dated milestones: '+record.full_name);
  if([record.birth_year,record.death_year,...profile.timeline.map(e=>e.year),...profile.works.map(w=>w.year)].some(y=>y!==null&&y>2026))throw Error('Future date presented as a biography fact: '+record.full_name);
  for(const kind of ['sections','facts','timeline','works'])if(profile[kind].some(item=>!item.sourceIds.length))throw Error('Unreferenced '+kind+': '+record.full_name);
  if(!record.is_published||profile.reviewedAt!=='2026-10-24')throw Error('Invalid publication or review state: '+record.full_name);
  slugs.add(record.slug);names.add(norm(record.full_name));additions.push({record,profile});
 }
}
const total=[...prior,...additions];
const counts=rows=>Object.fromEntries(['sections','facts','timeline','works','gallery','sources'].map(k=>[k,rows.reduce((n,x)=>n+x.profile[k].length,0)]));
const report={reviewedAt:'2026-10-24',beforeCount:prior.length,addedCount:additions.length,afterCount:total.length,existingProfilesUnchanged:true,before:counts(prior),added:counts(additions),after:counts(total),changes:additions.map(x=>({slug:x.record.slug,name:x.record.full_name,kind:'create',identity:identity(x.profile),hash:hash(x),sections:x.profile.sections.length,biographyCharacters:x.profile.sections.flatMap(s=>s.paragraphs).join(' ').length,facts:x.profile.facts.length,events:x.profile.timeline.length,works:x.profile.works.length,sources:x.profile.sources.length}))};
await writeFile('data/yemeni-figures/additions-100.json',JSON.stringify(additions,null,2)+'\n');
await writeFile('data/yemeni-figures/profiles.json',JSON.stringify(total,null,2)+'\n');
await writeFile('data/yemeni-figures/additions-100-plan.json',JSON.stringify(report,null,2)+'\n');
const cards=total.map(({record})=>({...mapYemeniFigure({...record,id:'catalog-'+record.slug}),isDemo:true}));
await writeFile('lib/yemeniFiguresCatalog.js','// Generated from the reviewed profiles bundle; no database fallback when configured.\nexport const yemeniFiguresCatalog = '+JSON.stringify(cards,null,2)+';\n');
console.log(JSON.stringify({...report,changes:undefined},null,2));
