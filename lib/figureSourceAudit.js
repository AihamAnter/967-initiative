// A static audit of editorial provenance, NOT a verification of factual claims.
import {isGeneralEncyclopediaSource} from './figureEditorialReview.js';

const itemGroups=['sections','facts','timeline','works'];
export function auditFigurePackages(packages){
 const slugs=new Set(),issues=[],priority=[];
 const counters={profiles:0,sources:0,generalOnly:0,independentReferencePresent:0,
   noReferences:0,oneReference:0,briefBios:0,singleSection:0,
   sections:0,facts:0,timeline:0,works:0,gallery:0,
   uncitedContent:0,brokenReferenceIds:0,invalidSourceUrls:0,
   imagesWithoutProvenance:0,withoutReviewDate:0,traditional:0,disputed:0};
 for(const item of packages){
  const slug=item?.record?.slug,profile=item?.profile;
  if(!slug||typeof slug!=='string'||slugs.has(slug)||!profile){
   issues.push({slug:slug||'',code:'missing-or-duplicate-profile'});continue;
  }
  slugs.add(slug);counters.profiles++;
  const sources=Array.isArray(profile.sources)?profile.sources:[];
  counters.sources+=sources.length;
  if(sources.length===0)counters.noReferences++;
  if(sources.length===1)counters.oneReference++;
  if(!profile.reviewedAt)counters.withoutReviewDate++;
  if((profile.sections||[]).length===1)counters.singleSection++;
  if((item.record.short_bio||'').length<180)counters.briefBios++;
  if(profile.historicity==='traditional')counters.traditional++;
  if(profile.historicity==='disputed')counters.disputed++;
  const external=sources.filter(src=>!isGeneralEncyclopediaSource(src));
  if(sources.length&&external.length===0)counters.generalOnly++;
  if(external.length)counters.independentReferencePresent++;
  const sourceIds=new Set(sources.map(src=>src.id));
  for(const src of sources){
   try{
    const url=new URL(src.url);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error();
   }catch{counters.invalidSourceUrls++;issues.push({slug,code:'bad-source-url',source:src.id});}
  }
  for(const group of itemGroups)for(const row of profile[group]||[]){
   counters[group]++;
   if(!Array.isArray(row.sourceIds)||row.sourceIds.length===0)counters.uncitedContent++;
   for(const id of row.sourceIds||[])if(!sourceIds.has(id)){counters.brokenReferenceIds++;issues.push({slug,code:'unknown-source-id',source:id});}
  }
  for(const image of profile.gallery||[]){
   counters.gallery++;
   if(!image.sourceUrl||!image.license||!image.credit){
    counters.imagesWithoutProvenance++;issues.push({slug,code:'missing-image-provenance'});
   }
  }
  const flags=[];
  if(!sources.length)flags.push('no-sources');
  if(sources.length&&!external.length)flags.push('encyclopedia-only');
  if((item.record.short_bio||'').length<180)flags.push('brief-biography');
  if((profile.sections||[]).length<=1)flags.push('one-section');
  if(['disputed','traditional'].includes(profile.historicity))flags.push('historical-interpretation');
  if(sources.length===1)flags.push('single-source');
  if(flags.length)priority.push({slug,name:item.record.full_name||'',field:item.record.field||'',flags,sourceCount:sources.length,reviewedAt:profile.reviewedAt||''});
 }
 priority.sort((a,b)=>{
  const severity=row=>row.flags.reduce((score,flag)=>score+({'no-sources':10,'brief-biography':5,'encyclopedia-only':4,'historical-interpretation':4,'one-section':3,'single-source':3}[flag]||0),0);
  return severity(b)-severity(a)||a.slug.localeCompare(b.slug);
 });
 return {generatedFrom:'Local editorial packages, not a live Storage download',counters,issues,priority};
}
