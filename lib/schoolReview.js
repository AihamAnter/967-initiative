import {gradeSchoolQuestions,publicSchoolQuestions} from './schoolMusnadQuestions.js';
import {gradeArudQuestions,publicArudQuestions} from './schoolArudQuestions.js';
const graders={musnad:[gradeSchoolQuestions,publicSchoolQuestions],arud:[gradeArudQuestions,publicArudQuestions]};
export function schoolMistakeReview(records=[],limit=8){
 const reviewed=new Set(),mistakes=[];
 for(const row of records){
  if(mistakes.length>=limit)break;
  if(!['passed','failed'].includes(row.status)||!graders[row.course_slug]||!Number.isInteger(row.stage_index)||row.stage_index<0||row.stage_index>11)continue;
  try{
   const [grade,publish]=graders[row.course_slug];
   const graded=grade(row.questions,row.submission).review;
   const publicQuestions=publish(row.questions);
   for(let i=0;i<graded.length;i++){
    const r=graded[i],key=row.course_slug+':'+row.stage_index+':'+r.id;
    if(reviewed.has(key))continue;
    reviewed.add(key);
    if(r.correct)continue;
    mistakes.push({id:key,course:row.course_slug,stage:row.stage_index,prompt:publicQuestions[i].prompt,
     context:publicQuestions[i].target||publicQuestions[i].glyph||null,answer:r.answer,explanation:r.explanation,
     href:'/school/writing/'+row.course_slug+'/'+(row.stage_index+1)});
    if(mistakes.length>=limit)break;
   }
  }catch{/* Skip malformed historic attempts; never review active attempts. */}
 }
 return mistakes;
}
