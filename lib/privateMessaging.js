import {RequestValidationError} from './requestSecurity.js';

export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MESSAGE_PAGE_SIZE=30;
export const MESSAGE_SEARCH_PAGE_SIZE=25;
export const MESSAGE_REQUEST_LIMIT=5;
export const MESSAGE_PER_MINUTE_LIMIT=10;

// A single tick confirms the message was saved. Two ticks mean the partner
// marked the conversation as read at or after that message's timestamp.
export function isMessageRead(message,actorId,partnerReadAt){
 if(!message||message.sender_id!==actorId||!partnerReadAt)return false;
 const sent=Date.parse(message.created_at),read=Date.parse(partnerReadAt);
 return Number.isFinite(sent)&&Number.isFinite(read)&&read>=sent;
}
export const MESSAGE_DAILY_LIMIT=250;
export const REPORT_REASONS={harassment:'مضايقة',threat:'تهديد',spam:'رسائل مزعجة',fraud:'احتيال',inappropriate:'محتوى غير مناسب',other:'سبب آخر'};
const actions=new Set(['request','accept','decline','send','read','block','unblock','report','settings','edit','delete','pin','unpin','clear','mute','unmute']);
const convActions=new Set(['accept','decline','send','read','report','edit','delete','pin','unpin','clear','mute','unmute']);
const targetActions=new Set(['request','block','unblock']);

export function validateMessagingAction(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new RequestValidationError('بيانات الطلب غير صحيحة.');
 const action=payload.action;
 if(!actions.has(action))throw new RequestValidationError('إجراء غير مدعوم.');
 const target=payload.target??null,conversation=payload.conversation??null;
 if(targetActions.has(action)&&!UUID_RE.test(target||''))throw new RequestValidationError('المستخدم المحدد غير صالح.');
 if(convActions.has(action)&&!UUID_RE.test(conversation||''))throw new RequestValidationError('المحادثة المحددة غير صالحة.');
 const text=typeof payload.text==='string'?payload.text.trim():'';
 if(action==='request'&&(text.length<1||text.length>500))throw new RequestValidationError('رسالة الطلب يجب أن تكون من 1 إلى 500 حرف.');
 if(['pin','unpin'].includes(action)&&!UUID_RE.test(payload.message||''))throw new RequestValidationError('الرسالة المحددة للتثبيت غير صالحة.');
 if(['edit','delete'].includes(action)&&!UUID_RE.test(payload.message||''))throw new RequestValidationError('الرسالة المحددة غير صالحة.');
 if(action==='edit'&&(text.length<1||text.length>2000))throw new RequestValidationError('نص التعديل يجب أن يكون من 1 إلى 2000 حرف.');
 if(action==='send'&&payload.message!=null&&!UUID_RE.test(payload.message||''))throw new RequestValidationError('الرسالة المقتبسة غير صالحة.');
 if(action==='send'&&(text.length<1||text.length>2000))throw new RequestValidationError('الرسالة يجب أن تكون من 1 إلى 2000 حرف.');
 if(action==='report'){
  if(!Object.hasOwn(REPORT_REASONS,payload.reason))throw new RequestValidationError('اختر سبب البلاغ.');
  if(text.length>1000)throw new RequestValidationError('ملاحظة البلاغ طويلة جدًا.');
  if(payload.message&&!UUID_RE.test(payload.message))throw new RequestValidationError('الرسالة المبلغ عنها غير صالحة.');
 }
 const booleans=['discoverable','allow_requests','notify_messages'];
 if(action==='settings'&&!booleans.every(key=>typeof payload[key]==='boolean'))throw new RequestValidationError('إعدادات الرسائل غير صالحة.');
 return {
  p_action:action,p_target:targetActions.has(action)?target:null,
  p_conversation:convActions.has(action)?conversation:null,
  p_text: ['request','send','report','edit'].includes(action)?text:null,
  p_message:['report','edit','delete','send','pin','unpin'].includes(action)&&payload.message?payload.message:null,
  p_options:action==='report'?{reason:payload.reason}:action==='settings'?
   Object.fromEntries(booleans.map(key=>[key,payload[key]])):{}
 };
}

export function safeMessagingQuery(params){
 const mode=params.get('mode')||'inbox';
 if(!['inbox','summary','search','thread','settings','contact','thread-search','receipt'].includes(mode))throw new RequestValidationError('نوع الطلب غير مدعوم.');
 const id=params.get('id')||'';
 if(['thread','contact','thread-search','receipt'].includes(mode)&&!UUID_RE.test(id))throw new RequestValidationError('المحادثة المحددة غير صالحة.');
 const q=(params.get('q')||'').trim().slice(0,60).replace(/[%_\\]/g,'');
 const around=params.get('around')||'';
 if(around&&(mode!=='thread'||!UUID_RE.test(around)))throw new RequestValidationError('الرسالة الأصلية غير صالحة.');
 const before=params.get('before')||'';
 if(around&&before)throw new RequestValidationError('لا يمكن تحميل صفحة ورسالة محددة معًا.');
 if(before&&!['thread','thread-search'].includes(mode))throw new RequestValidationError('تاريخ التحميل غير مدعوم.');
 if(before&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(before)||!Number.isFinite(Date.parse(before))))throw new RequestValidationError('تاريخ التحميل غير صالح.');
 return {mode,id,q,before,around};
}

// When no settings row exists, directory search is on by default.
// An explicit false setting is always respected.
export function canReceiveSearchRequests(preferences){
 return preferences?.discoverable!==false&&preferences?.allow_requests!==false;
}

export function messagingError(error){
 const code=error?.message||'';
 const messages={
  MESSAGE_AUTH_DENIED:['حسابك غير مؤهل للمراسلة حاليًا.',403],
  MESSAGE_INVALID_INPUT:['المدخلات غير صالحة.',400],
  MESSAGE_INVALID_TARGET:['المستخدم أو الرسالة غير متاح.',404],
  MESSAGE_REQUESTS_CLOSED:['لا يمكن بدء أو متابعة محادثة مع هذا الحساب.',403],
  MESSAGE_ALREADY_EXISTS:['هناك طلب محادثة قائم بالفعل أو فترة انتظار بعد طلب سابق.',409],
  MESSAGE_REQUEST_LIMIT:['وصلت إلى حد 5 طلبات محادثة خلال 24 ساعة.',429],
  MESSAGE_NOT_FOUND:['المحادثة أو الرسالة غير موجودة أو ليست ضمن حسابك.',404],
  MESSAGE_ALREADY_DELETED:['هذه الرسالة محذوفة ولا يمكن تغييرها.',409],
  MESSAGE_PIN_CHANGED:['تم تغيير الرسالة المثبتة. حدّث المحادثة ثم حاول مجددًا.',409],
  MESSAGE_INVALID_STATE:['الإجراء غير متاح في حالة المحادثة الحالية.',409],
  MESSAGE_SEND_LIMIT:['وصلت إلى الحد المسموح للرسائل أو البلاغات. حاول لاحقًا.',429]
 };
 for(const [key,[message,status]] of Object.entries(messages))if(code.includes(key))return new RequestValidationError(message,status);
 return null;
}
