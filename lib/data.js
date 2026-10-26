import 'server-only';
import {cache} from 'react';
import {recordOperationalEvent} from './operationalEvents';
import {fetchAllRows} from './pagination';
import {serverDb} from './supabase-server';
import {resolveSiteSettings} from './siteSettings';
import {CONTENT_PAGE_KEYS,resolveContentCatalog} from './contentPages';
import {PAGE_VISIBILITY_KEY,resolvePageVisibility,publicSections,sectionIsVisible} from './pageVisibility';
import {getDemoYemeniCompany, mapYemeniCompany, yemeniCompanies} from './yemeniProducts';
import {demoProfessionals, getDemoProfessional, mapProfessional} from './professionals';
import {fallbackUniversities,fallbackMedicalCenters,mapUniversity,mapMedicalCenter} from './institutionDirectories';
import {mapYemeniFigure} from './yemeniFigures';
import {yemeniFiguresCatalog} from './yemeniFiguresCatalog';
import {readFigureProfile} from './figureProfileRepository';
import {createProjectionReader} from './projectionReader';
const readProjection=createProjectionReader();
import {getFallbackDomain, getFallbackSections, normalizeIndicator} from './yemenNumbers';
async function loadWorks(projection='*'){
 const db=serverDb(); if(!db)return [];
 try{return await fetchAllRows(()=>db.from('works').select(projection,{count:'exact'}).eq('is_published',true).order('published_at',{ascending:false}).order('id'));}
 catch(error){recordOperationalEvent('database_failure',{source:'works'});throw new Error('تعذر تحميل الأعمال. حاول مجدداً لاحقاً.');}
}
async function loadIssues(projection='*'){
 const db=serverDb(); if(!db)return [];
 try{return await fetchAllRows(()=>db.from('issues').select(projection,{count:'exact'}).eq('is_published',true).order('issue_date',{ascending:false}).order('number',{ascending:false}).order('id'));}
 catch(error){recordOperationalEvent('database_failure',{source:'issues'});throw new Error('تعذر تحميل أعداد المجلة. حاول مجدداً لاحقاً.');}
}
async function loadIssue(slug){
 if(slug==='demo') return (await import('./config')).demoIssue;
 const db=serverDb(); if(!db)return null;
 const {data,error}=await db.from('issues').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error){recordOperationalEvent('database_failure',{source:'issues'});throw new Error('تعذر تحميل العدد');}return data;
}
async function loadSiteSettings(){
 try{
  const db=serverDb();if(!db)return {...resolveSiteSettings(),contentPages:resolveContentCatalog(),pageVisibility:resolvePageVisibility()};
  const {data,error}=await db.from('site_settings').select('key,value').in('key',[...CONTENT_PAGE_KEYS,PAGE_VISIBILITY_KEY]).abortSignal(AbortSignal.timeout(6000));
  if(error)throw error;
  return {...resolveSiteSettings(data||[]),contentPages:resolveContentCatalog(data||[]),pageVisibility:resolvePageVisibility(data||[])};
 }catch(error){recordOperationalEvent('database_failure',{source:'settings'});return {...resolveSiteSettings(),contentPages:null,pageVisibility:Object.fromEntries(publicSections.map(item=>[item.id,false])),pageVisibilityUnavailable:true};}
}
export const getContentPages=cache(async()=>{const settings=await getSiteSettings();if(!Array.isArray(settings.contentPages))throw new Error('تعذر تحميل صفحات الموقع. حاول مجددًا لاحقًا.');return settings.contentPages.filter(page=>page.isPublished!==false);});
export const getContentPage=cache(async slug=>(await getContentPages()).find(page=>page.slug===slug)||null);
async function loadMarqueeItems(){return (await getSiteSettings()).aboutTags;}

async function loadYemeniCompanies(projection='*'){
 try{
  const db=serverDb(); if(!db)return yemeniCompanies.map(company=>({...company,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}));
  const data=await readProjection('yemeni_companies',projection,selected=>fetchAllRows(()=>db.from('yemeni_companies').select(selected,{count:'exact'}).eq('is_published',true).order('created_at',{ascending:false}).order('id')));
  return data.map(mapYemeniCompany);
 }catch(err){
  recordOperationalEvent('database_failure',{source:'companies'});
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
 }catch(err){recordOperationalEvent('database_failure',{source:'companies'});throw new Error('تعذر تحميل الشركة');}
 const demo=getDemoYemeniCompany(slug);
 return demo?{...demo,isDemo:true,imageUrl:'/images/yemeni-products-hero.png'}:null;
}

