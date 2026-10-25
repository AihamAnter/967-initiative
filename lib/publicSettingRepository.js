import {RequestValidationError} from './requestSecurity.js';

export async function readPublicSetting(db,key){
 if(!db)throw new RequestValidationError('خدمة التحرير غير متاحة.',503);
 const {data,error}=await db.from('site_settings').select('key,value,updated_at').eq('key',key).maybeSingle();
 if(error)throw new RequestValidationError('تعذر تحميل المحفوظ. حاول مجددًا.',503);
 return {value:data?.value??null,revision:data?.updated_at??null};
}
// Compare-and-swap in a single SQL statement; never replace a concurrent edit.
export async function writePublicSetting(db,key,value,revision,clock=Date.now){
 if(revision!==null&&(typeof revision!=='string'||revision.length>50||!Number.isFinite(Date.parse(revision))))throw new RequestValidationError('نسخة المحفوظ غير صالحة. أعد تحميلها.');
 const stamp=new Date(Math.max(clock(),revision?Date.parse(revision)+1:0)).toISOString();
 const payload={key,value,updated_at:stamp};
 const query=revision===null?db.from('site_settings').insert(payload):db.from('site_settings').update({value,updated_at:stamp}).eq('key',key).eq('updated_at',revision);
 const {data,error}=await query.select('updated_at').maybeSingle();
 if(error?.code==='23505'||!error&&!data)throw new RequestValidationError('تغير المحفوظ في جلسة أخرى. أعد تحميله وراجع تعديلاتك قبل الحفظ.',409);
 if(error)throw new RequestValidationError('تعذر تأكيد الحفظ. أعد تحميل المحفوظ قبل المحاولة.',503);
 return {value,revision:data.updated_at};
}
