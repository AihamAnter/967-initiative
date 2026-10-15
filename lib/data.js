import 'server-only';
import {serverDb} from './supabase-server';
import {defaultMarqueeItems} from './config';
import {getDemoYemeniCompany, mapYemeniCompany, yemeniCompanies} from './yemeniProducts';
import {demoProfessionals, getDemoProfessional, mapProfessional} from './professionals';
import {getFallbackDomain, getFallbackSections, normalizeIndicator} from './yemenNumbers';
export async function getWorks(){
 const db=serverDb(); if(!db)return [];
 const {data,error}=await db.from('works').select('*').eq('is_published',true).order('published_at',{ascending:false});
 if(error){console.error('works:',error.message);return [];} return data||[];
}
export async function getIssues(){
 const db=serverDb(); if(!db)return [];
 const {data,error}=await db.from('issues').select('*').eq('is_published',true).order('issue_date',{ascending:false}).order('number',{ascending:false});
 if(error){console.error('issues:',error.message);return [];}return data||[];
}
export async function getIssue(slug){
 if(slug==='demo') return (await import('./config')).demoIssue;
 const db=serverDb(); if(!db)return null;
 const {data,error}=await db.from('issues').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error){console.error('issue:',error.message);return null;}return data;
}
export async function getMarqueeItems(){
 try{
  const db=serverDb(); if(!db)return defaultMarqueeItems;
  const {data,error}=await db.from('site_settings').select('value').eq('key','home_marquee_items').maybeSingle();
  if(error){console.error('marquee:',error.message);return defaultMarqueeItems;}
  return Array.isArray(data?.value)&&data.value.length?data.value:defaultMarqueeItems;
 }catch(err){
  console.error('marquee:',err?.message||err);
  return defaultMarqueeItems;
 }
}

export async function getYemeniCompanies(){
 try{
  const db=serverDb(); if(!db)return yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));
  const {data,error}=await db.from('yemeni_companies').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){console.error('yemeni_companies:',error.message);return yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));}
  return data?.length?data.map(mapYemeniCompany):yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));
 }catch(err){
  console.error('yemeni_companies:',err?.message||err);
  return yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));
 }
}

export async function getYemeniCompany(slug){
 try{
  const db=serverDb();
  if(db){
   const {data,error}=await db.from('yemeni_companies').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
   if(!error&&data)return mapYemeniCompany(data);
   if(error)console.error('yemeni_company:',error.message);
  }
 }catch(err){console.error('yemeni_company:',err?.message||err);}
 const demo=getDemoYemeniCompany(slug);
 return demo?{...demo,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}:null;
}

export async function getProfessionals(){
 try{
  const db=serverDb(); if(!db)return demoProfessionals;
  const {data,error}=await db.from('professionals').select('*').eq('is_published',true).order('created_at',{ascending:false});
  if(error){console.error('professionals:',error.message);return demoProfessionals;}
  return data?.length?data.map(mapProfessional):demoProfessionals;
 }catch(err){console.error('professionals:',err?.message||err);return demoProfessionals;}
}

export async function getProfessional(slug){
 try{
  const db=serverDb();
  if(db){
   const {data,error}=await db.from('professionals').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
   if(!error&&data)return mapProfessional(data);
   if(error)console.error('professional:',error.message);
  }
 }catch(err){console.error('professional:',err?.message||err);}
 const demo=getDemoProfessional(slug);
 return demo||null;
}

async function loadPublishedStatValues(db, indicatorIds) {
 if (!indicatorIds.length) return [];
 const {data,error}=await db.from('stat_values')
  .select('*,source:stat_sources(id,name,publisher,url,is_active)')
  .in('indicator_id',indicatorIds).eq('is_published',true).eq('national_scope',true)
  .order('year',{ascending:true});
 if(error){console.error('stat_values:',error.message);return [];}
 return (data||[]).map(value=>({...value,source:value.source?.is_active?value.source:null}));
}

function attachStatValues(indicators, values) {
 const grouped=new Map();
 for(const value of values){
  const list=grouped.get(value.indicator_id)||[];
  list.push(value);
  grouped.set(value.indicator_id,list);
 }
 return indicators.map(indicator=>normalizeIndicator(indicator,grouped.get(indicator.id)||[]));
}

