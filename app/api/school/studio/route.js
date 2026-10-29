import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {schoolStudioOverview,saveSchoolContent,schoolAnalyticsReport} from '@/lib/schoolStudioServer';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const answer=(x,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
const fail=e=>{
 if(e instanceof RequestValidationError)return answer({error:e.message},e.status);
 console.error('School studio API',e?.name||'unknown');
 return answer({error:'تعذر إكمال العملية في محرر المدرسة.'},503);
};
export async function GET(request){
 try{
  const db=serverDb(),user=await schoolUser(request,db);
  if(new URL(request.url).searchParams.get('view')==='analytics')return answer(await schoolAnalyticsReport(db,user));
  return answer(await schoolStudioOverview(db,user));
 }catch(e){return fail(e);}
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('الطلب غير مسموح.',403);
  const db=serverDb(),user=await schoolUser(request,db),body=await readJsonObject(request,11000);
  return answer(await saveSchoolContent(db,user,body));
 }catch(e){return fail(e);}
}
