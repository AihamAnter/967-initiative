import {publicDb} from './supabase';
import {defaultMarqueeItems} from './config';
export async function getWorks(){
 const db=publicDb(); if(!db)return [];
 const {data,error}=await db.from('works').select('*').eq('is_published',true).order('published_at',{ascending:false});
 if(error){console.error('works:',error.message);return [];} return data||[];
}
export async function getIssues(){
 const db=publicDb(); if(!db)return [];
 const {data,error}=await db.from('issues').select('*').eq('is_published',true).order('issue_date',{ascending:false}).order('number',{ascending:false});
 if(error){console.error('issues:',error.message);return [];}return data||[];
}
export async function getIssue(slug){
 if(slug==='demo') return (await import('./config')).demoIssue;
 const db=publicDb(); if(!db)return null;
 const {data,error}=await db.from('issues').select('*').eq('slug',slug).eq('is_published',true).maybeSingle();
 if(error){console.error('issue:',error.message);return null;}return data;
}
export async function getMarqueeItems(){
 try{
  const db=publicDb(); if(!db)return defaultMarqueeItems;
  const {data,error}=await db.from('site_settings').select('value').eq('key','home_marquee_items').maybeSingle();
  if(error){console.error('marquee:',error.message);return defaultMarqueeItems;}
  return Array.isArray(data?.value)&&data.value.length?data.value:defaultMarqueeItems;
 }catch(err){
  console.error('marquee:',err?.message||err);
  return defaultMarqueeItems;
 }
}
