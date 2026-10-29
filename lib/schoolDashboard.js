import {SCHOOL_COURSES} from './schoolCatalog.js';

// Pure read-only aggregation: previews never count as mastered stations.
function timestamp(row){
 const time=Date.parse(row?.submitted_at||row?.created_at||'');
 return Number.isFinite(time)?time:0;
}
export function buildSchoolDashboard(rows=[],staffPreview=false){
 const source=Array.isArray(rows)?rows:[];
 const courses=SCHOOL_COURSES.map(course=>{
  const own=source.filter(row=>row.course_slug===course.slug&&Number.isInteger(row.stage_index)&&row.stage_index>=0&&row.stage_index<course.stages.length);
  const progress=course.progress(own);
  const completed=progress.completed.length,total=course.stages.length;
  const next=progress.finished?null:course.stages[progress.unlocked];
  const last=own.reduce((max,row)=>Math.max(max,timestamp(row)),0);
  return {
   slug:course.slug,title:course.title,category:course.category,description:course.description,href:course.href,
   completed,total,percent:Math.round(completed/total*100),finished:progress.finished,
   nextStage:next?{index:next.index,title:next.title,href:course.href+'/'+(next.index+1)}:null,
   hasActiveAttempt:own.some(row=>row.stage_index===next?.index&&row.status==='active'),
   lastActivityAt:last?new Date(last).toISOString():null,
   attempts:own.filter(row=>row.status==='passed'||row.status==='failed').length
  };
 });
 const candidates=courses.filter(course=>!course.finished).sort((a,b)=>Date.parse(b.lastActivityAt||'1970-01-01')-Date.parse(a.lastActivityAt||'1970-01-01'));
 const resume=candidates[0]||null;
 return {
  staffPreview:Boolean(staffPreview),
  totals:{
   courses:courses.length,finishedCourses:courses.filter(c=>c.finished).length,
   completedStages:courses.reduce((n,c)=>n+c.completed,0),
   stages:courses.reduce((n,c)=>n+c.total,0),
   submittedAttempts:courses.reduce((n,c)=>n+c.attempts,0)
  },
  resume:resume?{slug:resume.slug,course:resume.title,stage:resume.nextStage,hasActiveAttempt:resume.hasActiveAttempt}:null,
  courses
 };
}