async function loadProfessionals(projection='*'){
 try{
  const db=serverDb(); if(!db)return demoProfessionals;
  const data=await readProjection('professionals',projection,selected=>fetchAllRows(()=>db.from('professionals').select(selected,{count:'exact'}).eq('is_published',true).order('created_at',{ascending:false}).order('id')));
  return data.map(mapProfessional);
 }catch(err){recordOperationalEvent('database_failure',{source:'professionals'});throw new Error('تعذر تحميل دليل المهنيين');}
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
 }catch(err){recordOperationalEvent('database_failure',{source:'professionals'});throw new Error('تعذر تحميل الملف المهني');}
 const demo=getDemoProfessional(slug);
 return demo||null;
}

const universityProjection='*,programs:university_programs(*),branches:university_branches(*),sources:university_sources(*)';
const medicalCenterProjection='*,specialties:medical_center_specialties(*),services:medical_center_services(*),hours:medical_center_hours(*),branches:medical_center_branches(*),sources:medical_center_sources(*)';
async function loadUniversities(projection=universityProjection){
 try{
  const db=serverDb();if(!db)return fallbackUniversities;
  const data=await fetchAllRows(()=>db.from('universities').select(projection,{count:'exact'}).eq('is_published',true).is('deleted_at',null).order('name_ar').order('id'));
  return data.map(mapUniversity);
 }catch(error){
  if(['42P01','PGRST205'].includes(error.code))return [];
  recordOperationalEvent('database_failure',{source:'universities'});throw new Error('تعذر تحميل دليل الجامعات والمعاهد.');
 }
}
async function loadUniversity(slug){
 try{
  const db=serverDb();if(!db)return fallbackUniversities.find(item=>item.id===slug)||null;
  const {data,error}=await db.from('universities').select(universityProjection).eq('slug',slug).eq('is_published',true).is('deleted_at',null).maybeSingle();
  if(error){if(['42P01','PGRST205'].includes(error.code))return null;throw error;}
  return data?mapUniversity(data):null;
 }catch(error){recordOperationalEvent('database_failure',{source:'universities'});throw new Error('تعذر تحميل المؤسسة التعليمية.');}
}
async function loadMedicalCenters(projection=medicalCenterProjection){
 try{
  const db=serverDb();if(!db)return fallbackMedicalCenters;
  const data=await fetchAllRows(()=>db.from('medical_centers').select(projection,{count:'exact'}).eq('is_published',true).is('deleted_at',null).order('name_ar').order('id'));
  return data.map(mapMedicalCenter);
 }catch(error){
  if(['42P01','PGRST205'].includes(error.code))return [];
  recordOperationalEvent('database_failure',{source:'medical_centers'});throw new Error('تعذر تحميل دليل المراكز الطبية.');
 }
}
async function loadMedicalCenter(slug){
 try{
  const db=serverDb();if(!db)return fallbackMedicalCenters.find(item=>item.id===slug)||null;
  const {data,error}=await db.from('medical_centers').select(medicalCenterProjection).eq('slug',slug).eq('is_published',true).is('deleted_at',null).maybeSingle();
  if(error){if(['42P01','PGRST205'].includes(error.code))return null;throw error;}
  return data?mapMedicalCenter(data):null;
 }catch(error){recordOperationalEvent('database_failure',{source:'medical_centers'});throw new Error('تعذر تحميل المركز الطبي.');}
}

async function loadYemeniFigures(projection='*'){
 try{
  const db=serverDb(); if(!db)return yemeniFiguresCatalog;
  const data=await readProjection('yemeni_figures',projection,selected=>fetchAllRows(()=>db.from('yemeni_figures').select(selected,{count:'exact'}).eq('is_published',true).order('display_order').order('full_name').order('id')));
  const stored=(data||[]).map(mapYemeniFigure);
  return stored;
 }catch(err){recordOperationalEvent('database_failure',{source:'figures'});throw new Error('تعذر تحميل دليل الشخصيات');}
}

async function loadYemeniFigure(slug){
 const db=serverDb();if(!db)return yemeniFiguresCatalog.find(item=>item.slug===slug)||null;
 const {data,error}=await db.from('yemeni_figures').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error)throw new Error('تعذر تحميل الشخصية.');if(!data)return null;
 return {...mapYemeniFigure(data),profile:await readFigureProfile(db,data)};
}

async function loadPublishedStatValues(db, indicatorIds) {
 if (!indicatorIds.length) return [];
 const data=await fetchAllRows(()=>db.from('stat_values')
  .select('*,source:stat_sources(id,name,publisher,url,is_active)',{count:'exact'})
  .in('indicator_id',indicatorIds).eq('is_published',true).eq('national_scope',true)
  .order('year',{ascending:true}).order('id'));
 // Inactive sources are withdrawn editorial material, including their values.
 return (data||[]).filter(value=>value.source?.is_active);
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
   recordOperationalEvent('database_failure',{source:'sections'});
   return getFallbackSections();
  }
  return (sectionResult.data||[]).map(section=>({
   ...section,
   domains:(domainResult.data||[]).filter(domain=>domain.section_id===section.id),
  }));
 }catch(err){recordOperationalEvent('database_failure',{source:'sections'});return getFallbackSections();}
}

