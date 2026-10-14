import 'server-only';
import {serverDb} from './supabase-server';
import {defaultMarqueeItems} from './config';
import {getDemoYemeniCompany, mapYemeniCompany, yemeniCompanies} from './yemeniProducts';
import {demoProfessionals, getDemoProfessional, mapProfessional} from './professionals';
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
