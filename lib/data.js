import 'server-only';
import {cache} from 'react';
import {fetchAllRows} from './pagination';
import {serverDb} from './supabase-server';
import {defaultMarqueeItems} from './config';
import {getDemoYemeniCompany, mapYemeniCompany, yemeniCompanies} from './yemeniProducts';
import {demoProfessionals, getDemoProfessional, mapProfessional} from './professionals';
import {mapYemeniFigure, mergePublicFigures} from './yemeniFigures';
import {yemeniFiguresCatalog} from './yemeniFiguresCatalog';
import {getFallbackDomain, getFallbackSections, normalizeIndicator} from './yemenNumbers';
async function loadWorks(){
 const db=serverDb(); if(!db)return [];
 const data=await fetchAllRows(()=>db.from('works').select('*').eq('is_published',true).order('published_at',{ascending:false}).order('id')); const error=null;
 if(error){console.error('works:',error.message);return [];} return data||[];
}
async function loadIssues(){
 const db=serverDb(); if(!db)return [];
 const data=await fetchAllRows(()=>db.from('issues').select('*').eq('is_published',true).order('issue_date',{ascending:false}).order('number',{ascending:false}).order('id')); const error=null;
 if(error){console.error('issues:',error.message);return [];}return data||[];
}
async function loadIssue(slug){
 if(slug==='demo') return (await import('./config')).demoIssue;
 const db=serverDb(); if(!db)return null;
 const {data,error}=await db.from('issues').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error){console.error('issue:',error.message);throw new Error('تعذر تحميل العدد');}return data;
}
async function loadMarqueeItems(){
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

async function loadYemeniCompanies(){
 try{
  const db=serverDb(); if(!db)return yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));
  const data=await fetchAllRows(()=>db.from('yemeni_companies').select('*').eq('is_published',true).order('created_at',{ascending:false}).order('id'));
  return data.map(mapYemeniCompany);
 }catch(err){
  console.error('yemeni_companies:',err?.message||err);
  throw new Error('تعذر تحميل دليل المنتجات. حاول مجدداً لاحقاً.');
 }
}

async function loadYemeniCompany(slug){
 try{
  const db=serverDb();
  if(db){
   const {data,error}=await db.from('yemeni_companies').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
   if(!error&&data)return mapYemeniCompany(data);
   if(error)throw new Error(error.message);
   return null;
  }
 }catch(err){console.error('yemeni_company:',err?.message||err);throw new Error('تعذر تحميل الشركة');}
 const demo=getDemoYemeniCompany(slug);
 return demo?{...demo,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}:null;
}

async function loadProfessionals(){
 try{
  const db=serverDb(); if(!db)return demoProfessionals;
  const data=await fetchAllRows(()=>db.from('professionals').select('*').eq('is_published',true).order('created_at',{ascending:false}).order('id'));
  return data.map(mapProfessional);
 }catch(err){console.error('professionals:',err?.message||err);throw new Error('تعذر تحميل دليل المهنيين');}
}

async function loadProfessional(slug){
 try{
  const db=serverDb();
  if(db){
   const {data,error}=await db.from('professionals').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
   if(!error&&data)return mapProfessional(data);
   if(error)throw new Error(error.message);
   return null;
  }
 }catch(err){console.error('professional:',err?.message||err);throw new Error('تعذر تحميل الملف المهني');}
 const demo=getDemoProfessional(slug);
 return demo||null;
}

async function loadYemeniFigures(){
 try{
  const db=serverDb(); if(!db)return yemeniFiguresCatalog;
  const [data,states]=await Promise.all([
   fetchAllRows(()=>db.from('yemeni_figures').select('*').eq('is_published',true).order('display_order').order('full_name').order('id')),
   fetchAllRows(()=>db.from('yemeni_figures').select('slug,is_published').order('slug')),
  ]);
  const stored=(data||[]).map(mapYemeniFigure);
  return mergePublicFigures(stored,yemeniFiguresCatalog,states);
 }catch(err){console.error('yemeni_figures:',err?.message||err);throw new Error('تعذر تحميل دليل الشخصيات');}
}

async function loadYemeniFigure(slug){
 return (await getYemeniFigures()).find(item=>item.slug===slug)||null;
}