async function loadStatIndicators(){
 try{
  const db=serverDb(); if(!db)return [];
  const data=await fetchAllRows(()=>db.from('stat_indicators')
   .select('*,domain:stat_domains(*,section:stat_sections(*)),adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)',{count:'exact'})
   .eq('is_published',true).order('updated_at',{ascending:false}).order('id'));
  const visible=(data||[]).filter(item=>(!item.hide_when_incomplete||item.data_status==='complete')&&item.domain?.is_published&&item.domain?.section?.is_published).map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return attachStatValues(visible,values);
 }catch(err){recordOperationalEvent('database_failure',{source:'indicators'});throw new Error('تعذر تحميل المؤشرات');}
}

async function loadStatDomain(slug){
 const fallback=getFallbackDomain(slug);
 try{
  const db=serverDb(); if(!db)return fallback?{...fallback,indicators:[]}:null;
  const {data:domain,error}=await db.from('stat_domains')
   .select('*,section:stat_sections(*)').eq('slug',slug).eq('is_published',true).maybeSingle();
  if(error){recordOperationalEvent('database_failure',{source:'indicators'});return fallback?{...fallback,indicators:[]}:null;}
  if(!domain||!domain.section?.is_published)return null;
  const indicators=await fetchAllRows(()=>db.from('stat_indicators')
   .select('*,adopted_source:stat_sources!stat_indicators_adopted_source_id_fkey(*)',{count:'exact'}).eq('domain_id',domain.id).eq('is_published',true)
   .order('name').order('id'));
  const visible=(indicators||[]).filter(item=>!item.hide_when_incomplete||item.data_status==='complete').map(item=>({...item,adopted_source:item.adopted_source?.is_active?item.adopted_source:null}));
  const values=await loadPublishedStatValues(db,visible.map(item=>item.id));
  return {...domain,indicators:attachStatValues(visible,values)};
 }catch(err){recordOperationalEvent('database_failure',{source:'indicators'});throw new Error('تعذر تحميل المجال');}
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
  if(sourcesResult.error)recordOperationalEvent('database_failure',{source:'indicators'});
  const publicSources=(sourcesResult.data||[]).filter(item=>item.source?.is_active);
  return {...normalizeIndicator({...data,adopted_source:data.adopted_source?.is_active?data.adopted_source:null},publicValues),sources:publicSources};
 }catch(err){recordOperationalEvent('database_failure',{source:'indicators'});throw new Error('تعذر تحميل المؤشر');}
}

async function loadTimelineIndicators(){
 return getStatIndicators();
}

const publicList=(section,load)=>cache(async(...args)=>{const settings=await getSiteSettings();if(!sectionIsVisible(section,settings.pageVisibility))return [];const rows=await load(...args);return section==='works'&&!sectionIsVisible('debates',settings.pageVisibility)?rows.filter(row=>!row.debate_id&&!row.debate_slug):rows;});
const publicItem=(section,load)=>cache(async(...args)=>sectionIsVisible(section,(await getSiteSettings()).pageVisibility)?load(...args):null);
export const getWorks = publicList('works',loadWorks);
export const getIssues = publicList('magazine',loadIssues);
export const getIssue = publicItem('magazine',loadIssue);
export const getSiteSettings = cache(loadSiteSettings);
export const getMarqueeItems = cache(loadMarqueeItems);
export const getYemeniCompanies = publicList('products',loadYemeniCompanies);
export const getYemeniCompany = publicItem('products',loadYemeniCompany);
export const getProfessionals = publicList('professionals',loadProfessionals);
export const getProfessional = publicItem('professionals',loadProfessional);
export const getUniversities = publicList('universities',loadUniversities);
export const getUniversity = publicItem('universities',loadUniversity);
export const getMedicalCenters = publicList('medicalCenters',loadMedicalCenters);
export const getMedicalCenter = publicItem('medicalCenters',loadMedicalCenter);
export const getYemeniFigures = publicList('figures',loadYemeniFigures);
export const getYemeniFigure = publicItem('figures',loadYemeniFigure);
export const getStatSections = publicList('statistics',loadStatSections);
export const getStatIndicators = publicList('statistics',loadStatIndicators);
export const getStatDomain = publicItem('statistics',loadStatDomain);
export const getStatIndicator = publicItem('statistics',loadStatIndicator);
export const getTimelineIndicators = cache(loadTimelineIndicators);