export async function getStatSections(){
 try{
  const db=serverDb(); if(!db)return getFallbackSections();
  const [sectionResult,domainResult]=await Promise.all([
   db.from('stat_sections').select('*').eq('is_published',true).order('display_order'),
   db.from('stat_domains').select('*').eq('is_published',true).order('display_order'),
  ]);
  if(sectionResult.error||domainResult.error){
   console.error('stat_sections:',sectionResult.error?.message||domainResult.error?.message);
   return getFallbackSections();
  }
  return (sectionResult.data||[]).map(section=>({
   ...section,
   domains:(domainResult.data||[]).filter(domain=>domain.section_id===section.id),
  }));
 }catch(err){console.error('stat_sections:',err?.message||err);return getFallbackSections();}
}

export async function getStatIndicators(){
 try{
  const db=serverDb(); if(!db)return [];
  const {data,error}=await db.from('stat_indicators')
   .select('*,domain:stat_domains(*,section:stat_sections(*)),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)')
   .eq('is_published',true).order('updated_at',{ascending:false});
  if(error){console.error('stat_indicators:',error.message);return [];}
  const visible=(data||[]).filter(item=>(!item.hide_when_incomplete||item.data_status==='complete')&&item.domain?.is_published&&item.domain?.section?.is_published).map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return attachStatValues(visible,values);
 }catch(err){console.error('stat_indicators:',err?.message||err);return [];}
}

export async function getStatDomain(slug){
 const fallback=getFallbackDomain(slug);
 try{
  const db=serverDb(); if(!db)return fallback?{...fallback,indicators:[]}:null;
  const {data:domain,error}=await db.from('stat_domains')
   .select('*,section:stat_sections(*)').eq('slug',slug).eq('is_published',true).maybeSingle();
  if(error){console.error('stat_domain:',error.message);return fallback?{...fallback,indicators:[]}:null;}
  if(!domain||!domain.section?.is_published)return null;
  const {data:indicators,error:indicatorError}=await db.from('stat_indicators')
   .select('*,adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)').eq('domain_id',domain.id).eq('is_published',true)
   .order('name');
  if(indicatorError){console.error('stat_domain_indicators:',indicatorError.message);return {...domain,indicators:[]};}
  const visible=(indicators||[]).filter(item=>!item.hide_when_incomplete||item.data_status==='complete').map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return {...domain,indicators:attachStatValues(visible,values)};
 }catch(err){console.error('stat_domain:',err?.message||err);return fallback?{...fallback,indicators:[]}:null;}
}

export async function getStatIndicator(slug){
 try{
  const db=serverDb(); if(!db)return null;
  const {data,error}=await db.from('stat_indicators')
   .select('*,domain:stat_domains(*,section:stat_sections(*)),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)')
   .eq('slug',slug).eq('is_published',true).maybeSingle();
  if(error||!data){if(error)console.error('stat_indicator:',error.message);return null;}
  if((data.hide_when_incomplete&&data.data_status!=='complete')||!data.domain?.is_published||!data.domain?.section?.is_published)return null;
  const [valuesResult,sourcesResult]=await Promise.all([
   db.from('stat_values').select('*,source:stat_sources(*)').eq('indicator_id',data.id)
    .eq('is_published',true).eq('national_scope',true).order('year'),
   db.from('stat_indicator_sources').select('*,source:stat_sources(*)').eq('indicator_id',data.id),
  ]);
  if(valuesResult.error)console.error('stat_indicator_values:',valuesResult.error.message);
  if(sourcesResult.error)console.error('stat_indicator_sources:',sourcesResult.error.message);
  const publicValues=(valuesResult.data||[]).map(value=>({...value,source:value.source?.is_active?value.source:null}));
  const publicSources=(sourcesResult.data||[]).filter(item=>item.source?.is_active);
  return {...normalizeIndicator({...data,adopted_source:data.adopted_source?.is_active?data.adopted_source:null},publicValues),sources:publicSources};
 }catch(err){console.error('stat_indicator:',err?.message||err);return null;}
}

export async function getTimelineIndicators(){
 return getStatIndicators();
}
