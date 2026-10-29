import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {arudOverview,startArudStage,finishArudStage} from '@/lib/schoolArudServer';
import {ARUD_STAGES} from '@/lib/schoolArud';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache'}});
const handle=error=>{
 if(error instanceof RequestValidationError)return response({error:error.message},error.status);
 console.error('School Arud service error',error?.name||'unknown');
 return response({error:'تعذر إتمام العملية التعليمية حاليًا.'},503);
};
export async function GET(request){
 try{const db=serverDb(),user=await schoolUser(request,db);return response(await arudOverview(db,user));}
 catch(error){return handle(error);}
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
  const db=serverDb(),user=await schoolUser(request,db);
  const body=await readJsonObject(request,5500);
  if(body.action==='start'){
   if(!Number.isInteger(body.stage)||body.stage<0||body.stage>=ARUD_STAGES.length)throw new RequestValidationError('اختر محطة صحيحة.');
   return response({attempt:await startArudStage(db,user,body.stage)});
  }
  if(body.action==='submit')return response(await finishArudStage(db,user,body.attemptId,body.answers));
  throw new RequestValidationError('إجراء غير معروف.');
 }catch(error){return handle(error);}
}
