import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const rows=[1,2].flatMap(n=>JSON.parse(readFileSync(`C:/Users/anter/967-initiative/data/rankings/descriptions-2026-11/output-${n}.json`,'utf8')));
let ok=0,bad=[];
for(const r of rows){const d=r.description;if(!d||d.length<400||d.length>3000||!d.includes('لماذا تهم المقارنة؟')||!d.includes('كيف تقرأ الترتيب؟')||!d.includes('حدود القراءة:')||/[\u0660-\u0669]/.test(d)){bad.push(r.slug);continue;}
const {error,count}=await db.from('ranking_indicators').update({description:d},{count:'exact'}).eq('slug',r.slug).eq('is_published',false);if(error||count!==1)bad.push(r.slug+':'+(error?.message||count));else ok++;}
console.log('written',ok,'bad',bad);
