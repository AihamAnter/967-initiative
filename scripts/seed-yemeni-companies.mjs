import {createClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {yemeniCompaniesCatalog} from '../lib/yemeniCompaniesCatalog.js';
import {prepareCompanyImport,insertCompanyCatalog} from '../lib/companyCatalogImport.js';
import {fetchAllRows} from '../lib/pagination.js';

const apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(arg=>!['--apply','--dry-run'].includes(arg)))throw new Error('Use --dry-run (default) or --apply.');
const {NEXT_PUBLIC_SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key}=process.env;
if(!url||!key)throw new Error('Supabase environment variables are missing.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const read=()=>fetchAllRows(()=>db.from('yemeni_companies').select('*',{count:'exact'}).order('id'));
const before=await read();
const snapshot=createHash('sha256').update(JSON.stringify(before)).digest('hex');
const plan=prepareCompanyImport(yemeniCompaniesCatalog,before);
const report={mode:apply?'apply':'dry-run',reviewedAt:'2026-10-19',catalogCompanies:yemeniCompaniesCatalog.length,catalogProducts:yemeniCompaniesCatalog.reduce((n,row)=>n+row.products.length,0),existingCompanies:before.length,insertCount:plan.pending.length,skipped:plan.skipped,existingSnapshotHash:snapshot};
if(!apply){console.log(JSON.stringify({...report,pending:plan.pending.map(row=>({slug:row.slug,name:row.name,products:row.products.map(product=>product.name)}))},null,2));}
else {
 const inserted=await insertCompanyCatalog(db,plan.pending);
 const after=await read();
 const unchanged=before.every(row=>isDeepStrictEqual(after.find(item=>item.id===row.id),row));
 const bySlug=new Map(after.map(row=>[row.slug,row]));
 const verified=inserted.every(row=>{const stored=bySlug.get(row.slug),expected=plan.pending.find(item=>item.slug===row.slug);return stored?.is_published===true&&!stored.is_demo&&stored.name===expected?.name&&isDeepStrictEqual(stored.products,expected.products);});
 const result={...report,inserted:inserted.map(row=>row.slug),insertedCount:inserted.length,afterCompanies:after.length,publishedCompanies:after.filter(row=>row.is_published&&!row.is_demo).length,existingRecordsUnchanged:unchanged,insertedRecordsVerified:verified,completedAt:new Date().toISOString()};
 await writeFile('docs/yemeni-companies-import-result.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 if(!unchanged||!verified)throw new Error('Post-insert verification needs review. Existing records were never updated by this script.');
}
