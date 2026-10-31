import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {startGenericSchoolStage,finishGenericSchoolStage,genericSchoolCourseOverview} from '@/lib/schoolGenericServer';
import {saveSchoolDraft} from '@/lib/schoolDraftServer';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request){
 try{
  const db=serverDb(),user=await schoolUser(request,db);
  const slug=new URL(request.url).searchParams.get('slug')||'';
  return respond(await genericSchoolCourseOverview(db,user,slug));
 }catch(e){
  if(e instanceof RequestValidationError)return respond({error:e.message},e.status);
  console.error('School custom course progress',e?.name||'unknown');
  return respond({error:'تعذر تحميل تقدم المسار.',},503);
 }
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
  const db=serverDb(),user=await schoolUser(request,db),body=await readJsonObject(request,8500);
  if(body.action==='start')return respond({attempt:await startGenericSchoolStage(db,user,body.slug,body.stage,body.labProof)});
  if(body.action==='submit')return respond(await finishGenericSchoolStage(db,user,body.slug,body.attemptId,body.answers));
  if(body.action==='save')return respond(await saveSchoolDraft(db,user,body.slug,body.attemptId,body.revision,body.draft));
  throw new RequestValidationError('إجراء غير معروف.');
 }catch(e){
  if(e instanceof RequestValidationError)return respond({error:e.message},e.status);
  console.error('School custom lessons',e?.name||'unknown');
  return respond({error:'تعذر تنفيذ التمرين حاليًا.'},503);
 }
}