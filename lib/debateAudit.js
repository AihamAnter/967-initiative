import {UUID} from './debates.js';

const kinds={debates:'مناظرة',comments:'تعليق',questions:'سؤال',reports:'بلاغ',suggestions:'مقترح',speakers:'ملف مشارك',account:'حساب مستخدم'};
const text=(value,max=140)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,max):'';
const name=value=>{const label=text(value,120);return label&&!UUID.test(label)&&label!=='عضو الفريق'?label:'';};
export const auditDateOptions={year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'};

export function auditActionLabel(entry){
 const before=entry.before_value||{},after=entry.after_value||{},kind=entry.target_kind||entry.kind;
 const object=kinds[kind]||'المشاركة';
 if(entry.undo_of)return 'التراجع عن الإخفاء';
 if(entry.action==='moderate'){
  if(before.status==='hidden'&&after.status)return 'استعادة '+object;
  if(after.status==='approved')return before.status==='selected'?'إلغاء اختيار السؤال':before.status==='answered'?'إعادة السؤال إلى المنشور':'نشر '+object;
  const statuses={hidden:'إخفاء '+object,rejected:'رفض '+object,selected:'اختيار سؤال للمناظرة',answered:'تحديد السؤال كمجاب عنه',resolved:'معالجة البلاغ',dismissed:'استبعاد البلاغ',open:'إعادة فتح البلاغ',pending:'إعادة التعليق للمراجعة',new:'إعادة السؤال للمراجعة'};
  return statuses[after.status]||'مراجعة '+object;
 }
 if(entry.action==='save'){
  if(before.publication_status!==after.publication_status){
   if(after.publication_status==='hidden')return 'إخفاء المناظرة';
   if(after.publication_status==='archived')return 'أرشفة المناظرة';
   if(after.publication_status==='published')return before.publication_status==='hidden'?'إعادة نشر المناظرة':'نشر المناظرة';
  }
  return 'تعديل بيانات المناظرة';
 }
 if(entry.action==='pin')return after.pinned===false?'إلغاء تثبيت تعليق':after.pinned===true?'تثبيت تعليق':'تغيير تثبيت تعليق';
 if(entry.action==='suspend')return after.suspended===false?'إعادة تفعيل المشاركة':after.suspended===true?'تعطيل المشاركة':'تغيير حالة المشاركة';
 if(entry.action==='results_visibility')return after.live_results_enabled===false?'إخفاء نتائج الاستطلاع':after.live_results_enabled===true?'إظهار نتائج الاستطلاع':'تغيير ظهور نتائج الاستطلاع';
 const actions={speaker:'تحديث ملف مشارك',convert:'تحويل مقترح إلى مناظرة',delete:'حذف '+(kinds[kind]||'المحتوى'),anonymize:'إخفاء هوية حساب',restrict:'تغيير قيود المشاركة',results_publish:'حفظ لقطة نتائج الاستطلاع',tasks:'إنشاء مهام تحضير المناظرة',media:'ربط التسجيل بالأعمال الإعلامية',insert:'إضافة محتوى',create:'إضافة محتوى',update:'تعديل المحتوى',undo:'استعادة نشر المحتوى'};
 return actions[entry.action]||'إجراء إشرافي';
}

// Resolve only existing administrative projections. No email, ballot data or
// anonymous question author is needed to make an audit record understandable.
export function describeDebateAudit(entries,workspace,actor,team=[]){
 const tables={debates:'debates',comments:'debate_comments',questions:'debate_questions',reports:'debate_reports',suggestions:'debate_suggestions',speakers:'debate_speakers',account:'public_profiles'};
 const indexes=Object.fromEntries(Object.entries(tables).map(([kind,table])=>[kind,new Map((workspace[table]||[]).map(row=>[row.id||row.user_id,row]))]));
 const members=new Map(team.map(member=>[member.user_id,member]));
 return entries.map(entry=>{
  const member=members.get(entry.actor_id),profile=indexes.account.get(entry.actor_id);
  const self=entry.actor_id===actor.user.id?actor.user.user_metadata:{};
  const actorName=entry.actor_id?name(self?.full_name)||name(self?.display_name)||name(member?.display_name)||name(profile?.display_name)||'محرر غير مسمّى':'مسؤول سابق';
  let kind=entry.target_kind,record=indexes[kind]?.get(entry.target_id);
  if(!record){const found=Object.entries(indexes).find(([,index])=>index.has(entry.target_id));if(found){kind=found[0];record=found[1].get(entry.target_id);}}
  const snapshot=entry.after_value||entry.before_value||{};
  if(!kind&&['save','delete','results_publish','results_visibility','tasks','media','convert'].includes(entry.action))kind='debates';
  if(!kind&&entry.action==='speaker')kind='speakers';
  if(!kind&&['suspend','anonymize','restrict'].includes(entry.action))kind='account';
  const type=kinds[kind]||'عنصر';
  const removed=!record||record.status==='deleted';
  // Deleted text is deliberately never recovered from old audit snapshots.
  const title=record?(kind==='account'?text(record.display_name):kind==='speakers'?text(record.name):['comments','questions','reports'].includes(kind)?(!removed&&text(record.body||record.reason)):text(record.title)):text(snapshot.title||snapshot.name||entry.before_value?.title||entry.before_value?.name);
  const label=record?.status==='deleted'?type+' محذوف':title?type+(kind==='questions'&&record?.anonymous?' باسم «مشارك»':'')+': «'+title+'»':type+' غير متاح';
  const debateId=kind==='debates'?record?.id:record?.debate_id||(kind==='reports'?indexes.comments.get(record?.comment_id)?.debate_id:null);
  const debate=indexes.debates.get(debateId);
  let href=null;
  if(record&&['debates','comments','questions','reports'].includes(kind)){
   const query=new URLSearchParams();
   if(debateId)query.set('debate',debateId);
   if(['comments','questions','reports'].includes(kind)){query.set('tab','moderation');query.set('kind',kind);query.set('item',record.id);}
   href='/admin/debates'+(query.size?'?'+query:'');
  }
  const enriched={...entry,target_kind:kind,actor_name:actorName,target_label:label,target_context:kind!=='debates'&&debate?'في مناظرة «'+text(debate.title)+'»':null,target_href:href};
  return {...enriched,action_label:auditActionLabel(enriched)};
 });
}
