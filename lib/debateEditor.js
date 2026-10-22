import {initialDebate} from './debates.js';

// The full editor and the inline form send the same known-field snapshot.
// The database revision prevents this snapshot overwriting newer edits.
export function debateSaveData(form,reason=''){
 const data=Object.fromEntries(Object.keys(initialDebate()).map(key=>[key,form[key]]));
 data.axes=(data.axes||[]).map(axis=>axis.trim()).filter(Boolean);
 for(const key of ['participants','options'])data[key]=(data[key]||[]).map((value,position)=>({...value,position}));
 if(reason.trim())data.reason=reason.trim();
 return data;
}
export const debateTimeInput=value=>{if(!value)return '';const date=new Date(value);return new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,-1);};
export const debateTimeValue=value=>value?new Date(value).toISOString():null;
export function validateDebateStage(value,form){
 if(form.recording_published&&!['ended','recording_available'].includes(value))return 'اختر مرحلة «التسجيل متاح» عند إتاحة التسجيل.';
 if(value==='recording_available'&&!form.recording_published)return 'فعّل إتاحة التسجيل أو اختر مرحلة أخرى.';
 if(form.summary_published&&!['ended','recording_available'].includes(value))return 'لا يمكن نشر الملخص قبل انتهاء المناظرة أو إتاحة التسجيل.';
}
