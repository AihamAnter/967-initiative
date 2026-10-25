import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {taskRequestDb} from '@/lib/taskServer';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
export const dynamic='force-dynamic';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
async function handle(request){try{
 const db=taskRequestDb(request);await authorizeEditorRequest(request,db);
 let result;
 if(request.method==='GET'){
  const p=new URL(request.url).searchParams,filters=Object.fromEntries(['q','status','type','from','to','assignee','page','tz'].map(key=>[key,(p.get(key)||'').slice(0,150)]));
  filters.tz=filters.tz||'UTC';
  for(const field of ['from','to'])if(filters[field]&&!/^\d{4}-\d\d-\d\d$/.test(filters[field]))throw new RequestValidationError('التاريخ غير صالح.');
  filters.page=Math.max(1,Math.min(100000,Number.parseInt(filters.page,10)||1));result=await db.rpc('editor_messages',{p_filters:filters});
 }else{
  const body=await readJsonObject(request,20000);if(!/^[0-9a-f-]{36}$/i.test(body.id)||!Number.isSafeInteger(body.revision)||body.revision<0)throw new RequestValidationError('معرّف الطلب أو نسخته غير صالح.');
  result=await db.rpc('editor_message_update',{p_id:body.id,p_revision:body.revision,p_data:body.data});
 }
 if(result.error)throw result.error;return json(result.data);
 }catch(error){const status=error instanceof RequestValidationError?error.status:error.code==='40001'?409:error.code==='42501'?403:/^22/.test(error.code||'')?400:503;return json({error:error instanceof RequestValidationError?error.message:status===409?'حُفظت نسخة أحدث من متابعة الطلب. أعد تحميله قبل المحاولة.':'تعذر تنفيذ المتابعة. تحقق من الاتصال وتفعيل تحديث الرسائل.'},status);}}
export const GET=handle;
export const POST=handle;
