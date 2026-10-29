export const SCHOOL_FIXED_SLUGS=['musnad','arud'];
export const SCHOOL_SLUG=/^[a-z][a-z0-9-]{2,39}$/;
const clean=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max?x.trim():null;
export function validateSchoolEditorial(kind,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('بيانات التحرير غير صالحة.');
 if(kind==='course'){
  const title=clean(input.title,3,90),description=clean(input.description,10,700),category=clean(input.category,2,60);
  if(!title||!description||!category)throw Error('أضف اسم المسار وقسمه ووصفه.');
  return {title,description,category};
 }
 if(kind==='stage'){
  const title=clean(input.title,3,90),subtitle=clean(input.subtitle||'',0,180),intro=clean(input.intro,20,2500);
  if(!title||subtitle===null||!intro||!Array.isArray(input.tips)||input.tips.length>10||input.tips.some(x=>!clean(x,2,240)))
   throw Error('المحطة تحتاج عنوانًا ومقدمة من 20 حرفًا ونصائح صحيحة.');
  return {title,subtitle,intro,tips:input.tips.map(x=>x.trim())};
 }
 if(kind==='question'){
  const prompt=clean(input.prompt,10,350),target=clean(input.target||'',0,500),explanation=clean(input.explanation,10,800);
  if(!prompt||target===null||!explanation||!Array.isArray(input.options)||input.options.length!==4||
    input.options.some(x=>!clean(x,1,150))||new Set(input.options.map(x=>x.trim())).size!==4||
    !Number.isInteger(input.answerIndex)||input.answerIndex<0||input.answerIndex>3)
    throw Error('السؤال يحتاج نصًا، وأربعة خيارات مختلفة، والإجابة الصحيحة وتفسيرًا.');
  return {prompt,target,explanation,options:input.options.map(x=>x.trim()),answerIndex:input.answerIndex};
 }
 throw Error('نوع المحتوى غير مدعوم.');
}
export function publishedSchoolQuestion(row){
 const d=validateSchoolEditorial('question',row.published);
 return {id:'studio-'+row.id,kind:'choice',prompt:d.prompt,target:d.target||null,
  options:d.options,answer:d.options[d.answerIndex],explanation:d.explanation};
}
export function chooseSchoolQuestions(rows,attemptNo){
 const q=rows.filter(x=>x.published).map(publishedSchoolQuestion);
 if(q.length<6)throw Error('ستة أسئلة منشورة مطلوبة.');
 return Array.from({length:6},(_,i)=>q[(i+attemptNo-1)%q.length]);
}
export function gradeSchoolChoice(questions,answers){
 if(!Array.isArray(questions)||questions.length!==6||!Array.isArray(answers)||answers.length!==6)throw Error('بيانات الاختبار غير مكتملة.');
 let score=0;
 const review=questions.map((q,i)=>{
  const a=answers[i];if(a?.id!==q.id||!Number.isInteger(a.choice)||a.choice<0||a.choice>=q.options?.length)throw Error('إجابة غير صالحة.');
  const correct=q.options[a.choice]===q.answer;if(correct)score++;
  return {id:q.id,correct,answer:q.answer,explanation:q.explanation};
 });
 return {score,total:6,passed:score>=5,review};
}
export function publicSchoolChoice(questions){return questions.map(({id,prompt,target,options})=>({id,kind:'choice',prompt,target,options}));}
