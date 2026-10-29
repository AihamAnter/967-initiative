// This file is imported only by the school's server endpoints.
const glyphs=[['m','𐩣','ميم'],['l','𐩡','لام'],['w','𐩥','واو'],['h','𐩠','هاء'],['r','𐩧','راء'],['q','𐩤','قاف'],['hh','𐩢','حاء'],['sh','𐩦','شين']].map(([id,glyph,name])=>({id,glyph,name}));
const byId=Object.fromEntries(glyphs.map(g=>[g.id,g]));
const first=glyphs.slice(0,4).flatMap(({id,glyph,name})=>[
 {id:'a-'+id+'-1',kind:'choice',prompt:'ما اسم هذا الحرف في المسند؟',glyph,answer:name,options:glyphs.slice(0,4).map(g=>g.name),explanation:glyph+' يقابل '+name+'.'},
 {id:'a-'+id+'-2',kind:'choice',prompt:'اختر الحرف المناسب لاسم: '+name,glyph:null,answer:glyph,options:glyphs.slice(0,4).map(g=>g.glyph),explanation:'حرف '+name+' هو '+glyph+'.'},
 {id:'a-'+id+'-3',kind:'choice',prompt:'أي اسم يوافق الرمز الآتي؟',glyph,answer:name,options:glyphs.slice(0,4).map(g=>g.name),explanation:'تذكر: '+glyph+' هو '+name+'.'}
]);
const second=glyphs.flatMap(({id,glyph,name},i)=>[
 {id:'b-'+id+'-1',kind:'choice',prompt:'ما الحرف الذي يمثله هذا الرمز؟',glyph,answer:name,options:[name,glyphs[(i+1)%8].name,glyphs[(i+3)%8].name,glyphs[(i+5)%8].name],explanation:glyph+' هو '+name+'.'},
 {id:'b-'+id+'-2',kind:'choice',prompt:'اختر رمز '+name+'.',glyph:null,answer:glyph,options:[glyph,glyphs[(i+1)%8].glyph,glyphs[(i+3)%8].glyph,glyphs[(i+5)%8].glyph],explanation:'رمز '+name+' هو '+glyph+'.'}
]);
const sequences=[['m','l'],['w','r'],['q','m'],['l','h'],['sh','m'],['hh','r'],['r','q'],['h','w'],['l','m','r'],['m','sh','q'],['q','w','l'],['hh','m','h'],['w','sh'],['r','m','l'],['h','q'],['sh','l','w']];
const third=sequences.map((sequence,i)=>({
 id:'c-'+i,kind:'compose',prompt:'كوّن هذا التسلسل حرفًا حرفًا من اليمين إلى اليسار.',
 target:sequence.map(id=>byId[id].name).join(' ← '),answer:sequence,
 options:glyphs,explanation:'الترتيب الصحيح: '+sequence.map(id=>byId[id].glyph).join('')+'، وهو تدريب حرفي لا ترجمة.'
}));
const pools=[first,second,third];
function hash(s){let n=2166136261;for(const ch of s){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
function shuffle(items,seed){return [...items].map((item,i)=>({item,weight:hash(seed+':'+i)})).sort((a,b)=>a.weight-b.weight).map(x=>x.item);}
export function makeSchoolQuestions(stage,attemptNo){
 if(!Number.isInteger(stage)||stage<0||stage>2||!Number.isSafeInteger(attemptNo)||attemptNo<1)throw Error('Invalid stage');
 const pool=pools[stage],offset=(attemptNo-1)%pool.length;
 // Stride across the bank so the first stage tests all four introduced letters.
 const stride=stage===0?2:3;
 const chosen=Array.from({length:6},(_,i)=>pool[(offset+i*stride)%pool.length]);
 return shuffle(chosen,'order:'+stage+':'+attemptNo).map(q=>({...q,options:shuffle(q.options,q.id+':'+attemptNo)}));
}
export function publicSchoolQuestions(snapshot){
 return snapshot.map(q=>({id:q.id,kind:q.kind,prompt:q.prompt,glyph:q.glyph||null,target:q.target||null,options:q.options}));
}
export function gradeSchoolQuestions(snapshot,submissions){
 if(!Array.isArray(snapshot)||snapshot.length!==6||!Array.isArray(submissions)||submissions.length!==6)throw Error('Invalid submission');
 let score=0;
 const review=snapshot.map((q,i)=>{
  const s=submissions[i];
  if(!s||s.id!==q.id)throw Error('Incorrect question id');
  let correct=false,answer=q.answer;
  if(q.kind==='choice'){
   if(!Number.isInteger(s.choice)||s.choice<0||s.choice>=q.options.length)throw Error('Invalid choice');
   correct=q.options[s.choice]===q.answer;
  }else if(q.kind==='compose'){
   if(!Array.isArray(s.choice)||s.choice.length!==q.answer.length||s.choice.some(v=>typeof v!=='string'||!q.options.some(o=>o.id===v)))throw Error('Invalid glyph sequence');
   correct=s.choice.every((v,k)=>v===q.answer[k]);
   answer=q.answer.map(id=>byId[id].glyph).join('');
  }else throw Error('Unknown question type');
  if(correct)score++;
  return {id:q.id,correct,answer,explanation:q.explanation};
 });
 return {score,total:6,passed:score>=5,review};
}
