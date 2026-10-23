import {resolveContributionReference} from './contributions.js';
export const MESSAGE_STATUSES={new:'جديدة',in_progress:'قيد المتابعة',resolved:'تمت المعالجة'};
export function messageStatus(message){return Object.hasOwn(MESSAGE_STATUSES,message?.status)?message.status:'new';}
export function messageContext(message=''){
 const boundary=message.indexOf('\n\n');if(boundary<0)return {body:message,reference:null};
 const lines=message.slice(0,boundary).split('\n');
 if(!lines[0]?.startsWith('مرجع الطلب: ')||!lines[1]?.startsWith('صفحة المرجع: '))return {body:message,reference:null};
 const reference=resolveContributionReference({referenceTitle:lines[0].slice('مرجع الطلب: '.length),referencePath:lines[1].slice('صفحة المرجع: '.length),referenceId:lines[2]?.startsWith('معرّف المرجع: ')?lines[2].slice('معرّف المرجع: '.length):''});
 return reference?{body:message.slice(boundary+2),reference}:{body:message,reference:null};
}
