import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {cache} from 'react';
import {publicDb} from './supabase';
import {fetchAllRows} from './pagination';

export const getSearchPlaces = cache(async()=>{
  const boundaries=JSON.parse(await readFile(path.join(process.cwd(),'public/data/yemen-map/yemen-boundaries.json'),'utf8'));
  const places=[...boundaries.governorates.map(x=>({...x,kind:'governorate'})),...boundaries.districts.map(x=>({...x,kind:'district'}))];
  const db=publicDb();
  if(!db)return {places,unavailable:[]};
  // Use the same anonymous access and public fields as the interactive map.
  const results=await Promise.allSettled([
    fetchAllRows(()=>db.from('governorates').select('id,capital,description,history,geography,landmarks,economy',{count:'exact'}).order('id')),
    fetchAllRows(()=>db.from('districts').select('id,capital,description,landmarks',{count:'exact'}).order('id')),
  ]);
  const profiles=new Map(results.flatMap(x=>x.status==='fulfilled'?x.value:[]).map(x=>[x.id,x]));
  return {places:places.map(x=>({...x,...profiles.get(x.id)})),unavailable:results.some(x=>x.status==='rejected')?['تفاصيل المناطق الجغرافية']:[]};
});
