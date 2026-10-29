import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {schoolDashboardOverview} from '@/lib/schoolDashboardServer';
import {RequestValidationError} from '@/lib/requestSecurity';

export const runtime='nodejs';
export const dynamic='force-dynamic';
function respond(body,status=200){
 return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache','Vary':'Authorization'}});
}
export async function GET(request){
 try{
  const db=serverDb(),user=await schoolUser(request,db);
  return respond(await schoolDashboardOverview(db,user));
 }catch(error){
  if(error instanceof RequestValidationError)return respond({error:error.message},error.status);
  console.error('School dashboard unavailable',error?.name||'unknown');
  return respond({error:'تعذر تحميل رحلتك التعليمية حاليًا.'},503);
 }
}
