import {safeExternalUrl,safeImageUrl} from './media.js';
import {RequestValidationError} from './requestSecurity.js';
import {validEvidenceDate} from './contentEvidence.js';
export const FIGURE_PROFILE_BUCKET='figure-profiles';
export const FIGURE_PROFILE_MAX_BYTES=500000;
const fail=message=>{throw new RequestValidationError(message);};
const text=(value,max,label,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('حقل '+label+' غير صالح.');return value.trim();};
const url=(value,required=false)=>{if(!value&&!required)return '';const clean=safeExternalUrl(value);if(!clean)fail('رابط المصدر أو الصورة غير صالح.');return clean;};
const year=value=>{if(value===null||value===''||value===undefined)return null;if(typeof value==='string'&&/^-?\d{1,4}$/.test(value))value=Number(value);if(!Number.isInteger(value)||value< -3000||value>2100)fail('سنة المحطة غير صالحة.');return value;};
const date=value=>{if(!value)return '';if(!validEvidenceDate(value))fail('تاريخ المراجعة غير صالح أو في المستقبل.');return value;};
export function emptyFigureProfile(){return {version:1,historicity:'documented',reviewedAt:'',sections:[],facts:[],timeline:[],works:[],gallery:[],sources:[],notes:[],license:null};}
export function validateFigureProfile(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)fail('بيانات السيرة الموسعة غير صالحة.');
 const collection=(key,max,parse)=>{if(!Array.isArray(input[key])||input[key].length>max)fail('قائمة '+key+' غير صالحة.');const seen=new Set();return input[key].map(row=>{if(!row||typeof row!=='object'||typeof row.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.id)||seen.has(row.id))fail('معرّف عنصر مكرر أو غير صالح.');seen.add(row.id);return {id:row.id,...parse(row)};});};
 const sources=collection('sources',80,row=>({title:text(row.title,250,'اسم المصدر',true),url:url(row.url,true),publisher:text(row.publisher||'',200,'الجهة الناشرة'),accessedAt:date(row.accessedAt),license:text(row.license||'',100,'الرخصة'),licenseUrl:url(row.licenseUrl),revisionUrl:url(row.revisionUrl)}));
 const sourceIds=new Set(sources.map(row=>row.id));
 const references=row=>{if(!Array.isArray(row.sourceIds)||row.sourceIds.length>15||row.sourceIds.some(id=>!sourceIds.has(id)))fail('مرجع عنصر السيرة غير موجود.');return [...new Set(row.sourceIds)];};
 const sections=collection('sections',35,row=>{if(!Array.isArray(row.paragraphs)||row.paragraphs.length>80)fail('فقرات السيرة غير صالحة.');return {title:text(row.title,180,'عنوان القسم',true),paragraphs:row.paragraphs.map(value=>text(value,15000,'فقرة',true)),sourceIds:references(row)};});
 const facts=collection('facts',45,row=>({label:text(row.label,120,'عنوان المعلومة',true),value:text(row.value,2500,'المعلومة',true),sourceIds:references(row)}));
 const timeline=collection('timeline',100,row=>({year:year(row.year),dateLabel:text(row.dateLabel||'',150,'وصف التاريخ'),title:text(row.title,250,'عنوان المحطة',true),description:text(row.description||'',5000,'شرح المحطة'),sourceIds:references(row)}));
 const works=collection('works',100,row=>({title:text(row.title,300,'عنوان العمل',true),kind:text(row.kind||'',100,'نوع العمل'),year:year(row.year),description:text(row.description||'',4000,'وصف العمل'),url:url(row.url),sourceIds:references(row)}));
 const gallery=collection('gallery',30,row=>({url:safeImageUrl(row.url)||fail('رابط الصورة غير صالح.'),alt:text(row.alt,350,'وصف الصورة',true),caption:text(row.caption||'',1200,'تعليق الصورة'),kind:['portrait','context','artwork','document'].includes(row.kind)?row.kind:'context',credit:text(row.credit||'',1500,'صاحب الصورة'),license:text(row.license||'',120,'ترخيص الصورة',true),licenseUrl:url(row.licenseUrl),sourceUrl:url(row.sourceUrl,true),sourceIds:references(row)}));
 if(!Array.isArray(input.notes)||input.notes.length>25)fail('ملاحظات السيرة غير صالحة.');
 const notes=input.notes.map(value=>text(value,5000,'ملاحظة',true));
 const license=input.license?{name:text(input.license.name,150,'اسم رخصة النص',true),url:url(input.license.url,true),attribution:text(input.license.attribution,2000,'نسب النص',true),sourceUrl:url(input.license.sourceUrl,true),revisionUrl:url(input.license.revisionUrl)}:null;
 const profile={version:1,historicity:['documented','traditional','disputed'].includes(input.historicity)?input.historicity:'documented',reviewedAt:date(input.reviewedAt),sections,facts,timeline,works,gallery,sources,notes,license};
 if(new TextEncoder().encode(JSON.stringify(profile)).byteLength>FIGURE_PROFILE_MAX_BYTES)fail('ملف السيرة أكبر من الحجم المسموح.');
 return profile;
}
export function figureProfilePath(record){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record?.id||'')||!Number.isFinite(Date.parse(record?.updated_at)))fail('نسخة ملف الشخصية غير صالحة.');
 return record.id+'/'+Date.parse(record.updated_at)+'.json';
}
export function figureBiographyText(profile){return profile.sections.flatMap(section=>[section.title,...section.paragraphs]).join('\n\n');}