async function loadPublishedStatValues(db, indicatorIds) {
 if (!indicatorIds.length) return [];
 const data=await fetchAllRows(()=>db.from('stat_values')
  .select('*,source:stat_sources(id,name,publisher,url,is_active)')
  .in('indicator_id',indicatorIds).eq('is_published',true).eq('national_scope',true)
  .order('year',{ascending:true}).order('id'));
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

async function loadStatSections(){
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

async function loadStatIndicators(){
 try{
  const db=serverDb(); if(!db)return [];
  const data=await fetchAllRows(()=>db.from('stat_indicators')
   .select('*,domain:stat_domains(*,section:stat_sections(*)),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)')
   .eq('is_published',true).order('updated_at',{ascending:false}).order('id'));
  const visible=(data||[]).filter(item=>(!item.hide_when_incomplete||item.data_status==='complete')&&item.domain?.is_published&&item.domain?.section?.is_published).map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return attachStatValues(visible,values);
 }catch(err){console.error('stat_indicators:',err?.message||err);throw new Error('تعذر تحميل المؤشرات');}
}

async function loadStatDomain(slug){
 const fallback=getFallbackDomain(slug);
 try{
  const db=serverDb(); if(!db)return fallback?{...fallback,indicators:[]}:null;
  const {data:domain,error}=await db.from('stat_domains')
   .select('*,section:stat_sections(*)').eq('slug',slug).eq('is_published',true).maybeSingle();
  if(error){console.error('stat_domain:',error.message);return fallback?{...fallback,indicators:[]}:null;}
  if(!domain||!domain.section?.is_published)return null;
  const indicators=await fetchAllRows(()=>db.from('stat_indicators')
   .select('*,adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)').eq('domain_id',domain.id).eq('is_published',true)
   .order('name').order('id'));
  const visible=(indicators||[]).filter(item=>!item.hide_when_incomplete||item.data_status==='complete').map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return {...domain,indicators:attachStatValues(visible,values)};
 }catch(err){console.error('stat_domain:',err?.message||err);throw new Error('تعذر تحميل المجال');}
}

async function loadStatIndicator(slug){
 try{
  const db=serverDb(); if(!db)return null;
  const {data,error}=await db.from('stat_indicators')
   .select('*,domain:stat_domains(*,section:stat_sections(*)),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)')
   .eq('slug',slug).eq('is_published',true).maybeSingle();
  if(error)throw new Error(error.message);
  if(!data)return null;
  if((data.hide_when_incomplete&&data.data_status!=='complete')||!data.domain?.is_published||!data.domain?.section?.is_published)return null;
  const [publicValues,sourcesResult]=await Promise.all([
   loadPublishedStatValues(db,[data.id]),
   db.from('stat_indicator_sources').select('*,source:stat_sources(*)').eq('indicator_id',data.id),
  ]);
  if(sourcesResult.error)console.error('stat_indicator_sources:',sourcesResult.error.message);
  const publicSources=(sourcesResult.data||[]).filter(item=>item.source?.is_active);
  return {...normalizeIndicator({...data,adopted_source:data.adopted_source?.is_active?data.adopted_source:null},publicValues),sources:publicSources};
 }catch(err){console.error('stat_indicator:',err?.message||err);throw new Error('تعذر تحميل المؤشر');}
}

async function loadTimelineIndicators(){
 return getStatIndicators();
}

export const getWorks = cache(loadWorks);
export const getIssues = cache(loadIssues);
export const getIssue = cache(loadIssue);
export const getMarqueeItems = cache(loadMarqueeItems);
export const getYemeniCompanies = cache(loadYemeniCompanies);
export const getYemeniCompany = cache(loadYemeniCompany);
export const getProfessionals = cache(loadProfessionals);
export const getProfessional = cache(loadProfessional);
export const getYemeniFigures = cache(loadYemeniFigures);
export const getYemeniFigure = cache(loadYemeniFigure);
export const getStatSections = cache(loadStatSections);
export const getStatIndicators = cache(loadStatIndicators);
export const getStatDomain = cache(loadStatDomain);
export const getStatIndicator = cache(loadStatIndicator);
export const getTimelineIndicators = cache(loadTimelineIndicators);
