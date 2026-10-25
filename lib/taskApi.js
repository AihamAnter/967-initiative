import {authorizeEditorRequest} from './adminAuthorization.js';
import {recordOperationalEvent} from './operationalEvents.js';
import {readJsonObject,RequestValidationError} from './requestSecurity.js';
import {readTaskWorkspace,readTaskDetail,mutateTask} from './taskRepository.js';

export async function handleTaskRequest(request,createDb){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization'}});
 try{
  const db=createDb(request),actor=await authorizeEditorRequest(request,db);
  if(request.method==='GET'){
   const params=new URL(request.url).searchParams,id=params.get('id');
   const maintenance=await db.rpc('task_archive_completed');
   if(maintenance.error&&!['42883','PGRST202'].includes(maintenance.error.code))throw new RequestValidationError('تعذر تأكيد الأرشفة التلقائية. أعد المحاولة.',503);
   return json({...(id?await readTaskDetail(db,id):await readTaskWorkspace(db,actor,params)),auto_archive_available:!maintenance.error});
  }
  if(request.method!=='POST')return json({error:'العملية غير مدعومة.'},405);
  const body=await readJsonObject(request,256000);
  return json(await mutateTask(db,actor,body),body.action==='create'?201:200);
 }catch(error){const status=error instanceof RequestValidationError?error.status:503;if(status>=500)recordOperationalEvent('api_failure',{source:'api',route:'/api/admin/tasks',status});return json({error:error instanceof RequestValidationError?error.message:'تعذر تنفيذ العملية. أعد تحميل البيانات وحاول مجدداً.'},status);}
}
