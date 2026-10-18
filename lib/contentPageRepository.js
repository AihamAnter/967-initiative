import {CONTENT_PAGE_KEYS,CONTENT_PAGES_KEY,resolveContentCatalog,mutateContentCatalog} from './contentPages.js';
import {RequestValidationError} from './requestSecurity.js';

export async function readContentCatalog(db){
 const {data,error}=await db.from('site_settings').select('key,value,updated_at').in('key',CONTENT_PAGE_KEYS);
 if(error)throw new RequestValidationError('تعذر تحميل الصفحات. تحقق من الاتصال وجدول إعدادات الموقع.',503);
 const row=(data||[]).find(item=>item.key===CONTENT_PAGES_KEY);
 let pages;try{pages=resolveContentCatalog(data||[]);}catch{throw new RequestValidationError('تعذر قراءة الصفحات المحفوظة. لا يمكن استبدالها حتى تُراجع بياناتها.',503);}
 return {pages,revision:row?.updated_at??null,exists:Boolean(row)};
}

export async function writeContentPage(db,{action,input,revision,role},clock=Date.now){
 if(revision!==null&&(typeof revision!=='string'||revision.length>50||!Number.isFinite(Date.parse(revision))))throw new RequestValidationError('نسخة الصفحات غير صالحة. أعد تحميل القائمة.');
 const current=await readContentCatalog(db);
 if(current.revision!==revision)throw new RequestValidationError('عُدّلت الصفحات في جلسة أخرى. أعد تحميل المحفوظ قبل الحفظ.',409);
 const stamp=new Date(Math.max(clock(),current.revision?Date.parse(current.revision)+1:0)).toISOString();
 const pages=mutateContentCatalog(current.pages,action,input,role,stamp);
 const payload={key:CONTENT_PAGES_KEY,value:{version:1,pages},updated_at:stamp};
 let query=current.exists?db.from('site_settings').update(payload).eq('key',CONTENT_PAGES_KEY).eq('updated_at',current.revision):db.from('site_settings').insert(payload);
 const {data,error}=await query.select('updated_at').maybeSingle();
 if(error?.code==='23505'||(!error&&!data))throw new RequestValidationError('حُفظت نسخة أحدث في جلسة أخرى. أعد تحميل القائمة قبل المحاولة.',409);
 if(error)throw new RequestValidationError('تعذر تأكيد حفظ الصفحة. أعد تحميل المحفوظ قبل المحاولة.',503);
 return {pages,revision:data.updated_at};
}
