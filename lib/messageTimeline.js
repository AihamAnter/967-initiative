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
// The unread marker is a snapshot from when the thread was opened, not a
// live unread count. Keep it visible after the read receipt is saved.
export function firstVisibleUnreadIndex(messages=[],unread=null){
 if(!unread?.id||!unread.created_at||!messages.length)return -1;
 const exact=messages.findIndex(message=>message.id===unread.id);
 if(exact!==-1)return exact;
 // If more than one page was unread, the actual first unread may still be
 // in older pages. Show a provisional divider before the first loaded page.
 const firstTime=Date.parse(messages[0].created_at),unreadTime=Date.parse(unread.created_at);
 return Number.isFinite(firstTime)&&Number.isFinite(unreadTime)&&firstTime>unreadTime?0:-1;
}
export function buildMessageTimeline(messages=[],unread=null){
 const rows=[];
 let previousDay=null;
 const unreadIndex=firstVisibleUnreadIndex(messages,unread);
 for(const [index,message] of messages.entries()){
  const day=messageDayKey(message.created_at);
  if(day&&day!==previousDay){
   rows.push({kind:'day',key:'day:'+day,day,label:messageDayLabel(message.created_at)});
  }
  if(index===unreadIndex)rows.push({kind:'unread',key:'unread:'+unread.id,label:'رسائل جديدة'});
  rows.push({kind:'message',key:'message:'+message.id,message});
  previousDay=day;
 }
 return rows;
}
