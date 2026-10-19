import {validateCompanySources} from './companySources.js';
import {safeExternalUrl} from './media.js';

export const companyIdentity=name=>String(name||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();

export function companyCatalogPayload(row){
 if(!row||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)||!row.name?.trim()||row.name.length>180||!row.category||!row.location||!row.summary)throw new Error('بيانات تعريف المنشأة غير صالحة: '+(row?.slug||''));
 if(!Array.isArray(row.products)||!row.products.length)throw new Error('منتجات المنشأة مطلوبة: '+row.slug);
 const products=row.products.map(product=>{
  if(!product.name?.trim()||!product.sources?.length)throw new Error('اسم المنتج ومصدره مطلوبان: '+row.slug);
  return {name:product.name.trim(),description:product.description||'',format:product.format||'',sources:validateCompanySources(product.sources)};
 });
 const payload={slug:row.slug,name:row.name.trim(),category:row.category,location:row.location,products,is_published:true,strengths:[],markets:[],image_url:null,image_position:'center',website:null,email:null,phone:null,google_maps_url:null};
 for(const field of ['legal_name','scale','entity_type','ownership','owner_name','ceo_name','founded','team_size','address','summary','story','impact'])payload[field]=row[field]||'';
 for(const field of ['website','email','phone'])if(row[field])payload[field]=row[field];
 if(payload.website&&!safeExternalUrl(payload.website))throw new Error('رابط منشأة غير صالح: '+row.slug);
 return payload;
}

export function prepareCompanyImport(catalog,existing=[]){
 const slugs=new Set(),identities=new Set();
 const payloads=catalog.map(row=>{
  const payload=companyCatalogPayload(row),identity=companyIdentity(payload.name);
  if(slugs.has(payload.slug)||identities.has(identity))throw new Error('منشأة مكررة في الدفعة: '+payload.slug);
  slugs.add(payload.slug);identities.add(identity);return payload;
 });
 const storedSlugs=new Set(existing.map(row=>row.slug)),storedNames=new Set(existing.map(row=>companyIdentity(row.name)));
 const skipped=payloads.filter(row=>storedSlugs.has(row.slug)||storedNames.has(companyIdentity(row.name)));
 return {pending:payloads.filter(row=>!skipped.includes(row)),skipped:skipped.map(row=>row.slug)};
}

export async function insertCompanyCatalog(db,pending){
 if(!pending.length)return [];
 // One atomic insert; slug conflicts are ignored, never overwritten or re-published.
 const {data,error}=await db.from('yemeni_companies').upsert(pending,{onConflict:'slug',ignoreDuplicates:true}).select('id,slug,name,is_published');
 if(error)throw new Error('تعذر تأكيد إضافة السجلات: '+error.message);
 return data||[];
}
