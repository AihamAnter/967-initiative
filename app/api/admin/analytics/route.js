import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {RequestValidationError} from '@/lib/requestSecurity';
import {usageOverview,schoolLearningOverview} from '@/lib/siteAnalytics';
import {schoolStudioAnalytics} from '@/lib/schoolStudioAnalytics';
import {SCHOOL_COURSES} from '@/lib/schoolCatalog';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'}});

export async function GET(request){
 try{
  const db=serverDb();
  await authorizeEditorRequest(request,db);
  const raw=new URL(request.url).searchParams.get('days')||'30';
  if(!['7','30','90'].includes(raw))throw new RequestValidationError('اختر فترة عرض صالحة.');
  const days=Number(raw),today=new Date().toISOString().slice(0,10);
  const start=new Date(Date.parse(today+'T00:00:00.000Z')-(days-1)*86400000).toISOString().slice(0,10);
  const [traffic,attempts,catalog]=await Promise.all([
   db.from('site_usage_daily').select('day,metric,section,total')
    .gte('day',start).lte('day',today).order('day',{ascending:true}).limit(5000),
   db.from('school_stage_attempts')
    .select('user_id,course_slug,stage_index,status,score,questions,submission')
    .in('status',['passed','failed']).order('submitted_at',{ascending:false}).limit(3000),
   db.from('school_editor_courses').select('slug,published').not('published','is',null).limit(200)
  ]);
  if(traffic.error||attempts.error||catalog.error)throw new RequestValidationError('تعذر تحميل تحليلات الاستخدام.',503);
  // Hide results based on small student groups and never return user IDs,
  // answers, original question banks or individual attempts to the browser.
  const rows=attempts.data||[];
  const learning=schoolLearningOverview(rows);
  const courseNames=Object.fromEntries([
   ...SCHOOL_COURSES.map(item=>[item.slug,item.title]),
   ...(catalog.data||[]).filter(x=>typeof x?.published?.title==='string').map(x=>[x.slug,x.published.title.slice(0,100)])
  ]);
  const q=schoolStudioAnalytics(rows,3000).questions
   .filter(item=>item.asked>=5).slice(0,12)
   .map(({course,stage,prompt,asked,wrong,wrongRate})=>({
    course,stage,prompt:String(prompt||'').slice(0,160),asked,wrong,wrongRate
   }));
  return respond({
   usage:usageOverview(traffic.data||[],days),
   school:{...learning,courseNames,questions:q},
   notes:{
    traffic:'مشاهدات صفحات وأحداث بحث بلا نتائج، وليست عدد زوار فريدين أو زيارات بشرية مؤكدة.',
    school:'تحليل لعينة من أحدث 3000 محاولة مصححة كحد أقصى، وليس جميع الطلاب أو المدة المختارة. تظهر المحطات والأسئلة فقط عند توفر خمس مشاركات أو إجابات على الأقل.',
    privacy:'لا تُحفظ عناوين IP أو معرّفات الزوار أو نصوص البحث في جدول التحليلات.'
   }
  });
 }catch(error){
  if(error instanceof RequestValidationError)return respond({error:error.message},error.status);
  console.error('Admin analytics error',error?.name||'unknown');
  return respond({error:'تعذر تحميل لوحة التحليلات.'},503);
 }
}
