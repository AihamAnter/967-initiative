import {initialDebate} from './debates.js';

// Both editors share normalization. Existing records send changed fields plus
// the API's required identity fields; unchanged polls/options stay untouched.
// The database revision prevents this patch overwriting newer edits.
export function debateSaveData(form,reason='',original=null){
 const data=Object.fromEntries(Object.keys(initialDebate()).map(key=>[key,form[key]]));
 data.axes=(data.axes||[]).map(axis=>axis.trim()).filter(Boolean);
 for(const key of ['participants','options'])data[key]=(data[key]||[]).map((value,position)=>({...value,position}));
 if(original){
  const previous=debateSaveData(original);
  for(const key of Object.keys(data))if(!['title','question','slug'].includes(key)&&JSON.stringify(data[key])===JSON.stringify(previous[key]))delete data[key];
 }
 if(reason.trim())data.reason=reason.trim();
 return data;
}
export function validateDebateAxes(value){
 const axes=value.split(/\r?\n/).map(axis=>axis.trim()).filter(Boolean);
 if(axes.length>20)return 'يمكن إضافة 20 محوراً كحد أقصى.';
 if(axes.some(axis=>axis.length>500))return 'يجب ألا يتجاوز المحور الواحد 500 حرف.';
}
export const debateTimeInput=value=>{if(!value)return '';const date=new Date(value);return new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,-1);};
export const debateTimeValue=value=>value?new Date(value).toISOString():null;
export function validateDebateStage(value,form){
 if(form.recording_published&&!['ended','recording_available'].includes(value))return 'اختر مرحلة «التسجيل متاح» عند إتاحة التسجيل.';
 if(value==='recording_available'&&!form.recording_published)return 'فعّل إتاحة التسجيل أو اختر مرحلة أخرى.';
 if(form.summary_published&&!['ended','recording_available'].includes(value))return 'لا يمكن نشر الملخص قبل انتهاء المناظرة أو إتاحة التسجيل.';
}
