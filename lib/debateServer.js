import 'server-only';
import {cache} from 'react';
import {getSiteSettings} from './data';
import {sectionIsVisible} from './pageVisibility';
import {publicDb} from './supabase';
import {recordOperationalEvent} from './operationalEvents';
// Never use the service role for public debates; publication filtering and
// redaction also happen in Postgres, rather than depending on React rendering.
export const getDebateCatalog=cache(async()=>{
 if(!sectionIsVisible('debates',(await getSiteSettings()).pageVisibility))return {debates:[],available:true};
 const db=publicDb();if(!db)return {debates:[],available:false};
 try{const {data,error}=await db.rpc('debate_catalog');if(error)recordOperationalEvent('database_failure',{source:'debates'});return {debates:error?[]:data||[],available:!error};}catch{recordOperationalEvent('database_failure',{source:'debates'});return {debates:[],available:false};}
});
export const getDebateDetail=cache(async slug=>{
 if(!sectionIsVisible('debates',(await getSiteSettings()).pageVisibility))return {debate:null,available:true};
 const db=publicDb();if(!db)return {debate:null,available:false};
 try{const {data,error}=await db.rpc('debate_detail',{p_slug:slug});if(error)recordOperationalEvent('database_failure',{source:'debates'});return {debate:error?null:data,available:!error};}catch{recordOperationalEvent('database_failure',{source:'debates'});return {debate:null,available:false};}
});
export const getDebateSpeaker=cache(async slug=>{
 if(!sectionIsVisible('debates',(await getSiteSettings()).pageVisibility))return {data:null,available:true};
 const db=publicDb();if(!db)return {data:null,available:false};
 try{const {data,error}=await db.rpc('debate_speaker_public',{p_slug:slug});if(error)recordOperationalEvent('database_failure',{source:'debates'});return {data:error?null:data,available:!error};}catch{recordOperationalEvent('database_failure',{source:'debates'});return {data:null,available:false};}
});
