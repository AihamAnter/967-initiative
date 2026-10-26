import {safeExternalUrl} from './media.js';

const optional=value=>String(value??'').trim()||null;
const lines=value=>String(value||'').split(/\r?\n/).map(row=>row.trim()).filter(Boolean);

export function parseInstitutionSocialLinks(value){
 if(Array.isArray(value))return value;
 return lines(value).map((line,index)=>{
  const [label,url]=line.split('|').map(part=>part.trim());
  const href=url||label;
  if(!safeExternalUrl(href))throw Error(`رابط التواصل ${index+1} غير صالح.`);
  return {label:url?label:'',url:href};
 });
}

export function serializeInstitutionSocialLinks(value){
 return Array.isArray(value)?value.map(item=>typeof item==='string'?item:[item.label,item.url].filter(Boolean).join(' | ')).filter(Boolean).join('\n'):'';
}

function coordinate(value,min,max,label){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const number=Number(value);
 if(!Number.isFinite(number)||number<min||number>max)throw Error(`${label} غير صالح.`);
 return number;
}

export function directoryRecordPayload(kind,r,published,logoUrl){
 const medical=kind==='medical',slug=String(r.slug||'').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'');
 if(!String(r.name_ar||'').trim()||!String(r.stable_key||'').trim()||!slug||!r.institution_type||!r.ownership)throw Error('الاسم والمفتاح الثابت والرابط المختصر والنوع والجهة حقول إلزامية.');
 for(const field of ['map_url','website',medical?'booking_url':'registration_url'])if(r[field]&&!safeExternalUrl(r[field]))throw Error(`الرابط في حقل ${field} غير صالح.`);
 const data={
  stable_key:r.stable_key.trim(),slug,name_ar:r.name_ar.trim(),name_en:optional(r.name_en),institution_type:r.institution_type,ownership:r.ownership,
  summary:String(r.summary||'').trim(),governorate:optional(r.governorate),city:optional(r.city),district:optional(r.district),address:optional(r.address),
  latitude:coordinate(r.latitude,-90,90,'خط العرض'),longitude:coordinate(r.longitude,-180,180,'خط الطول'),map_url:optional(r.map_url),logo_url:logoUrl,
  website:optional(r.website),phone:optional(r.phone),email:optional(r.email),verification_status:r.verification_status,verified_at:optional(r.verified_at),
  is_published:published,social_links:parseInstitutionSocialLinks(r.social_links),
 };
 if(medical)Object.assign(data,{official_code:optional(r.official_code),operator_name:String(r.operator_name||'').trim(),emergency_phone:optional(r.emergency_phone),booking_url:optional(r.booking_url),emergency_available:r.emergency_available==='unknown'?null:r.emergency_available==='true',operating_status:r.operating_status,operating_status_as_of:optional(r.operating_status_as_of),facility_presence:String(r.facility_presence||'').trim(),care_level:String(r.care_level||'').trim(),access_status:String(r.access_status||'').trim(),building_status:String(r.building_status||'').trim(),equipment_status:String(r.equipment_status||'').trim()});
 else Object.assign(data,{founded_year:r.founded_year===''?null:Number(r.founded_year),admission_info:String(r.admission_info||'').trim(),tuition_info:String(r.tuition_info||'').trim(),tuition_as_of:optional(r.tuition_as_of),registration_url:optional(r.registration_url),languages:lines(r.languages),study_modes:lines(r.study_modes),education_levels:lines(r.education_levels),accreditation_status:r.accreditation_status,accrediting_body:String(r.accrediting_body||'').trim(),operating_status:r.operating_status});
 return data;
}
