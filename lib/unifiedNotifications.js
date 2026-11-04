// Normalize existing notifications from separate sources without copying them
// into a second table. Private messages are grouped per conversation.
export const NOTIFICATION_PAGE_SIZE=20;
export const NOTIFICATION_CATEGORIES=['all','messages','tasks','debates','account'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validNotificationId=(source,id)=>
 source==='task'?/^[1-9][0-9]{0,15}$/.test(String(id))&&Number.isSafeInteger(Number(id)):
 source==='account'?uuid.test(String(id)):false;

export function safeNoticeHref(value){
 return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&
  !value.includes('\\')&&!/[\r\n\u0000-\u001f]/.test(value)&&value.length<=500?value:'/notifications';
}
export const isDuplicatedMessageNotice=row=>
 /^\/messages(?:[/?#]|$)/.test(row?.href||'');

export function accountNotice(row){
 if(isDuplicatedMessageNotice(row))return null;
 const category=row.kind==='reply'||row.kind==='moderation'?'debates':'account';
 return {id:'account:'+row.id,source:'account',source_id:row.id,category,
  title:row.title||'تحديث جديد',description:row.description||'',
  href:safeNoticeHref(row.href),created_at:row.created_at,unread:!row.read_at,read_at:row.read_at||null};
}
export function taskNotice(row,title){
 const labels={assignment:'أُسندت إليك مهمة',due_soon:'اقترب موعد تسليم مهمة',overdue:'مهمة متأخرة',
  review:'مهمة تنتظر المراجعة',reopened:'أعيد فتح مهمة',comment:'تعليق جديد على مهمة',
  mention:'ذُكرت في مناقشة مهمة'};
 const href='/admin/tasks?task='+encodeURIComponent(row.task_id)+
  (row.comment_id?'&comment='+encodeURIComponent(row.comment_id):'');
 return {id:'task:'+row.id,source:'task',source_id:String(row.id),category:'tasks',
  title:labels[row.kind]||'تحديث مهمة',description:title||'افتح المهمة للاطلاع على التفاصيل.',
  href,created_at:row.created_at,unread:!row.read_at,read_at:row.read_at||null};
}
export function conversationNotice(row,actorId){
 if(!row||row.blocked)return null;
 const requests=row.status==='pending'&&row.requested_by!==actorId;
 const unread=Math.max(0,Math.min(100000,Number(row.unread)||0));
 if(!requests&&!unread)return null;
 const title=requests?'طلب محادثة جديد':'رسائل جديدة';
 const name=row.partner_name||'مستخدم 967';
 return {id:'message:'+row.id,source:'message',source_id:row.id,category:'messages',
  title,description:requests?'طلب محادثة من '+name:
   unread===1?'رسالة غير مقروءة من '+name:unread+' رسائل غير مقروءة من '+name,
  href:'/messages?conversation='+encodeURIComponent(row.id),
  created_at:requests?row.requested_at:row.last_message_at||row.updated_at,
  unread:true,read_at:null};
}
export function orderNotices(notices){
 return [...notices].filter(Boolean).sort((a,b)=>
  Date.parse(b.created_at||0)-Date.parse(a.created_at||0)||
  String(a.id).localeCompare(String(b.id)));
}
export const noticeCategoryLabel={all:'الكل',messages:'الرسائل',tasks:'المهام',debates:'المناظرات',account:'الحساب'};
export function noticeCountLabel(value){
 const n=Math.max(0,Number(value)||0);return n>99?'99+':String(Math.floor(n));
}
