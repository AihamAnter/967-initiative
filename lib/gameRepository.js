import {quizStarter,quizCategories} from './gameQuestions.js';
import {RequestValidationError} from './requestSecurity.js';

export const GAME_QUESTIONS_KEY='967_game_questions_v1';
const trimmed=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const slug=id=>/^[a-z0-9][a-z0-9-]{1,63}$/.test(id||'');
function verifiedUrl(raw){try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password&&raw.length<=800;}catch{return false;}}
export function validateGameQuestion(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!slug(value.id))throw new RequestValidationError('معرّف السؤال غير صالح.');
 if(!Object.hasOwn(quizCategories,value.category)||![1,2,3].includes(value.difficulty))throw new RequestValidationError('تصنيف السؤال أو صعوبته غير صالحة.');
 const question=trimmed(value.question,240);
 if(question.length<15||question.length!==String(value.question||'').trim().length)throw new RequestValidationError('اكتب سؤالاً واضحاً لا يتجاوز 240 حرفاً.');
 if(!Array.isArray(value.options)||value.options.length!==4)throw new RequestValidationError('كل سؤال يحتاج أربعة خيارات.');
 const options=value.options.map(x=>trimmed(x,135));
 if(options.some(x=>!x)||new Set(options).size!==4||value.options.some((x,i)=>typeof x!=='string'||x.trim()!==options[i]))
 throw new RequestValidationError('الاختيارات يجب أن تكون أربعة نصوص مختلفة (حد 135 حرفاً).');
 if(!Number.isInteger(value.correct)||value.correct<0||value.correct>3)throw new RequestValidationError('حدد رقماً صحيحاً للإجابة من الخيارات.');
 const explanation=trimmed(value.explanation,1100);
 if(explanation.length<25||String(value.explanation).trim().length!==explanation.length)throw new RequestValidationError('اكتب تفسيراً لا يقل عن 25 حرفاً ولا يزيد عن 1100.');
 const title=trimmed(value.source?.title,200),url=trimmed(value.source?.url,800);
 if(!title||!verifiedUrl(url))throw new RequestValidationError('يحتاج السؤال إلى مصدر موثوق برابط HTTPS.');
 if(typeof value.isPublished!=='boolean')throw new RequestValidationError('اختر حالة نشر السؤال.');
 return {id:value.id,category:value.category,difficulty:value.difficulty,question,options,correct:value.correct,explanation,source:{title,url},isPublished:value.isPublished};
}
export function mergeGameQuestions(overrides=[]){
 if(!Array.isArray(overrides))throw new RequestValidationError('أرشيف الألعاب غير صالح.',503);
 const combined=new Map(quizStarter.map(q=>[q.id,validateGameQuestion(q)]));
 for(const raw of overrides){const q=validateGameQuestion(raw);combined.set(q.id,q);}
 return [...combined.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
export function parseGameRow(row){
 if(!row)return [];
 if(row.value?.version!==1||!Array.isArray(row.value.questions)||row.value.questions.length>300)throw new RequestValidationError('تعذر قراءة بنك الأسئلة.',503);
 return row.value.questions.map(validateGameQuestion);
}
export async function readGameCatalog(db){
 if(!db)return {questions:mergeGameQuestions(),overrides:[],revision:null,exists:false};
 const {data,error}=await db.from('site_settings').select('key,value,updated_at').eq('key',GAME_QUESTIONS_KEY).maybeSingle();
 if(error)throw new RequestValidationError('تعذر تحميل بنك الأسئلة.',503);
 const overrides=parseGameRow(data);
 return {questions:mergeGameQuestions(overrides),overrides,revision:data?.updated_at||null,exists:!!data};
}
export async function saveGameQuestion(db,{action,question,id,revision,actorId,role}){
 if(!db)throw new RequestValidationError('خدمة التحرير غير مفعلة.',503);
 if(!actorId||!['admin','management'].includes(role))throw new RequestValidationError('لا توجد صلاحية لتحرير الأسئلة.',403);
 if(revision!==null&&(typeof revision!=='string'||revision.length>64||!Number.isFinite(Date.parse(revision))))throw new RequestValidationError('نسخة بنك الأسئلة غير صالحة.');
 const current=await readGameCatalog(db);
 if(revision!==current.revision)throw new RequestValidationError('تغيّر بنك الأسئلة بعد فتحه. حدّث الصفحة قبل حفظ التغييرات.',409);
 const overrides=new Map(current.overrides.map(q=>[q.id,q]));
 if(action==='save'){
  const item=validateGameQuestion(question);
  if(!overrides.has(item.id)&&overrides.size>=290)throw new RequestValidationError('وصل بنك الأسئلة إلى حد التحرير المتاح.',409);
  overrides.set(item.id,item);
 }else if(action==='delete'){
  if(role!=='management')throw new RequestValidationError('الحذف متاح للإدارة فقط.',403);
  if(!slug(id)||quizStarter.some(q=>q.id===id))throw new RequestValidationError('لا يمكن حذف سؤال أساسي؛ استخدم إيقاف النشر.');
  if(!overrides.has(id))throw new RequestValidationError('السؤال غير موجود.',404);
  overrides.delete(id);
 }else throw new RequestValidationError('طلب غير معروف.');
 const stamp=new Date(Math.max(Date.now(),current.revision?Date.parse(current.revision)+1:0)).toISOString();
 const row={key:GAME_QUESTIONS_KEY,value:{version:1,questions:[...overrides.values()],editedAt:stamp,editedBy:actorId},updated_at:stamp};
 const query=current.exists?db.from('site_settings').update(row).eq('key',GAME_QUESTIONS_KEY).eq('updated_at',revision):db.from('site_settings').insert(row);
 const {data,error}=await query.select('updated_at').maybeSingle();
 if(error?.code==='23505'||error?.code==='40001'||(!error&&!data))throw new RequestValidationError('يوجد تعارض في التحرير. أعد تحميل الأسئلة.',409);
 if(error)throw new RequestValidationError('تعذر حفظ السؤال، لم يتم تأكيد العملية.',503);
 return {questions:mergeGameQuestions([...overrides.values()]),revision:data.updated_at};
}
