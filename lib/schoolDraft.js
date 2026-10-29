// Only server-held question snapshots determine valid positions and sequence tokens.
export function validateSchoolDraft(questions,input){
 if(!Array.isArray(questions)||questions.length!==6||!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid draft');
 const {answers,selection}=input;
 if(!Array.isArray(answers)||answers.length>5)throw Error('Invalid draft length');
 const valid=(q,value,complete)=>{
  if(q.kind==='choice')return Number.isInteger(value)&&value>=0&&value<q.options.length;
  if(['compose','sentence'].includes(q.kind)){
   const max=q.kind==='sentence'?80:q.answer.length;
   return Array.isArray(value)&&value.length<=max&&(!complete||value.length>0&&(q.kind!=='compose'||value.length===max))&&value.every(n=>Number.isInteger(n)&&n>=0&&n<q.options.length);
  }
  if(q.kind==='sequence'){
   const max=q.steps||8;
   return Array.isArray(value)&&value.length<=max&&(!complete||value.length>0&&(!q.steps||value.length===q.steps))&&value.every(token=>typeof token==='string'&&q.options.includes(token));
  }
  return false;
 };
 const cleaned=answers.map((a,i)=>{
  if(!a||a.id!==questions[i].id||!valid(questions[i],a.choice,true))throw Error('Invalid saved answer');
  return {id:a.id,choice:Array.isArray(a.choice)?[...a.choice]:a.choice};
 });
 if(selection!==null&&selection!==undefined&&!valid(questions[cleaned.length],selection,false))throw Error('Invalid selection');
 return {answers:cleaned,selection:Array.isArray(selection)?[...selection]:selection??null};
}
export function savedSchoolDraft(row){return {
 draft:row.draft&&typeof row.draft==='object'?row.draft:{answers:[],selection:null},
 draftVersion:Number.isSafeInteger(Number(row.draft_version))?Number(row.draft_version):0
};}
