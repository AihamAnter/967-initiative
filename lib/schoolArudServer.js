import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {ARUD_STAGES,arudProgress,arudStage} from './schoolArud.js';
import {makeArudQuestions,publicArudQuestions,gradeArudQuestions} from './schoolArudQuestions.js';
import {schoolStaffPreview} from './schoolStageAccess.js';
import {savedSchoolDraft} from './schoolDraft.js';
const TABLE='school_stage_attempts';
const COURSE='arud';
const invalid=(message,status=400)=>{throw new RequestValidationError(message,status);};
const canOpen=(stage,unlocked,staff)=>Number.isInteger(stage)&&stage>=0&&stage<ARUD_STAGES.length&&(staff||stage<=unlocked);

async function history(db,user){
 const {data,error}=await db.from(TABLE).select('stage_index,status,score,attempt_no').eq('user_id',user.id).eq('course_slug',COURSE).order('created_at',{ascending:false}).limit(1000);
 if(error)invalid('تعذر تحميل تقدمك في العروض.',503);
 return data||[];
}
export async function arudOverview(db,user){
 const [records,staffPreview]=await Promise.all([history(db,user),schoolStaffPreview(db,user)]);
 const progress=arudProgress(records);
 const stages=ARUD_STAGES.map(s=>{
  const attempts=records.filter(x=>x.stage_index===s.index);
  return {index:s.index,completed:progress.completed.includes(s.index),
   locked:!canOpen(s.index,progress.unlocked,staffPreview),
   attempts:attempts.filter(a=>a.status!=='abandoned').length,
   best:Math.max(0,...attempts.map(a=>a.score||0))};
 });
 return {course:COURSE,progress:{...progress,staffPreview,stages}};
}
function publicAttempt(row){return {id:row.id,stage:row.stage_index,attemptNo:row.attempt_no,questions:publicArudQuestions(row.questions),...savedSchoolDraft(row)};}
export async function startArudStage(db,user,index){
 if(!arudStage(index))invalid('المحطة غير موجودة.',404);
 const [records,staffPreview]=await Promise.all([history(db,user),schoolStaffPreview(db,user)]);
 if(!canOpen(index,arudProgress(records).unlocked,staffPreview))invalid('أكمل المحطة السابقة لفتح هذه المحطة.',403);
 const base=db.from(TABLE);
 const {data:existing,error:findError}=await base.select('id,stage_index,attempt_no,questions,created_at,draft,draft_version')
   .eq('user_id',user.id).eq('course_slug',COURSE).eq('stage_index',index).eq('status','active').maybeSingle();
 if(findError)invalid('تعذر استعادة محاولتك.',503);
 if(existing){
  if(Date.now()-Date.parse(existing.created_at)<3600000)return publicAttempt(existing);
  const {error:abandonError}=await db.from(TABLE).update({status:'abandoned'})
   .eq('id',existing.id).eq('user_id',user.id).eq('course_slug',COURSE).eq('status','active');
  if(abandonError)invalid('تعذر تجديد المحاولة.',503);
 }
 const {count,error:limitError}=await db.from(TABLE).select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
 if(limitError)invalid('تعذر التحقق من المحاولات.',503);
 if(count>=100)invalid('بلغت حد المحاولات اليومي. حاول غدًا.',429);
 const {count:previous,error:countError}=await db.from(TABLE).select('id',{head:true,count:'exact'})
   .eq('user_id',user.id).eq('course_slug',COURSE).eq('stage_index',index);
 if(countError||previous>=100000)invalid('تعذر بدء محاولة جديدة.',503);
 const attemptNo=(previous||0)+1;
 const {data:created,error:createError}=await db.from(TABLE)
  .insert({user_id:user.id,course_slug:COURSE,stage_index:index,attempt_no:attemptNo,questions:makeArudQuestions(index,attemptNo)})
  .select('id,stage_index,attempt_no,questions,draft,draft_version').single();
 if(createError?.code==='23505')invalid('بدأت محاولة في نافذة أخرى؛ حدّث الصفحة.',409);
 if(createError||!created)invalid('تعذر بدء المحطة.',503);
 return publicAttempt(created);
}
export async function finishArudStage(db,user,id,answers){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))invalid('رقم المحاولة غير صالح.');
 const {data:row,error:loadError}=await db.from(TABLE).select('id,stage_index,status,questions,submission')
  .eq('id',id).eq('user_id',user.id).eq('course_slug',COURSE).maybeSingle();
 if(loadError)invalid('تعذر تحميل المحاولة.',503);
 if(!row)invalid('لم نعثر على المحاولة.',404);
 if(row.status==='abandoned')invalid('انتهت صلاحية المحاولة. ابدأ من جديد.',409);
 if(row.status!=='active'){
  if(!Array.isArray(row.submission))invalid('لا يمكن إعادة تقييم هذه المحاولة.',409);
  return {stage:row.stage_index,...gradeArudQuestions(row.questions,row.submission),
   alreadySubmitted:true,progress:await arudOverview(db,user)};
 }
 let result;
 try{result=gradeArudQuestions(row.questions,answers);}catch{invalid('أكمل الأسئلة بإجابات صالحة قبل الإرسال.');}
 const {data:saved,error:saveError}=await db.from(TABLE)
  .update({status:result.passed?'passed':'failed',score:result.score,submission:answers,submitted_at:new Date().toISOString()})
  .eq('id',id).eq('user_id',user.id).eq('course_slug',COURSE).eq('status','active').select('id').maybeSingle();
 if(saveError)invalid('تعذر حفظ النتيجة. أعد إرسال المحاولة.',503);
 if(!saved)invalid('حُفظت هذه المحاولة بالفعل من نافذة أخرى.',409);
 return {stage:row.stage_index,...result,alreadySubmitted:false,progress:await arudOverview(db,user)};
}
