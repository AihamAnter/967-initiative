import {CONTENT_PAGE_KEYS,CONTENT_PAGES_KEY,resolveContentCatalog,mutateContentCatalog} from './contentPages.js';
import {RequestValidationError} from './requestSecurity.js';

export async function readContentCatalog(db){
 const {data,error}=await db.from('site_settings').select('key,value,updated_at').in('key',CONTENT_PAGE_KEYS);
 if(error)throw new RequestValidationError('تعذر تحميل الصفحات. تحقق من الاتصال وجدول إعدادات الموقع.',503);
 const row=(data||[]).find(item=>item.key===CONTENT_PAGES_KEY);
 let pages;try{pages=resolveContentCatalog(data||[]);}catch{throw new RequestValidationError('تعذر قراءة الصفحات المحفوظة. لا يمكن استبدالها حتى تُراجع بياناتها.',503);}
 return {pages,revision:row?.updated_at??null,exists:Boolean(row)};
}

export async function writeContentPage(db,{action,input,revision,role,actorId},clock=Date.now){
 if(typeof actorId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId))throw new RequestValidationError('تعذر التحقق من مسؤول التعديل.',403);
 if(revision!==null&&(typeof revision!=='string'||revision.length>50||!Number.isFinite(Date.parse(revision))))throw new RequestValidationError('نسخة الصفحات غير صالحة. أعد تحميل القائمة.');
 const current=await readContentCatalog(db);
 if(current.revision!==revision)throw new RequestValidationError('عُدّلت الصفحات في جلسة أخرى. أعد تحميل المحفوظ قبل الحفظ.',409);
 const stamp=new Date(Math.max(clock(),current.revision?Date.parse(current.revision)+1:0)).toISOString();
 const pages=mutateContentCatalog(current.pages,action,input,role,stamp);
 const payload={key:CONTENT_PAGES_KEY,value:{version:1,pages},updated_at:stamp};
 const response=await db.rpc('inline_service_save',{p_kind:'page',p_id:CONTENT_PAGES_KEY,p_revision:current.revision,p_data:payload,p_actor:actorId,p_action:current.exists?'update':'create'}),data=response.data?.record,error=response.error;
 if(error?.code==='42501')throw new RequestValidationError('تغيرت صلاحية التحرير. أعد تسجيل الدخول قبل المحاولة.',403);
 if(['23505','40001'].includes(error?.code)||(!error&&!data))throw new RequestValidationError('حُفظت نسخة أحدث في جلسة أخرى. أعد تحميل القائمة قبل المحاولة.',409);
 if(error)throw new RequestValidationError('تعذر تأكيد حفظ الصفحة. أعد تحميل المحفوظ قبل المحاولة.',503);
 return {pages,revision:data.updated_at};
}
