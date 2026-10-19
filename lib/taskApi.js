import {authorizeEditorRequest} from './adminAuthorization.js';
import {readJsonObject,RequestValidationError} from './requestSecurity.js';
import {readTaskWorkspace,readTaskDetail,mutateTask} from './taskRepository.js';

export async function handleTaskRequest(request,createDb){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization'}});
 try{
  const db=createDb(request),actor=await authorizeEditorRequest(request,db);
  if(request.method==='GET'){
   const params=new URL(request.url).searchParams,id=params.get('id');
   return json(id?await readTaskDetail(db,id):await readTaskWorkspace(db,actor,params));
  }
  if(request.method!=='POST')return json({error:'العملية غير مدعومة.'},405);
  const body=await readJsonObject(request,256000);
  return json(await mutateTask(db,actor,body),body.action==='create'?201:200);
 }catch(error){return json({error:error instanceof RequestValidationError?error.message:'تعذر تنفيذ العملية. أعد تحميل البيانات وحاول مجدداً.'},error instanceof RequestValidationError?error.status:503);}
}
