import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {schoolUser,schoolOverview,startSchoolStage,finishSchoolStage} from '@/lib/schoolServer';
import {MUSNAD_STAGES} from '@/lib/schoolMusnad';
import {saveSchoolDraft} from '@/lib/schoolDraftServer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache'}});
function handleError(error){
 if(error instanceof RequestValidationError)return response({error:error.message},error.status);
 console.error('School service failure',error?.name||'unexpected');
 return response({error:'تعذر إتمام العملية التعليمية حاليًا.'},503);
}
export async function GET(request){
 try{
  const db=serverDb(),user=await schoolUser(request,db);
  return response(await schoolOverview(db,user));
 }catch(error){return handleError(error);}
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
  const db=serverDb(),user=await schoolUser(request,db);
  const body=await readJsonObject(request,14500);
  if(body.action==='start'){
   if(!Number.isInteger(body.stage)||body.stage<0||body.stage>=MUSNAD_STAGES.length)throw new RequestValidationError('اختر مرحلة صالحة.');
   return response({attempt:await startSchoolStage(db,user,body.stage)});
  }
  if(body.action==='save')return response(await saveSchoolDraft(db,user,'musnad',body.attemptId,body.revision,body.draft));
  if(body.action==='submit'){
   return response(await finishSchoolStage(db,user,body.attemptId,body.answers));
  }
  throw new RequestValidationError('إجراء غير معروف.');
 }catch(error){return handleError(error);}
}
