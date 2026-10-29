import {gradeSchoolQuestions} from './schoolMusnadQuestions.js';
import {gradeArudQuestions} from './schoolArudQuestions.js';
import {gradeSchoolChoice} from './schoolContent.js';
// Grouped aggregates never expose user ids, answers or raw student submissions.
export function schoolStudioAnalytics(rows=[],limit=3000){
 const stages=new Map(),questions=new Map();
 for(const row of rows.slice(0,limit)){
  if(!['passed','failed'].includes(row.status)||!/^[a-z][a-z0-9-]{2,39}$/.test(row.course_slug)||
   !Number.isInteger(row.stage_index)||row.stage_index<0||row.stage_index>11)continue;
  const key=row.course_slug+':'+row.stage_index;
  if(!stages.has(key))stages.set(key,{course:row.course_slug,stage:row.stage_index,attempts:0,passes:0,scoreSum:0});
  const stage=stages.get(key);
  stage.attempts++;stage.passes+=row.status==='passed'?1:0;stage.scoreSum+=Number(row.score)||0;
  try{
   const grade=row.course_slug==='musnad'?gradeSchoolQuestions:
    row.course_slug==='arud'?gradeArudQuestions:gradeSchoolChoice;
   const review=grade(row.questions,row.submission).review;
   for(let i=0;i<review.length;i++){
    const q=review[i],qid=key+':'+q.id;
    if(!questions.has(qid))questions.set(qid,{course:row.course_slug,stage:row.stage_index,prompt:row.questions[i].prompt,asked:0,wrong:0});
    const record=questions.get(qid);record.asked++;if(!q.correct)record.wrong++;
   }
  }catch{ /* ignore malformed old submissions in difficulty scores */ }
 }
 return {
  sampleSize:rows.length,
  truncated:rows.length>=limit,
  stages:[...stages.values()].map(x=>({course:x.course,stage:x.stage,attempts:x.attempts,passes:x.passes,
   passRate:Math.round(x.passes/x.attempts*100),meanScore:Math.round(x.scoreSum/x.attempts*100)/100}))
   .sort((a,b)=>b.attempts-a.attempts),
  questions:[...questions.values()].filter(x=>x.asked>=1)
   .map(x=>({...x,wrongRate:Math.round(x.wrong/x.asked*100)}))
   .sort((a,b)=>b.wrongRate-a.wrongRate||b.asked-a.asked).slice(0,60)
 };
}
