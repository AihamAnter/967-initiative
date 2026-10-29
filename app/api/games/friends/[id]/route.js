import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {friendPlayerAuth,loadFriendMatch,friendMatchPublic,friendMatchAction} from '@/lib/friendChallengeServer';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request,{params}){
 try{
  const db=serverDb();
  const user=await friendPlayerAuth(request,db);
  const {id}=await params;
  const {match,players}=await loadFriendMatch(db,id);
  return respond(await friendMatchPublic(db,user,match,players));
 }catch(e){
  if(e instanceof RequestValidationError)return respond({error:e.message},e.status);
  console.error('Friend challenge lookup error',e?.name||'unexpected');
  return respond({error:'تعذر تحميل تحدي الصديق.'},503);
 }
}
export async function POST(request,{params}){
 try{
  if(!isSameOrigin(request))throw new RequestValidationError('طلب من مصدر غير مسموح.',403);
  const db=serverDb();
  const user=await friendPlayerAuth(request,db);
  const {id}=await params;
  const body=await readJsonObject(request,1250);
  return respond(await friendMatchAction(db,user,id,body));
 }catch(e){
  if(e instanceof RequestValidationError)return respond({error:e.message},e.status);
  console.error('Friend challenge play error',e?.name||'unexpected');
  return respond({error:'تعذر تحديث التحدي الخاص.'},503);
 }
}
