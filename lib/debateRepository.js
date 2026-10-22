import {fetchAllRows} from './pagination.js';
import {RequestValidationError} from './requestSecurity.js';
import {validateDebateCommand,UUID,QUESTIONS_AFTER_RECORDING_MESSAGE} from './debates.js';
import {describeDebateAudit} from './debateAudit.js';

export function debateDbError(error){
 if(!error)return;
 if(error.code==='P0QCL')throw Object.assign(new RequestValidationError(QUESTIONS_AFTER_RECORDING_MESSAGE,409),{code:'questions_closed_after_recording'});
 if(error.code==='P0VPH')throw Object.assign(new RequestValidationError('تغيرت مرحلة استطلاع الرأي أو لم يعد التسجيل متاحاً. حدّث الحالة قبل التصويت.',409),{code:'poll_phase_changed'});
 const code=error.code,status=code==='42501'?403:code==='P0429'?429:['23505','40001'].includes(code)?409:code==='P0002'?404:/^(22|23)/.test(code||'')?400:503;
 const messages={403:'لا يمكنك تنفيذ هذا الإجراء. تحقق من تأكيد بريدك وصلاحيات الحساب وحالة المشاركة.',429:'أرسلت طلبات متقاربة. انتظر دقيقة ثم حاول مجدداً.',409:'سبق حفظ هذا الإجراء أو تغيرت البيانات. أعد تحميلها قبل المحاولة.',404:'العنصر غير موجود.',400:'تحقق من الحقول وحالة المناظرة والتصويت.',503:'خدمة المناظرات غير متاحة حالياً. حاول لاحقاً.'};
 const known=[[/Reserved debate slug/,'هذا الرابط محجوز لصفحات المنصة. اختر رابطاً آخر.'],[/Participant has audience questions/,'لا يمكن إزالة هذا المشارك لوجود أسئلة جمهور موجهة إليه.'],[/Publish at least two/,'اعتمد وانشر ملفَي مشاركين على الأقل قبل نشر المناظرة.'],[/Poll requires/,'أضف خيارين على الأقل لكل استطلاع مفعّل.'],[/Options are locked|Question is locked/,'لا يمكن تغيير السؤال أو خيارات التصويت بعد بدء المشاركة.'],[/Published type and URL/,'نوع المناظرة ورابطها مقفلان بعد أول نشر.'],[/Close enabled polls/,'أغلق مرحلة التصويت قبل نشر نتائجها.'],[/Result snapshot already/,'نُشرت لقطة نتائج هذه المرحلة بالفعل.'],[/No enabled poll/,'فعّل استطلاع هذه المرحلة واحفظه قبل نشر النتائج.'],[/Preparation tasks already/,'مهام تحضير المناظرة موجودة بالفعل في مركز المهام.'],[/Sensitive poll change/,'هذا التغيير يحتاج Management وسبباً موثقاً. لا يمكن إعادة فتح مرحلة نُشرت نتائجها.'],[/Confirm you watched/,'أكد مشاهدة التسجيل المنشور قبل التصويت النهائي.'],[/Poll is closed/,'هذا الاستطلاع مغلق أو لم يفتح بعد.'],[/Already voted/,'سبق التصويت في هذه المرحلة ولا يُسمح بتعديل الاختيار.'],[/Comment changed/,'تغير التعليق منذ تحميله. حدّث القائمة وراجع النص الجديد قبل اعتماده.'],[/Publish the recording first/,'انشر التسجيل أولاً قبل ربطه بالأعمال الإعلامية.'],[/Chapter exceeds/,'بداية أحد الفصول تتجاوز مدة التسجيل.'],[/End the live broadcast/,'أكد انتهاء البث قبل الانتقال إلى التسجيل.']];
 throw new RequestValidationError(known.find(([pattern])=>pattern.test(error.message||''))?.[1]||messages[status],status);
}
export async function debateRpc(db,name,args={}){if(!db)throw new RequestValidationError('خدمة المناظرات غير مفعّلة بعد.',503);const result=await db.rpc(name,args);debateDbError(result.error);return result.data;}
async function rows(db,table,configure=q=>q){try{return await fetchAllRows(()=>{let query=configure(db.from(table).select('*',{count:'exact'}));if(table==='debate_task_links')return query.order('debate_id').order('task_id');return query.order(table==='public_profiles'?'user_id':'id');});}catch{throw new RequestValidationError('تعذر تحميل البيانات. تحقق من Migration المناظرات.',503);}}
export async function readDebateAdmin(db,actor){
 const tables=['debates','debate_speakers','debate_participants','debate_polls','debate_poll_options','debate_video_chapters','debate_questions','debate_comments','debate_suggestions','debate_reports','debate_task_links'];
 if(actor.role==='management')tables.push('public_profiles','debate_moderation_actions');
 const results=await Promise.all(tables.map(table=>rows(db,table)));
 const capabilities=await db.rpc('inline_editor_read',{p_view:'capabilities'});
 // Existing installations can still use the original dashboard before applying
 // the additive inline migration. Authorization and other failures must surface.
 if(capabilities.error&&!['42704','42883'].includes(capabilities.error.code))debateDbError(capabilities.error);
 const capabilityMap=capabilities.data?.capabilities;
 if(capabilityMap)for(const name of ['comments','questions','reports']){
  const records=results[tables.indexOf('debate_'+name)];
  for(const record of records)record.capabilities=capabilityMap[name]?.[record.id]||{statuses:[],pin:false,account:false,restrict:false,history:false,delete:false};
 }
 const workspace=Object.fromEntries(tables.map((t,i)=>[t,results[i]]));
 if(actor.role==='management'){
  const team=await db.rpc('task_team');
  // Older installations can resolve names from public profiles when the task
  // center is absent. Authentication/connection failures must still surface.
  if(team.error&&!['42704','42883'].includes(team.error.code))debateDbError(team.error);
  workspace.debate_moderation_actions=describeDebateAudit(workspace.debate_moderation_actions,workspace,actor,team.data||[]);
 }
 return {actor:{id:actor.user.id,role:actor.role},...workspace};
}
export async function readAudienceAccount(db,user,params){
 const profile=await db.from('public_profiles').select('*').eq('user_id',user.id).maybeSingle();debateDbError(profile.error);
 const page=Math.max(1,Math.min(10000,parseInt(params.get('page'),10)||1));
 const tables=['debate_comments','debate_questions','debate_suggestions','debate_votes'];
 const activity=await Promise.all(tables.map(async table=>{let query=db.from(table).select('*',{count:'exact'}).eq('user_id',user.id);if(params.has('debate')&&table!=='debate_suggestions')query=query.eq('debate_id',requireDebateId(params.get('debate')));const voteSummary=table==='debate_votes'&&params.has('debate');const result=await query.order('created_at',{ascending:false}).order('id').range(voteSummary?0:(page-1)*20,voteSummary?1:page*20-1);debateDbError(result.error);return [table,{items:result.data||[],total:result.count||0}];}));
 if(params.get('activity')==='1'&&!params.has('debate')){
  const catalog=await db.rpc('debate_catalog'),visible=new Map((catalog.data||[]).map(d=>[d.id,d]));
  const voteItems=activity.find(([name])=>name==='debate_votes')[1].items;
  const voteDebates=[...new Set(voteItems.map(v=>v.debate_id))].filter(id=>visible.has(id));
  const details=await Promise.all(voteDebates.map(async id=>{const detail=await db.rpc('debate_detail',{p_slug:visible.get(id).slug});return [id,detail.data];}));
  const voteContext=new Map(details);
  for(const [table,records] of activity)for(const item of records.items){
   const debate=visible.get(item.debate_id);
   if(debate){item.debate_title=debate.title;item.debate_slug=debate.slug;}
   if(table==='debate_votes'){
    const detail=voteContext.get(item.debate_id);
    item.phase=detail?.polls?.find(p=>p.id===item.poll_id)?.phase||null;
    item.option_label=detail?.options?.find(o=>o.id===item.option_id)?.label||null;
   }
  }
 }
 return {user:{id:user.id,email:user.email,email_confirmed_at:user.email_confirmed_at,created_at:user.created_at},profile:profile.data,page,...Object.fromEntries(activity)};
}
export async function mutateDebate(db,body,admin=false){
 const command=validateDebateCommand(body,admin);
 // Availability is checked inside the canonical RPC under a row lock. The API
 // returns typed Arabic errors; a separate read-time preflight could race with
 // publication before the write commits.
 const result=await debateRpc(db,admin?'debate_admin_mutate':'debate_audience_mutate',{p_action:command.action,p_id:command.id||null,...(admin?{p_revision:command.revision||null}:{}),p_data:command.data});
 if(admin||!['comment','question','comment_edit'].includes(command.action)||result?.status)return result;
 // Compatibility with an older database: acknowledge a committed save without
 // inventing a published status. A failed verification must not invite a
 // duplicate POST after a successful write. Owner RLS controls this read.
 try{const saved=await db.from(command.action==='question'?'debate_questions':'debate_comments').select('id,status').eq('id',result.id).maybeSingle();return {...result,status:!saved.error?saved.data?.status||null:null};}
 catch{return {...result,status:null};}
}
export function requireDebateId(id){if(!UUID.test(id||''))throw new RequestValidationError('معرّف غير صالح.');return id;}
