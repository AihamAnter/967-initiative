// The existing ranking description field stores editorial paragraphs. It is
// editable through the existing /admin ranking form; no new DB or role required.
const headings=new Set(['لماذا تهم المقارنة؟','كيف تقرأ الترتيب؟','حدود القراءة:']);

export function splitRankingDescription(value){
 const paragraphs=String(value||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 const intro=paragraphs.shift()||'';
 const sections=[];
 for(const part of paragraphs){
  const pivot=part.indexOf('\n');
  const title=pivot>=0?part.slice(0,pivot).trim():'';
  const body=pivot>=0?part.slice(pivot+1).trim():'';
  if(headings.has(title)&&body){sections.push({title,body});}
  else if(part){sections.push({title:'معلومة إضافية',body:part});}
 }
 return {intro,sections};
}
export function isEnrichedRankingDescription(value){
 const parsed=splitRankingDescription(value);
 return parsed.intro.length>=45
   && parsed.sections.length===3
   && parsed.sections[0].title==='لماذا تهم المقارنة؟'
   && parsed.sections[1].title==='كيف تقرأ الترتيب؟'
   && parsed.sections[2].title==='حدود القراءة:'
   && parsed.sections.every(x=>x.body.length>=70)
   && String(value).length<=3000;
}
