import {authorizeEditorRequest} from './adminAuthorization.js';
import {recordOperationalEvent} from './operationalEvents.js';
import {readJsonObject,RequestValidationError} from './requestSecurity.js';
import {readInlineEditor,mutateInlineEditor} from './inlineEditorRepository.js';

export async function handleInlineEditorRequest(request,createDb){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization'}});
 try{
  const db=createDb(request),actor=await authorizeEditorRequest(request,db);
  if(request.method==='GET')return json(await readInlineEditor(db,actor,new URL(request.url).searchParams));
  if(request.method!=='POST')return json({error:'إجراء غير مدعوم.'},405);
  return json(await mutateInlineEditor(db,actor,await readJsonObject(request,180000)));
 }catch(error){const status=error instanceof RequestValidationError?error.status:503;if(status>=500)recordOperationalEvent('api_failure',{source:'api',route:'/api/admin/inline',status});return json({error:error instanceof RequestValidationError?error.message:'تعذر إتمام الإجراء. حاول مجدداً.'},status);}
}
