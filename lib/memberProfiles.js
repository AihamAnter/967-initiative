import {RequestValidationError} from './requestSecurity.js';
import {UUID_RE} from './privateMessaging.js';

export const MEMBER_REPORT_REASONS={
 harassment:'مضايقة أو إساءة',
 spam:'رسائل أو أنشطة مزعجة',
 fraud:'احتيال أو خداع',
 impersonation:'انتحال شخصية',
 inappropriate:'محتوى غير مناسب',
 other:'سبب آخر'
};

export function validateMemberId(value){
 if(typeof value!=='string'||!UUID_RE.test(value))
  throw new RequestValidationError('رابط المستخدم غير صالح.',400);
 return value;
}

export function validateMemberReport(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.action!=='report')
  throw new RequestValidationError('طلب البلاغ غير صالح.',400);
 if(!Object.hasOwn(MEMBER_REPORT_REASONS,input.reason))
  throw new RequestValidationError('اختر سبب البلاغ.',400);
 const detail=typeof input.detail==='string'?input.detail.trim():'';
 if(detail.length<10||detail.length>1000)
  throw new RequestValidationError('اكتب تفاصيل البلاغ بين 10 و1000 حرف.',400);
 return {reason:input.reason,detail};
}

export function memberReportReference(n){
 const number=Number(n);
 return Number.isSafeInteger(number)&&number>0?'967-U'+String(number).padStart(6,'0'):'بلاغ حساب';
}

export function memberProfilePath(id){
 return UUID_RE.test(id||'')?'/members/'+encodeURIComponent(id):null;
}
