import {RequestValidationError} from './requestSecurity.js';
import {UUID_RE} from './privateMessaging.js';

export const REPORT_THREAD_PAGE_SIZE=40;

export function reportReference(number){
 const value=Number(number);
 return Number.isSafeInteger(value)&&value>0?'967-R'+String(value).padStart(6,'0'):'بلاغ غير مرقّم';
}

export function reportBefore(value){
 if(!value)return null;
 if(typeof value!=='string'||!/^(?:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)$/.test(value)||!Number.isFinite(Date.parse(value)))
  throw new RequestValidationError('موضع تحميل المحادثة غير صالح.',400);
 return value;
}

export function reportParties(report,conversation,names=new Map()){
 if(!report||!conversation||!UUID_RE.test(report.reporter_id||'')||
   ![conversation.user_low,conversation.user_high].includes(report.reporter_id))return null;
 const opposite=conversation.user_low===report.reporter_id?conversation.user_high:conversation.user_low;
 const person=id=>({id,name:names.get(id)||'مستخدم 967'});
 return {
  ...report,
  reference:reportReference(report.report_number),
  reporter:person(report.reporter_id),
  reported:person(opposite),
  subject_type:report.message_id?'رسالة خاصة':'طلب محادثة',
  participants:[person(conversation.user_low),person(conversation.user_high)],
 };
}
