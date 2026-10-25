// Insert-only source-reviewed additions; never overwrites an existing record.
import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fetchAllRows} from '../lib/pagination.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
import {validateFigureRecord,saveFigureProfile,readFigureProfile} from '../lib/figureProfileRepository.js';
import {validateFigureProfile} from '../lib/figureProfiles.js';
import {prepareCompanyImport,insertCompanyCatalog,companyIdentity} from '../lib/companyCatalogImport.js';
const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(arg=>!['--apply','--dry-run'].includes(arg)))throw Error('Use --dry-run (default) or --apply.');
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Missing project configuration.');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createTimedFetch(30000)}});
const [figuresInput,companiesInput]=await Promise.all(['data/yemeni-figures/additions-2026-10-25.json','data/yemeni-companies/additions-2026-10-25.json'].map(async file=>JSON.parse(await readFile(file,'utf8'))));
const figures=figuresInput.map(item=>({record:validateFigureRecord(item.record),profile:validateFigureProfile(item.profile)}));
const [beforeFigures,beforeCompanies,editors]=await Promise.all([
 fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id')),
 fetchAllRows(()=>db.from('yemeni_companies').select('*',{count:'exact'}).order('id')),
 db.from('editors').select('user_id,role').eq('role','management'),
]);
if(editors.error)throw Error('Cannot verify editorial actor.');
const actorId=process.env.EDITOR_ACTOR_ID||(editors.data?.length===1?editors.data[0].user_id:null);
if(apply&&!actorId)throw Error('Set EDITOR_ACTOR_ID to the authorized editorial actor.');
if(actorId){const actor=await db.from('editors').select('role').eq('user_id',actorId).maybeSingle();if(actor.error||!['admin','management'].includes(actor.data?.role))throw Error('Editorial actor is unavailable.');}
const companyPlan=prepareCompanyImport(companiesInput,beforeCompanies),figureNames=new Set(beforeFigures.map(row=>companyIdentity(row.full_name))),figureSlugs=new Set(beforeFigures.map(row=>row.slug));
const pendingFigures=figures.filter(item=>!figureNames.has(companyIdentity(item.record.full_name))&&!figureSlugs.has(item.record.slug));
const seenNames=new Set(),seenSlugs=new Set();for(const item of figures){const name=companyIdentity(item.record.full_name);if(seenNames.has(name)||seenSlugs.has(item.record.slug))throw Error('Duplicate identity in figure batch.');seenNames.add(name);seenSlugs.add(item.record.slug);}
// A shared official source domain is surfaced for review before applying: it
// can indicate an alias, a subsidiary or an already-covered establishment.
const domain=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return null;}};
const domainMatches=companyPlan.pending.flatMap(row=>{const host=domain(row.website);return beforeCompanies.filter(stored=>host&&[stored.website,...(stored.products||[]).flatMap(product=>(product.sources||[]).map(source=>source.url))].some(url=>domain(url)===host)).map(stored=>({candidate:row.slug,existing:stored.slug,domain:host}));});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report={date:'2026-10-25',mode:apply?'apply':'dry-run',beforeFigures:beforeFigures.length,beforeCompanies:beforeCompanies.length,pendingFigures:pendingFigures.map(item=>({slug:item.record.slug,name:item.record.full_name})),pendingCompanies:companyPlan.pending.map(row=>({slug:row.slug,name:row.name,products:row.products.length})),skippedFigures:figures.filter(item=>!pendingFigures.includes(item)).map(item=>item.record.slug),skippedCompanies:companyPlan.skipped,sharedDomainReview:domainMatches,baselineFigureHash:hash(beforeFigures),baselineCompanyHash:hash(beforeCompanies),insertedFigures:[],insertedCompanies:[]};
await mkdir('.audit-tools/visual-phase-4',{recursive:true});
await writeFile('.audit-tools/visual-phase-4/content-plan.json',JSON.stringify(report,null,2)+'\n');
if(!apply){console.log(JSON.stringify(report,null,2));process.exit(0);}
if(domainMatches.length)throw Error('Resolve the shared source domains before applying this insert-only batch.');
const output='docs/design/phase-4-content-result.json';
try{
 for(const item of pendingFigures){const saved=await saveFigureProfile(db,{record:item.record,profile:item.profile,revision:null,role:'management',actorId});const stored=await readFigureProfile(db,saved.record);if(!isDeepStrictEqual(stored,saved.profile))throw Error('Stored profile differs: '+item.record.slug);report.insertedFigures.push({id:saved.record.id,slug:item.record.slug});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log('Verified figure '+report.insertedFigures.length+'/'+pendingFigures.length+' '+item.record.slug);}
 report.insertedCompanies=await insertCompanyCatalog(db,companyPlan.pending);
 const [afterFigures,afterCompanies]=await Promise.all([fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id')),fetchAllRows(()=>db.from('yemeni_companies').select('*',{count:'exact'}).order('id'))]);
 report.existingFiguresUnchanged=beforeFigures.every(row=>isDeepStrictEqual(row,afterFigures.find(item=>item.id===row.id)));report.existingCompaniesUnchanged=beforeCompanies.every(row=>isDeepStrictEqual(row,afterCompanies.find(item=>item.id===row.id)));
 report.afterFigures=afterFigures.length;report.afterCompanies=afterCompanies.length;report.completedAt=new Date().toISOString();
 report.companiesVerified=companyPlan.pending.every(row=>{const saved=afterCompanies.find(item=>item.slug===row.slug);return saved&&Object.entries(row).every(([key,value])=>isDeepStrictEqual(saved[key],value));});
 await writeFile(output,JSON.stringify(report,null,2)+'\n');
 if(!report.existingFiguresUnchanged||!report.existingCompaniesUnchanged||!report.companiesVerified||afterFigures.length!==beforeFigures.length+report.insertedFigures.length||afterCompanies.length!==beforeCompanies.length+report.insertedCompanies.length)throw Error('Post-import preservation verification failed. Review the report.');
 console.log(JSON.stringify({afterFigures:report.afterFigures,afterCompanies:report.afterCompanies,figuresAdded:report.insertedFigures.length,companiesAdded:report.insertedCompanies.length,existingRecordsUnchanged:true,verified:true}));
}catch(error){report.error=error.message;await writeFile(output,JSON.stringify(report,null,2)+'\n');throw error;}
