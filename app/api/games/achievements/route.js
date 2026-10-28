import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {syncPlayerAchievements} from '@/lib/gameAchievementRepository.js';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{
 'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'
}});

export async function GET(request){
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)return reply({error:'سجّل الدخول لعرض إنجازاتك.'},401);
 try{
  const db=serverDb();
  if(!db)return reply({error:'خدمة الإنجازات غير متاحة الآن.'},503);
  const {data,error}=await db.auth.getUser(token);
  if(error||!data?.user||data.user.is_anonymous)return reply({error:'انتهت جلسة الحساب. سجّل الدخول مجددًا.'},401);
  const collection=await syncPlayerAchievements(db,data.user.id);
  return reply(collection);
 }catch(error){
  console.error('Games achievements read failed',error?.name||'unknown');
  return reply({error:'تعذر تحميل إنجازاتك، حاول لاحقًا.'},503);
 }
}
