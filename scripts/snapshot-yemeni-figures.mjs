// Private local baseline for the requested editorial expansion; never prints keys.
import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {fetchAllRows} from '../lib/pagination.js';
import {readFigureProfile} from '../lib/figureProfileRepository.js';
import {createTimedFetch} from '../lib/requestSecurity.js';
import path from 'node:path';
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--output'))throw Error('Use --output <private-baseline-path>.');
const output=args[1]||'.audit-tools/figures-expansion/live-baseline.json';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:createTimedFetch(30000)}});
const rows=await fetchAllRows(()=>db.from('yemeni_figures').select('*',{count:'exact'}).order('id'));
const {data:editors,error}=await db.from('editors').select('user_id,role').eq('role','management');if(error)throw error;
const entries=[];
for(let i=0;i<rows.length;i+=5){await Promise.all(rows.slice(i,i+5).map(async record=>{entries.push({record,profile:await readFigureProfile(db,record)});}));console.log('Read '+Math.min(i+5,rows.length)+'/'+rows.length);}
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({readAt:new Date().toISOString(),managementActorIds:editors.map(e=>e.user_id),entries},null,2)+'\n');
console.log(JSON.stringify({figures:rows.length,published:rows.filter(x=>x.is_published).length,profiles:entries.filter(x=>x.profile).length,managementActors:editors.length}));
