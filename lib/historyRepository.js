import {historyStarter,historyEras,historyKinds} from './yemenHistory.js';
import {RequestValidationError} from './requestSecurity.js';

export const HISTORY_CATALOG_KEY='yemen_history_catalog_v1';
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const validSlug=slug=>typeof slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=90;
const validUrl=url=>{try{const value=new URL(url);return ['https:','http:'].includes(value.protocol)&&!value.username&&!value.password&&url.length<=800;}catch{return false;}};

export function validateHistoryEntry(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!validSlug(input.slug))throw new RequestValidationError('رابط المادة التاريخية غير صالح.');
 if(!Object.hasOwn(historyKinds,input.kind)||!historyEras.some(e=>e.id===input.era))throw new RequestValidationError('اختر نوع المادة والعصر التاريخي.');
 const title=text(input.title,160),period=text(input.period,180),summary=text(input.summary,700);
 if(!title||!period||summary.length<25||String(input.title).length>160||String(input.summary).length>700)throw new RequestValidationError('العنوان والمدة والملخص مطلوبة ضمن الحدود.');
 const year=Number(input.year);
 if(!Number.isInteger(year)||year< -30000||year>2100)throw new RequestValidationError('سنة بداية المادة غير صالحة؛ السالب يعني قبل الميلاد.');
 if(!Array.isArray(input.paragraphs)||input.paragraphs.length<1||input.paragraphs.length>12)throw new RequestValidationError('أضف فقرة واحدة على الأقل (12 فقرة كحد أقصى).');
 const paragraphs=input.paragraphs.map(x=>text(x,3000));
 if(paragraphs.some((x,i)=>!x||x.length!==String(input.paragraphs[i]).trim().length))throw new RequestValidationError('تحقق من طول فقرات المادة.');
 if(!Array.isArray(input.sources)||input.sources.length<1||input.sources.length>12)throw new RequestValidationError('أضف مصدراً موثقاً واحداً على الأقل.');
 const sources=input.sources.map(x=>({title:text(x?.title,200),url:text(x?.url,800)}));
 if(sources.some(x=>!x.title||!validUrl(x.url)))throw new RequestValidationError('عنوان أو رابط أحد المصادر غير صالح.');
 const related=Array.isArray(input.related)?[...new Set(input.related)].slice(0,24):[];
 if(related.some(x=>!validSlug(x)||x===input.slug))throw new RequestValidationError('روابط المواد ذات الصلة غير صالحة.');
 const governorate=text(input.governorate,10);
 if(governorate&&!/^YE\d{2}$/.test(governorate))throw new RequestValidationError('معرّف المحافظة غير صحيح.');
 if(typeof input.isPublished!=='boolean')throw new RequestValidationError('حدد حالة النشر بشكل صريح.');
 return {slug:input.slug,title,kind:input.kind,era:input.era,year,period,summary,paragraphs,sources,related,location:text(input.location,120),governorate,figureQuery:text(input.figureQuery,120),certainty:text(input.certainty,150),isPublished:input.isPublished};
}
export function mergeHistoryCatalog(overrides=[]){
 if(!Array.isArray(overrides))throw new RequestValidationError('نسخة تاريخ اليمن المحفوظة غير صالحة.',503);
 const results=new Map(historyStarter.map(entry=>[entry.slug,entry]));
 for(const override of overrides){const item=validateHistoryEntry(override);results.set(item.slug,item);}
 return [...results.values()].sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title,'ar'));
}
export function parseHistoryCatalog(row){
 if(!row)return [];
 if(row.value?.version!==1||!Array.isArray(row.value.entries)||row.value.entries.length>150)throw new RequestValidationError('تعذر قراءة أرشيف تاريخ اليمن. لم يُستبدل المحتوى.',503);
 return row.value.entries.map(validateHistoryEntry);
}
export async function readHistoryCatalog(db){
 if(!db)return {entries:mergeHistoryCatalog(),overrides:[],revision:null,exists:false,available:false};
 const {data,error}=await db.from('site_settings').select('key,value,updated_at').eq('key',HISTORY_CATALOG_KEY).maybeSingle();
 if(error)throw new RequestValidationError('تعذر تحميل أرشيف تاريخ اليمن.',503);
 const overrides=parseHistoryCatalog(data);
 return {entries:mergeHistoryCatalog(overrides),overrides,revision:data?.updated_at||null,exists:!!data,available:true};
}
export async function writeHistoryEntry(db,{action,entry,slug,revision,actorId,role}){
 if(!db)throw new RequestValidationError('خدمة التحرير غير مهيأة.',503);
 if(!actorId||!['admin','management'].includes(role))throw new RequestValidationError('صلاحية التحرير غير متوفرة.',403);
 if(revision!==null&&(typeof revision!=='string'||revision.length>60||!Number.isFinite(Date.parse(revision))))throw new RequestValidationError('نسخة الأرشيف غير صالحة.');
 const current=await readHistoryCatalog(db);
 if(revision!==current.revision)throw new RequestValidationError('حُفظت نسخة أحدث. أعد تحميل الأرشيف قبل تعديل المادة.',409);
 const overrides=new Map(current.overrides.map(x=>[x.slug,x]));
 if(action==='save'){
  const item=validateHistoryEntry(entry);
  if(!overrides.has(item.slug)&&current.overrides.length>=140)throw new RequestValidationError('وصل الأرشيف إلى الحد المتاح.',409);
  overrides.set(item.slug,item);
 }else if(action==='delete'){
  if(role!=='management')throw new RequestValidationError('حذف المواد متاح لحساب الإدارة فقط.',403);
  if(!validSlug(slug))throw new RequestValidationError('رابط المادة غير صالح.');
  if(historyStarter.some(x=>x.slug===slug))throw new RequestValidationError('لا يمكن حذف المادة الأساسية؛ استخدم إخفاء النشر.',400);
  if(!overrides.has(slug))throw new RequestValidationError('المادة غير موجودة.',404);
  overrides.delete(slug);
 }else throw new RequestValidationError('عملية غير معروفة.');
 const stamp=new Date(Math.max(Date.now(),current.revision?Date.parse(current.revision)+1:0)).toISOString();
 const record={key:HISTORY_CATALOG_KEY,value:{version:1,entries:[...overrides.values()],editedBy:actorId,editedAt:stamp},updated_at:stamp};
 const query=current.exists?db.from('site_settings').update(record).eq('key',HISTORY_CATALOG_KEY).eq('updated_at',revision):db.from('site_settings').insert(record);
 const {data,error}=await query.select('updated_at').maybeSingle();
 if(error?.code==='23505'||error?.code==='40001'||(!error&&!data))throw new RequestValidationError('تعارض تحرير؛ أعد تحميل النسخة المنشورة.',409);
 if(error)throw new RequestValidationError('تعذر حفظ المادة. لم يتم تأكيد التحديث.',503);
 return {entries:mergeHistoryCatalog([...overrides.values()]),revision:data.updated_at};
}
