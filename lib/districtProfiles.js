import {safeExternalUrl,safeImageUrl} from './media.js';
import {RequestValidationError} from './requestSecurity.js';

export const DISTRICT_PROFILE_PREFIX='public_district_profile_v1_';
export const districtTextFields={capital:{label:'المركز الإداري',max:160},description:{label:'النبذة التعريفية',max:4000},history:{label:'نبذة تاريخية',max:6000},geography:{label:'الطبيعة والتضاريس',max:6000},economy:{label:'الاقتصاد وسبل العيش',max:6000},landmarks:{label:'المعالم والأنشطة',max:6000},image_url:{label:'رابط الصورة',max:2048},image_credit:{label:'نسب الصورة وترخيصها',max:1000},image_source_url:{label:'مصدر الصورة',max:2048}};
export const boundarySource={title:'OCHA / HDX — التقسيم الإداري لليمن (COD-AB)',url:'https://data.humdata.org/dataset/cod-ab-yem'};
export function validateDistrictProfile(input){
 const fail=message=>{throw new RequestValidationError(message);};
 const keys=[...Object.keys(districtTextFields),'area_km2','population','population_year','sources'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))fail('حقول ملف المديرية غير صالحة.');
 const value={};
 for(const [key,field] of Object.entries(districtTextFields)){const text=input[key]??'';if(typeof text!=='string'||text.length>field.max)fail('تحقق من حقل '+field.label+'.');value[key]=text.trim();}
 if(value.image_url&&!safeImageUrl(value.image_url))fail('رابط صورة المديرية غير صالح.');
 if(value.image_source_url&&!safeExternalUrl(value.image_source_url))fail('رابط مصدر الصورة غير صالح.');
 if(value.image_url&&(!value.image_credit||!value.image_source_url))fail('أضف صاحب الصورة وترخيصها ورابط مصدرها قبل نشرها.');
 for(const key of ['area_km2','population','population_year']){const number=input[key];value[key]=number===''||number===undefined||number===null?null:number;if(value[key]!==null&&(typeof number!=='number'||!Number.isFinite(number)||number<0))fail('تحقق من الأرقام. اترك المعلومة غير الموثقة فارغة.');}
 if(value.population!==null&&!Number.isSafeInteger(value.population))fail('عدد السكان يجب أن يكون عددًا صحيحًا.');
 if(value.area_km2!==null&&(value.area_km2<=0||value.area_km2>600000))fail('مساحة المديرية غير صالحة.');
 if(value.population_year!==null&&(!Number.isInteger(value.population_year)||value.population_year<1900||value.population_year>new Date().getUTCFullYear()))fail('سنة تعداد السكان غير صالحة.');
 if(value.population!==null&&value.population_year===null)fail('أضف سنة القياس عند إدخال عدد السكان.');
 if(value.population===null&&value.population_year!==null)fail('سنة السكان تتطلب قيمة سكانية موثقة.');
 if(!Array.isArray(input.sources)||input.sources.length>15)fail('يمكن إضافة حتى 15 مصدرًا للمديرية.');
 value.sources=input.sources.map(source=>{if(!source||typeof source.title!=='string'||!source.title.trim()||source.title.length>250||!safeExternalUrl(source.url))fail('أضف اسمًا ورابطًا صحيحًا لكل مصدر.');return {title:source.title.trim(),url:safeExternalUrl(source.url)};});
 if(!value.sources.length&&(['description','history','geography','economy','landmarks','capital'].some(key=>value[key])||value.population!==null||value.area_km2!==null))fail('أضف مصدرًا للمعلومات المنشورة عن المديرية.');
 return value;
}
export function buildDistrictProfile(region,base={},reviewed={}){
 const profile={};
 for(const key of Object.keys(districtTextFields))profile[key]=base[key]||reviewed[key]||'';
 profile.description=profile.description||`مديرية ${region.nameAr} إحدى مديريات محافظة ${region.governorateNameAr}. يحمل موقعها في التقسيم الإداري رمز ${region.pcode||region.id}.`;
 for(const key of ['area_km2','population','population_year'])profile[key]=base[key]??null;
 profile.sources=[boundarySource,...(reviewed.sources||[])];
 // Legacy photos have no recorded licence; keep them in the underlying record
 // for editors, and publish only attributed photographs in the expanded file.
 if(!profile.image_credit||!profile.image_source_url)profile.image_url='';
 return profile;
}
