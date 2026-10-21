import 'server-only';
import {cache} from 'react';
import {publicDb} from './supabase';
// Never use the service role for public debates; publication filtering and
// redaction also happen in Postgres, rather than depending on React rendering.
export const getDebateCatalog=cache(async()=>{
 const db=publicDb();if(!db)return {debates:[],available:false};
 try{const {data,error}=await db.rpc('debate_catalog');return {debates:error?[]:data||[],available:!error};}catch{return {debates:[],available:false};}
});
export const getDebateDetail=cache(async slug=>{
 const db=publicDb();if(!db)return {debate:null,available:false};
 try{const {data,error}=await db.rpc('debate_detail',{p_slug:slug});return {debate:error?null:data,available:!error};}catch{return {debate:null,available:false};}
});
export const getDebateSpeaker=cache(async slug=>{
 const db=publicDb();if(!db)return {data:null,available:false};
 try{const {data,error}=await db.rpc('debate_speaker_public',{p_slug:slug});return {data:error?null:data,available:!error};}catch{return {data:null,available:false};}
});
