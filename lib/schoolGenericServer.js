import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {schoolStaffPreview} from './schoolStageAccess.js';
import {publishedSchoolCatalog,publishedSchoolStages,publishedSchoolBank} from './schoolContentServer.js';
import {gradeSchoolChoice,publicSchoolChoice,SCHOOL_SLUG,SCHOOL_FIXED_SLUGS} from './schoolContent.js';
import {savedSchoolDraft} from './schoolDraft.js';
const TABLE='school_stage_attempts';
const fail=(text,status=400)=>{throw new RequestValidationError(text,status);};
async function courseState(db,user,slug){
 if(!SCHOOL_SLUG.test(slug)||SCHOOL_FIXED_SLUGS.includes(slug))fail('المسار غير موجود.',404);
 const courses=await publishedSchoolCatalog(db);
 const course=courses.find(c=>c.slug===slug);
 if(!course)fail('المسار غير منشور.',404);
 const stages=await publishedSchoolStages(db,slug);
 const {data:rows,error}=await db.from(TABLE).select('stage_index,status')
  .eq('user_id',user.id).eq('course_slug',slug).order('created_at',{ascending:false}).limit(1000);
 if(error)fail('تعذر قراءة تقدم المسار.',503);
 const completed=new Set((rows||[]).filter(r=>r.status==='passed').map(r=>r.stage_index));
 const next=stages.find(s=>!completed.has(s.index))?.index??null;
 return {course,stages,completed,next};
}
const publicAttempt=row=>({id:row.id,stage:row.stage_index,attemptNo:row.attempt_no,
 questions:publicSchoolChoice(row.questions),...savedSchoolDraft(row)});
export async function startGenericSchoolStage(db,user,slug,index){
 if(!Number.isInteger(index)||index<0||index>11)fail('اختر محطة صالحة.');
 const state=await courseState(db,user,slug);
 if(!state.stages.some(s=>s.index===index))fail('المحطة ليست متاحة.',404);
 const staff=await schoolStaffPreview(db,user);
 if(!staff&&state.next!==null&&index>state.next)fail('أكمل المحطات السابقة أولًا.',403);
 const {data:current,error:readError}=await db.from(TABLE)
  .select('id,stage_index,attempt_no,questions,created_at,draft,draft_version')
  .eq('user_id',user.id).eq('course_slug',slug).eq('stage_index',index).eq('status','active').maybeSingle();
 if(readError)fail('تعذر استعادة المحاولة.',503);
 if(current){
  if(Date.now()-Date.parse(current.created_at)<3600000)return publicAttempt(current);
  const {error}=await db.from(TABLE).update({status:'abandoned'})
   .eq('id',current.id).eq('user_id',user.id).eq('status','active');
  if(error)fail('تعذر استئناف المحاولة.',503);
 }
 const {count,error:limitError}=await db.from(TABLE).select('id',{head:true,count:'exact'})
  .eq('user_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
 if(limitError||count>=100)fail('بلغت الحد اليومي للمحاولات.',429);
 const {count:previous,error:counterError}=await db.from(TABLE).select('id',{head:true,count:'exact'})
  .eq('user_id',user.id).eq('course_slug',slug).eq('stage_index',index);
 if(counterError||previous>=100000)fail('تعذر تحديد رقم المحاولة.',503);
 const attemptNo=(previous||0)+1;
 const questions=await publishedSchoolBank(db,slug,index,attemptNo);
 const {data:created,error:insertError}=await db.from(TABLE)
  .insert({user_id:user.id,course_slug:slug,stage_index:index,attempt_no:attemptNo,questions})
  .select('id,stage_index,attempt_no,questions,draft,draft_version').single();
 if(insertError?.code==='23505')fail('محاولة جديدة مفتوحة في نافذة أخرى.',409);
 if(insertError||!created)fail('تعذر بدء المحطة.',503);
 return publicAttempt(created);
}
export async function finishGenericSchoolStage(db,user,slug,id,answers){
 if(!SCHOOL_SLUG.test(slug)||SCHOOL_FIXED_SLUGS.includes(slug)||typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))
  fail('المحاولة غير صالحة.');
 const {data:attempt,error:readError}=await db.from(TABLE)
  .select('id,stage_index,status,questions,submission')
  .eq('id',id).eq('course_slug',slug).eq('user_id',user.id).maybeSingle();
 if(readError)fail('تعذر تحميل المحاولة.',503);
 if(!attempt)fail('المحاولة غير موجودة.',404);
 if(attempt.status==='abandoned')fail('انتهت المحاولة.',409);
 if(attempt.status!=='active'){
  if(!Array.isArray(attempt.submission))fail('لا يمكن إعادة تقييم هذه المحاولة.',409);
  return {...gradeSchoolChoice(attempt.questions,attempt.submission),alreadySubmitted:true};
 }
 let result;try{result=gradeSchoolChoice(attempt.questions,answers);}catch{fail('أكمل الأسئلة بإجابات صالحة.');}
 const {data:saved,error:saveError}=await db.from(TABLE)
  .update({status:result.passed?'passed':'failed',score:result.score,submission:answers,submitted_at:new Date().toISOString()})
  .eq('id',id).eq('user_id',user.id).eq('course_slug',slug).eq('status','active').select('id').maybeSingle();
 if(saveError)fail('تعذر حفظ النتيجة؛ حاول مرة أخرى.',503);
 if(!saved)fail('أُرسلت المحاولة من نافذة أخرى.',409);
 return {...result,alreadySubmitted:false};
}
