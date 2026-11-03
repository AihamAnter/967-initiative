// Private messages are rendered in the viewer's local timezone.
// Keep one date heading for each day; never repeat full dates inside bubbles.
const timeFormat=new Intl.DateTimeFormat('ar-u-nu-latn',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const dayFormat=new Intl.DateTimeFormat('ar-u-nu-latn',{day:'numeric',month:'long',year:'numeric'});

function parsedDate(value){
 if(!value)return null;
 const parsed=new Date(value);
 return Number.isFinite(parsed.getTime())?parsed:null;
}
export function messageClock(value){
 const parsed=parsedDate(value);
 return parsed?timeFormat.format(parsed):'';
}
export function messageDayKey(value){
 const parsed=parsedDate(value);
 if(!parsed)return null;
 return [parsed.getFullYear(),String(parsed.getMonth()+1).padStart(2,'0'),String(parsed.getDate()).padStart(2,'0')].join('-');
}
export function messageDayLabel(value){
 const parsed=parsedDate(value);
 return parsed?dayFormat.format(parsed):'';
}
export function buildMessageTimeline(messages=[]){
 const rows=[];
 let previousDay=null;
 for(const message of messages){
  const day=messageDayKey(message.created_at);
  if(day&&day!==previousDay){
   rows.push({kind:'day',key:'day:'+day,day,label:messageDayLabel(message.created_at)});
  }
  rows.push({kind:'message',key:'message:'+message.id,message});
  previousDay=day;
 }
 return rows;
}
