import {safeExternalUrl} from './media.js';
import {validEvidenceDate} from './contentEvidence.js';

const sourceTypes=new Set(['official-company','chamber-directory','government-directory','government-news','reference']);
const validDate=value=>validEvidenceDate(value);

export function normalizeCompanySources(input){
 if(!Array.isArray(input))return [];
 const seen=new Set();
 return input.flatMap(source=>{
  const url=safeExternalUrl(source?.url);
  if(!url||seen.has(url))return [];
  seen.add(url);
  return [{url,title:String(source.title||new URL(url).hostname).trim().slice(0,180),type:sourceTypes.has(source.type)?source.type:'reference',reviewedAt:validDate(source.reviewedAt)?source.reviewedAt:''}];
 }).slice(0,12);
}

export function validateCompanySources(input){
 if(!Array.isArray(input)||input.length>12)throw new Error('يمكن إضافة 12 مصدرًا كحد أقصى لكل منتج.');
 for(const source of input){
  if(!source||typeof source.title!=='string'||!source.title.trim()||source.title.length>180||!safeExternalUrl(source.url))throw new Error('اكتب اسم المصدر ورابط HTTP أو HTTPS صالحًا، أو احذف المصدر الفارغ.');
  if(source.reviewedAt&&!validDate(source.reviewedAt))throw new Error('تاريخ مراجعة المصدر غير صالح.');
 }
 return normalizeCompanySources(input);
}

export function companySources(products){
 return normalizeCompanySources((Array.isArray(products)?products:[]).flatMap(product=>normalizeCompanySources(product?.sources)));
}
