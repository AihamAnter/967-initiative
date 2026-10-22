import {RequestValidationError} from './requestSecurity.js';
import {UUID} from './debates.js';

const itemKinds=['comments','questions','reports'];
const contentKinds=['issue','work','company','professional','governorate','district'];
export async function inlineRpc(db,name,args={}){
 const result=await db.rpc(name,args);
 if(result.error){
  const {code,message=''}=result.error,status=code==='42501'?403:['23505','40001'].includes(code)?409:code==='P0002'?404:/^(22|23)/.test(code||'')?400:503;
  const known=[[/Edit linked work through its debate/,'هذا العمل مرتبط بمناظرة. افتح محرر المناظرة لتعديل بياناته.'],[/At most three pinned/,'يمكن تثبيت ثلاثة تعليقات منشورة كحد أقصى في كل مناظرة.'],[/Invalid moderation transition/,'لم يعد هذا الانتقال مناسباً لحالة المشاركة. أعد تحميل أحدث نسخة.'],[/Account unavailable|Account action unavailable/,'لا تتاح إجراءات الحساب لهذه المشاركة حفاظاً على الخصوصية.'],[/Protected content field/,'لا يمكن تعديل هذا الحقل المحمي من نافذة التحرير.'],[/Management/,'هذه العملية متاحة لحساب الإدارة فقط.'],[/Invalid product/,'تحقق من أسماء المنتجات وصورها وأسعارها وعملاتها ومصادرها.'],[/Complete professional|Example contact/,'أكمل بيانات الملف والخدمات، ولا توثّق وسائل اتصال تجريبية.'],[/Invalid content URL/,'استخدم روابط HTTP أو HTTPS صالحة دون بيانات دخول.']];
  const generic={400:'تحقق من الحقول وحالة العنصر قبل الحفظ.',403:'لا تملك صلاحية تنفيذ هذا الإجراء على العنصر.',404:'العنصر غير موجود أو لم تُجهّز بيانات هذا القسم بعد.',409:'تغير العنصر منذ تحميله. أعد تحميل أحدث نسخة وراجع التغيير قبل المحاولة.',503:'تعذر الاتصال بخدمة التحرير. تحقق من الاتصال وتطبيق تحديث قاعدة البيانات.'};
  throw new RequestValidationError(known.find(([pattern])=>pattern.test(message))?.[1]||generic[status],status);
 }
 return result.data;
}
function uuid(value,label='العنصر'){if(!UUID.test(value||''))throw new RequestValidationError(`معرّف ${label} غير صالح.`);return value;}
function kind(value,allowed){if(!allowed.includes(value))throw new RequestValidationError('نوع العنصر غير صالح.');return value;}
function contentId(type,id){if(type==='page'){if(typeof id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,149}$/i.test(id))throw new RequestValidationError('معرّف الصفحة غير صالح.');return id;}if(['governorate','district'].includes(type)){if(typeof id!=='string'||!/^YE[0-9A-Z-]{2,30}$/i.test(id))throw new RequestValidationError('رمز الموقع غير صالح.');return id;}return uuid(id);}
export async function readInlineEditor(db,actor,params){
 const view=params.get('view')||'session';
 if(['content','content_history'].includes(view)){
  const type=kind(params.get('kind'),view==='content_history'?[...contentKinds,'figure','page']:contentKinds);
  return inlineRpc(db,'inline_content_read',{p_kind:type,p_id:contentId(type,params.get('id')),p_history:view==='content_history'});
 }
 if(!['session','counts','capabilities','queue','item','history','account','debate'].includes(view))throw new RequestValidationError('عرض غير صالح.');
 const debate=params.has('debate')?uuid(params.get('debate'),'المناظرة'):null;
 const type=['item','history','account'].includes(view)?kind(params.get('kind'),itemKinds):view==='queue'?kind(params.get('kind')||'all',['all',...itemKinds]):null;
 const id=['item','history','account','debate'].includes(view)?uuid(params.get('id')||debate):null;
 const status=params.get('status')||'pending',page=Number(params.get('page')||1);
 if(!['pending','all'].includes(status)||!Number.isSafeInteger(page)||page<1||page>10000)throw new RequestValidationError('مرشح المراجعة غير صالح.');
 return inlineRpc(db,'inline_editor_read',{p_view:view,p_debate:debate,p_kind:type,p_id:id,p_status:status,p_page:page,p_comment:params.has('comment')?uuid(params.get('comment'),'التعليق'):null});
}
function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
export async function mutateInlineEditor(db,actor,body){
 const {action,id,kind:type,revision}=body,data=body.data??{};
 if(!object(data))throw new RequestValidationError('بيانات الطلب غير صالحة.');
 if(action==='content_save'){
  kind(type,contentKinds);contentId(type,id);
  if(!Number.isSafeInteger(revision)||revision<1)throw new RequestValidationError('نسخة العنصر مطلوبة.');
  return inlineRpc(db,'inline_content_save',{p_kind:type,p_id:id,p_revision:revision,p_data:data});
 }
 if(action==='content_undo')return inlineRpc(db,'inline_content_undo',{p_id:uuid(id)});
 if(action==='batch'){
  const {items,status,reason}=data;
  if(!Array.isArray(items)||!items.length||items.length>20||!['approved','rejected','hidden'].includes(status)||typeof reason!=='string'||reason.trim().length<3||reason.length>1000)throw new RequestValidationError('اختر من 1 إلى 20 مشاركة وسبباً مناسباً.');
  if(items.length>1&&data.confirmed!==true)throw new RequestValidationError('تأكيد عدد المشاركات المحددة مطلوب.');
  const seen=new Set();for(const item of items){kind(item.kind,['comments','questions']);uuid(item.id);if(seen.has(item.kind+item.id)||typeof item.updated_at!=='string'||!Number.isFinite(Date.parse(item.updated_at)))throw new RequestValidationError('مشاركة مكررة أو نسخة غير صالحة.');seen.add(item.kind+item.id);}
  const results=[];
  for(const item of items){try{const result=await inlineRpc(db,'inline_editor_mutate',{p_action:'moderate',p_kind:item.kind,p_id:item.id,p_data:{status,reason,updated_at:item.updated_at}});results.push({id:item.id,kind:item.kind,ok:true,...result});}catch(error){if(!(error instanceof RequestValidationError))throw error;results.push({id:item.id,kind:item.kind,ok:false,error:error.message,status:error.status});}}
  return {results,succeeded:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length};
 }
 if(!['moderate','pin','undo','restrict','delete','task'].includes(action))throw new RequestValidationError('الإجراء غير صالح.');
 if(action!=='task')uuid(id);
 if(['moderate','pin','restrict','delete'].includes(action))kind(type,itemKinds);
 if(['pin','restrict','delete','moderate'].includes(action)&&(!data.updated_at||!Number.isFinite(Date.parse(data.updated_at))))throw new RequestValidationError('حمّل أحدث نسخة من العنصر قبل التنفيذ.');
 if(action==='pin'&&typeof data.pinned!=='boolean'||action==='restrict'&&['comments_restricted','questions_restricted'].some(key=>Object.hasOwn(data,key)&&typeof data[key]!=='boolean'))throw new RequestValidationError('قيمة الإجراء غير صالحة.');
 if(['delete','restrict'].includes(action)&&actor.role!=='management')throw new RequestValidationError('هذه العملية متاحة للإدارة فقط.',403);
 if(action==='task'){
  if(typeof data.title!=='string'||!data.title.trim()||data.title.length>250||typeof data.description!=='string'||data.description.length>15000||typeof data.source_url!=='string'||!(data.source_url==='/'||/^\/[^/]/.test(data.source_url))||/[\u0000-\u001f\\]/.test(data.source_url))throw new RequestValidationError('أدخل عنوان المهمة ووصفها ورابط الصفحة المحلي.');
  if(actor.role==='admin'&&data.assigned_to&&data.assigned_to!==actor.user.id)throw new RequestValidationError('يمكنك إسناد المهمة لنفسك فقط.',403);
 }
 return inlineRpc(db,'inline_editor_mutate',{p_action:action,p_kind:type||null,p_id:id||null,p_data:data});
}
