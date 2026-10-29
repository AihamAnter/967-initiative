import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {friendPlayerAuth,createFriendChallenge} from '@/lib/friendChallengeServer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب من مصدر غير مسموح.',403);
  const db=serverDb();
  const user=await friendPlayerAuth(request,db);
  const body=await readJsonObject(request,500);
  const created=await createFriendChallenge(db,user,body);
  return respond(created,201);
 }catch(e){
  if(e instanceof RequestValidationError)return respond({error:e.message},e.status);
  console.error('Friend challenge creation error',e?.name||'unexpected');
  return respond({error:'تعذر إنشاء تحدي الصديق.'},503);
 }
}
