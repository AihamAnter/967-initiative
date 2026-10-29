import 'server-only';
import {requireSchoolEditor,schoolStudioOverview,saveSchoolContent} from './schoolContentServer.js';
import {schoolStudioAnalytics} from './schoolStudioAnalytics.js';
import {RequestValidationError} from './requestSecurity.js';
export {schoolStudioOverview,saveSchoolContent};
export async function schoolAnalyticsReport(db,user){
 await requireSchoolEditor(db,user);
 const {data,error}=await db.from('school_stage_attempts')
  .select('course_slug,stage_index,status,score,questions,submission')
  .in('status',['passed','failed']).order('submitted_at',{ascending:false}).limit(3000);
 if(error)throw new RequestValidationError('تعذر حساب إحصاءات التعلم.',503);
 return schoolStudioAnalytics(data||[]);
}
