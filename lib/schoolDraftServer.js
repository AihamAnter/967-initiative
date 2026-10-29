import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {validateSchoolDraft} from './schoolDraft.js';
import {SCHOOL_SLUG} from './schoolContent.js';
export async function saveSchoolDraft(db,user,course,attemptId,revision,draft){
 if(!SCHOOL_SLUG.test(course)||typeof attemptId!=='string'||!/^[a-f0-9-]{36}$/i.test(attemptId)||!Number.isSafeInteger(revision)||revision<1||revision>1000000000)
  throw new RequestValidationError('بيانات الحفظ غير صالحة.');
 const {data:row,error}=await db.from('school_stage_attempts').select('id,status,questions,draft_version').eq('id',attemptId).eq('user_id',user.id).eq('course_slug',course).maybeSingle();
 if(error)throw new RequestValidationError('تعذر تحميل المحاولة.',503);
 if(!row||row.status!=='active')throw new RequestValidationError('المحاولة غير نشطة.',409);
 let cleaned;
 try{cleaned=validateSchoolDraft(row.questions,draft);}catch{throw new RequestValidationError('بيانات الإجابات غير صالحة.');}
 if(revision<=Number(row.draft_version||0))return {saved:false,stale:true};
 const {data:saved,error:writeError}=await db.from('school_stage_attempts').update({draft:cleaned,draft_version:revision})
  .eq('id',attemptId).eq('user_id',user.id).eq('course_slug',course).eq('status','active').lt('draft_version',revision).select('id').maybeSingle();
 if(writeError)throw new RequestValidationError('تعذر حفظ التمرين.',503);
 return {saved:Boolean(saved),stale:!saved};
}
