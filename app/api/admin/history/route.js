import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {readHistoryCatalog,writeHistoryEntry} from '@/lib/historyRepository';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request,action){
 try{
  const db=serverDb();
  const auth=await authorizeEditorRequest(request,db);
  if(!action){
   const catalog=await readHistoryCatalog(db);
   return json({...catalog,canDelete:auth.role==='management'});
  }
  const body=await readJsonObject(request,120000);
  if(!Object.hasOwn(body,'revision'))throw new RequestValidationError('أعد تحميل الأرشيف لتحديد نسخة التحرير.');
  const result=await writeHistoryEntry(db,{action,entry:body.entry,slug:body.slug,revision:body.revision,actorId:auth.user.id,role:auth.role});
  return json({ok:true,...result});
 }catch(error){
  if(error instanceof RequestValidationError)return json({error:error.message},error.status);
  console.error('yemen history admin:',error?.code||error?.name||'service');
  return json({error:'تعذر إتمام العملية. لم يُؤكد حفظ المادة.'},503);
 }
}
export const GET=request=>handle(request);
export const PUT=request=>handle(request,'save');
export const DELETE=request=>handle(request,'delete');
