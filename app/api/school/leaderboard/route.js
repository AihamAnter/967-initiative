import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {schoolUser} from '@/lib/schoolServer';
import {getSchoolLeaderboard,updateSchoolLeaderboardParticipation} from '@/lib/schoolLeaderboardServer';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache','Vary':'Authorization'}});
function failure(error){
 if(error instanceof RequestValidationError)return respond({error:error.message},error.status);
 console.error('School leaderboard service failure',error?.name||'unknown');
 return respond({error:'تعذر تشغيل المنافسة حاليًا.'},503);
}
export async function GET(request){
 try{
  const db=serverDb(),user=await schoolUser(request,db);
  const period=new URL(request.url).searchParams.get('period')||'week';
  return respond(await getSchoolLeaderboard(db,user,period));
 }catch(error){return failure(error);}
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
  const db=serverDb(),user=await schoolUser(request,db);
  const body=await readJsonObject(request,800);
  if(body.action!=='participation')throw new RequestValidationError('إجراء غير معروف.');
  return respond(await updateSchoolLeaderboardParticipation(db,user,body));
 }catch(error){return failure(error);}
}
