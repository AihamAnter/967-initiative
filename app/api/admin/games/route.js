import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {readGameCatalog,saveGameQuestion} from '@/lib/gameRepository';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request,action){
 try{
  const db=serverDb();
  const auth=await authorizeEditorRequest(request,db);
  if(!action){
   const catalog=await readGameCatalog(db);
   return respond({...catalog,canDelete:auth.role==='management'});
  }
  const body=await readJsonObject(request,120000);
  if(!Object.hasOwn(body,'revision'))throw new RequestValidationError('أعد تحميل الأسئلة قبل التحرير.');
  const result=await saveGameQuestion(db,{action,question:body.question,id:body.id,revision:body.revision,actorId:auth.user.id,role:auth.role});
  return respond({ok:true,...result});
 }catch(error){
  if(error instanceof RequestValidationError)return respond({error:error.message},error.status);
  console.error('Games editorial error:',error?.code||error?.name||'unknown');
  return respond({error:'تعذر إتمام العملية. لم يؤكد حفظ السؤال.'},503);
 }
}
export const GET=request=>handle(request);
export const PUT=request=>handle(request,'save');
export const DELETE=request=>handle(request,'delete');
