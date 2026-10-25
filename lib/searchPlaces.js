import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {cache} from 'react';
import {publicDb} from './supabase';
import {readPublicMapProfiles} from './mapProfileRepository';

export const getSearchPlaces = cache(async()=>{
  const boundaries=JSON.parse(await readFile(path.join(process.cwd(),'public/data/yemen-map/yemen-boundaries.json'),'utf8'));
  const places=[...boundaries.governorates.map(x=>({...x,kind:'governorate'})),...boundaries.districts.map(x=>({...x,kind:'district'}))];
  const db=publicDb();
  if(!db)return {places,unavailable:[]};
  // Use the same anonymous access and public fields as the interactive map.
  try{const profiles=await readPublicMapProfiles(db);return {places:places.map(x=>({...x,...profiles[x.id]})),unavailable:[]};}
  catch{return {places,unavailable:['تفاصيل المناطق الجغرافية']};}
});
