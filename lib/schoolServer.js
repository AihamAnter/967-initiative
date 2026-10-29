import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {MUSNAD_STAGES,musnadPublicProgress,musnadStage} from './schoolMusnad.js';
import {makeSchoolQuestions,publicSchoolQuestions,gradeSchoolQuestions} from './schoolMusnadQuestions.js';
const TABLE='school_stage_attempts';
const fail=(message,status=400)=>{throw new RequestValidationError(message,status);};
export async function schoolUser(request,db){
 if(!db)fail('خدمة التعلم غير متاحة الآن.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)fail('سجّل الدخول لبدء الدروس وحفظ التقدم.',401);
 const {data,error}=await db.auth.getUser(token);
 if(error||!data?.user||data.user.is_anonymous)fail('يرجى تسجيل الدخول مجددًا.',401);
 return data.user;
}
async function history(db,user){
 const {data,error}=await db.from(TABLE).select('stage_index,status,score,attempt_no').eq('user_id',user.id).eq('course_slug','musnad').order('created_at',{ascending:false}).limit(1000);
 if(error)fail('تعذر تحميل تقدمك الدراسي.',503);
 return data||[];
}
export async function schoolOverview(db,user){
 const records=await history(db,user),progress=musnadPublicProgress(records);
 const stages=MUSNAD_STAGES.map(s=>{
  const own=records.filter(x=>x.stage_index===s.index);
  return {index:s.index,completed:progress.completed.includes(s.index),locked:s.index>progress.unlocked,
   attempts:own.filter(x=>x.status!=='abandoned').length,best:Math.max(0,...own.map(x=>x.score||0))};
 });
 return {course:'musnad',progress:{...progress,stages}};
}
const publicAttempt=row=>({id:row.id,stage:row.stage_index,attemptNo:row.attempt_no,questions:publicSchoolQuestions(row.questions)});
export async function startSchoolStage(db,user,index){
 if(!musnadStage(index))fail('المرحلة غير موجودة.',404);
 const records=await history(db,user);
 if(index>musnadPublicProgress(records).unlocked)fail('أكمل المرحلة السابقة أولًا.',403);
 const {data:existing,error:e}=await db.from(TABLE).select('id,stage_index,attempt_no,questions,created_at').eq('user_id',user.id).eq('course_slug','musnad').eq('stage_index',index).eq('status','active').maybeSingle();
 if(e)fail('تعذر استعادة محاولتك.',503);
 if(existing){
  if(Date.now()-Date.parse(existing.created_at)<3600000)return publicAttempt(existing);
  const {error}=await db.from(TABLE).update({status:'abandoned'}).eq('id',existing.id).eq('user_id',user.id).eq('status','active');
  if(error)fail('تعذر تجديد المحاولة.',503);
 }
 const {count,error:limitError}=await db.from(TABLE).select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
 if(limitError)fail('تعذر التحقق من المحاولات.',503);
 if(count>=100)fail('بلغت الحد اليومي للمحاولات. جرّب غدًا.',429);
 const {count:previous,error:countError}=await db.from(TABLE).select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('course_slug','musnad').eq('stage_index',index);
 if(countError)fail('تعذر تجهيز المحاولة.',503);
 const attemptNo=(previous||0)+1;
 const {data:row,error}=await db.from(TABLE).insert({user_id:user.id,course_slug:'musnad',stage_index:index,attempt_no:attemptNo,questions:makeSchoolQuestions(index,attemptNo)}).select('id,stage_index,attempt_no,questions').single();
 if(error?.code==='23505')fail('توجد محاولة بدأت في نافذة أخرى. حدّث الصفحة.',409);
 if(error||!row)fail('تعذر بدء المرحلة.',503);
 return publicAttempt(row);
}
export async function finishSchoolStage(db,user,id,answers){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))fail('المحاولة غير صالحة.');
 const {data:row,error:e}=await db.from(TABLE).select('id,stage_index,status,questions,submission').eq('id',id).eq('user_id',user.id).eq('course_slug','musnad').maybeSingle();
 if(e)fail('تعذر تحميل المحاولة.',503);
 if(!row)fail('المحاولة غير موجودة.',404);
 if(row.status==='abandoned')fail('انتهت هذه المحاولة. ابدأ من جديد.',409);
 if(row.status!=='active')return {stage:row.stage_index,...gradeSchoolQuestions(row.questions,row.submission),alreadySubmitted:true,progress:await schoolOverview(db,user)};
 let result;
 try{result=gradeSchoolQuestions(row.questions,answers);}catch{fail('أكمل جميع الأسئلة بإجابات صالحة.');}
 const {data:saved,error}=await db.from(TABLE).update({status:result.passed?'passed':'failed',score:result.score,submission:answers,submitted_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).eq('status','active').select('id').maybeSingle();
 if(error)fail('تعذر حفظ نتيجتك. حاول مجددًا.',503);
 if(!saved)fail('تم إرسال المحاولة في نافذة أخرى.',409);
 return {stage:row.stage_index,...result,alreadySubmitted:false,progress:await schoolOverview(db,user)};
}
