import {MUSNAD_ALPHABET,MUSNAD_STAGES} from './schoolMusnad.js';
import {MUSNAD_FINAL_SENTENCES,musnadSentenceIds} from './schoolMusnadSentences.js';
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

const separator={id:'sep',glyph:'𐩽',name:'فاصل الكلمات'};
function recognitionQuestion(letter,attemptNo,ordinal,mode=0){
 const candidates=shuffle(MUSNAD_ALPHABET.filter(c=>c.id!==letter.id),'choices:'+letter.id+':'+attemptNo+':'+ordinal).slice(0,3);
 const isName=mode%2===0;
 return {
  id:'ext-'+letter.id+'-'+mode+'-'+ordinal,kind:'choice',
  prompt:isName?'ما المقابل التعليمي لهذا الحرف؟':'أي رمز يمثل '+letter.name+'؟',
  glyph:isName?letter.glyph:null,
  answer:isName?letter.name:letter.glyph,
  options:shuffle([letter,...candidates].map(c=>isName?c.name:c.glyph),'options:'+letter.id+':'+attemptNo+':'+ordinal),
  explanation:'الحرف '+letter.glyph+' يقابل '+letter.name+' ('+letter.latin+').'
 };
}
function compositionQuestion(stage,attemptNo,ordinal,withSeparator=false){
 const length=withSeparator?3:2+(ordinal%3);
 const ordered=shuffle(MUSNAD_ALPHABET,'sequence:'+stage+':'+attemptNo+':'+ordinal).slice(0,length);
 const correct=withSeparator?[ordered[0],separator,ordered[1]]:ordered;
 const options=shuffle([...new Map([...correct,...shuffle(MUSNAD_ALPHABET,'distractors:'+stage+':'+attemptNo+':'+ordinal).slice(0,10)].map(c=>[c.id,c])).values()],'compose:'+stage+':'+attemptNo+':'+ordinal);
 return {
  id:'ext-seq-'+stage+'-'+attemptNo+'-'+ordinal,
  kind:'compose',
  prompt:withSeparator?'أضف فاصل الكلمات بين مجموعتي الحروف.':'كوّن هذا التسلسل حرفًا حرفًا من اليمين إلى اليسار.',
  target:correct.map(c=>c.name).join(' ← '),
  answer:correct.map(c=>c.id),options,
  explanation:'الترتيب الحرفي: '+correct.map(c=>c.glyph).join('')+'. تدريب مُنشأ وليس نقشًا أثريًا.'
 };
}
function finalSentenceQuestions(attemptNo){
 const chosen=shuffle(MUSNAD_FINAL_SENTENCES,'meaningful-sentences:'+attemptNo).slice(0,6);
 return chosen.map((target,index)=>{
  const answer=musnadSentenceIds(target);
  const keyboard=shuffle([...MUSNAD_ALPHABET,separator],'full-sentence-keyboard:'+attemptNo+':'+index);
  const glyphs=answer.map(id=>(id==='sep'?separator:MUSNAD_ALPHABET.find(c=>c.id===id)).glyph).join('');
  return {
   id:'full-sentence-'+MUSNAD_FINAL_SENTENCES.indexOf(target),
   kind:'sentence',
   prompt:'اكتب الجملة العربية كاملة بحروف المسند، وضع 𐩽 بين كل كلمتين.',
   target,answer,options:keyboard,
   explanation:'الجملة العربية: «'+target+'». مقابلها التدريبي بحروف المسند: '+glyphs+'. هذا نقل حرفي تقريبي وليس نصًا باللغة السبئية.'
  };
 });
}

function advancedQuestions(stage,attemptNo){
 if(stage>=3&&stage<=7){
  const letters=MUSNAD_STAGES[stage].letters;
  return Array.from({length:6},(_,i)=>recognitionQuestion(letters[(i+attemptNo-1)%letters.length],attemptNo,i,i%2));
 }
 if(stage===8){
  const source=shuffle(MUSNAD_ALPHABET,'alphabet-review:'+attemptNo);
  return source.slice(0,6).map((letter,i)=>recognitionQuestion(letter,attemptNo,i,i%2));
 }
 if(stage===9)return Array.from({length:6},(_,i)=>compositionQuestion(stage,attemptNo,i));
 if(stage===10)return Array.from({length:6},(_,i)=>compositionQuestion(stage,attemptNo,i,true));
 if(stage===11)return finalSentenceQuestions(attemptNo);

 throw Error('Invalid advanced stage');
}

export function makeSchoolQuestions(stage,attemptNo){
 if(!Number.isInteger(stage)||stage<0||stage>=MUSNAD_STAGES.length||!Number.isSafeInteger(attemptNo)||attemptNo<1)throw Error('Invalid stage');
 if(stage>2)return shuffle(advancedQuestions(stage,attemptNo),'advanced:'+stage+':'+attemptNo);
 const pool=pools[stage],offset=(attemptNo-1)%pool.length;
 // Stride across the bank so the first stage tests all four introduced letters.
 const stride=stage===0?2:3;
 const chosen=Array.from({length:6},(_,i)=>pool[(offset+i*stride)%pool.length]);
 return shuffle(chosen,'order:'+stage+':'+attemptNo).map(q=>({...q,options:shuffle(q.options,q.id+':'+attemptNo)}));
}
export function publicSchoolQuestions(snapshot){
 // During an assessment, a composition tile must never disclose its name,
 // transliteration or semantic ID. The target supplies the requested names;
 // the choices supply only the Musnad glyphs.
 return snapshot.map(q=>({
  id:q.id,kind:q.kind,prompt:q.prompt,glyph:q.glyph||null,target:q.target||null,
  options:['compose','sentence'].includes(q.kind)?q.options.map(({glyph})=>({glyph})):q.options
 }));
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
  }else if(q.kind==='sentence'){
   if(!Array.isArray(s.choice)||s.choice.length<1||s.choice.length>80)throw Error('Invalid sentence input');
   const selected=s.choice.map(value=>{
    if(Number.isInteger(value)&&value>=0&&value<q.options.length)return q.options[value].id;
    if(typeof value==='string'&&q.options.some(o=>o.id===value))return value;
    throw Error('Invalid sentence symbol');
   });
   correct=selected.length===q.answer.length&&selected.every((id,k)=>id===q.answer[k]);
   answer=q.answer.map(id=>(id==='sep'?separator:MUSNAD_ALPHABET.find(c=>c.id===id))?.glyph||'?').join('');
  }else if(q.kind==='compose'){
   if(!Array.isArray(s.choice)||s.choice.length!==q.answer.length)throw Error('Invalid glyph sequence');
   // New clients submit opaque tile positions instead of letter IDs. Accept
   // legacy string IDs from an already-open lesson during deployment.
   const selectedIds=s.choice.map(v=>{
    if(Number.isInteger(v)&&v>=0&&v<q.options.length)return q.options[v].id;
    if(typeof v==='string'&&q.options.some(o=>o.id===v))return v;
    throw Error('Invalid glyph selection');
   });
   correct=selectedIds.every((id,k)=>id===q.answer[k]);
   answer=q.answer.map(id=>(byId[id]||MUSNAD_ALPHABET.find(g=>g.id===id)||(id==='sep'?separator:null))?.glyph||'?').join('');
  }else throw Error('Unknown question type');
  if(correct)score++;
  return {id:q.id,correct,answer,explanation:q.explanation};
 });
 return {score,total:6,passed:score>=5,review};
}
