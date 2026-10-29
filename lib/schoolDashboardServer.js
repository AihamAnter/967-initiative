import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {SCHOOL_COURSE_SLUGS} from './schoolCatalog.js';
import {buildSchoolDashboard} from './schoolDashboard.js';
import {schoolStaffPreview} from './schoolStageAccess.js';

const TABLE='school_stage_attempts';
const PAGE_SIZE=500,MAX_PAGES=20;
async function learnerHistory(db,user){
 const records=[];
 // Read in pages so older passes are not silently discarded after 1000 rows.
 for(let page=0;page<MAX_PAGES;page++){
  const from=page*PAGE_SIZE;
  const {data,error}=await db.from(TABLE)
   .select('course_slug,stage_index,status,created_at,submitted_at')
   .eq('user_id',user.id)
   .in('course_slug',SCHOOL_COURSE_SLUGS)
   .order('created_at',{ascending:false})
   .range(from,from+PAGE_SIZE-1);
  if(error)throw new RequestValidationError('تعذر قراءة تقدمك التعليمي.',503);
  records.push(...(data||[]));
  if((data||[]).length<PAGE_SIZE)return records;
 }
 throw new RequestValidationError('تعذر عرض سجل التعلم الكامل حاليًا.',503);
}
export async function schoolDashboardOverview(db,user){
 if(!db||!user?.id)throw new RequestValidationError('يرجى تسجيل الدخول.',401);
 const [records,staffPreview]=await Promise.all([learnerHistory(db,user),schoolStaffPreview(db,user)]);
 return buildSchoolDashboard(records,staffPreview);
}
