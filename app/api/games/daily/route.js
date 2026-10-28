import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {utcDay,dailyGameForDate,nextUtcMidnight} from '@/lib/dailyGame';
import {officialQuestionSnapshot} from '@/lib/dailyVerifiedScore';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, private','Pragma':'no-cache'}});

async function verifiedPlayer(request,db){
 if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
 if(!db)throw new RequestValidationError('نظام التحديات الرسمية غير متاح حالياً.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)throw new RequestValidationError('سجّل الدخول للمشاركة في تحدي اليوم.',401);
 let result;
 try{result=await db.auth.getUser(token);}catch{throw new RequestValidationError('تعذر التحقق من الحساب.',503);}
 if(result.error||!result.data?.user)throw new RequestValidationError('سجّل الدخول مجدداً للمشاركة.',401);
 const user=result.data.user;
 if(!user.email_confirmed_at||user.is_anonymous)throw new RequestValidationError('أكد البريد الإلكتروني قبل المشاركة في تحدي اليوم.',403);
 if(user.banned_until&&Date.parse(user.banned_until)>Date.now())throw new RequestValidationError('هذا الحساب موقوف.',403);
 return user;
}
async function handle(request,claim){
 try{
  const db=serverDb();
  const user=await verifiedPlayer(request,db);
  // The client never decides the date or challenge; the server uses UTC only.
  const date=utcDay();
  const game=dailyGameForDate(date);
  const nextAt=nextUtcMidnight(date);
  if(claim){
   const body=await readJsonObject(request,512);
   if(body.date!==date||body.game!==game)throw new RequestValidationError('بدأ تحدي يوم جديد. حدّث الصفحة لتجربة تحدي اليوم الصحيح.',409);
   const questionBank=await officialQuestionSnapshot(db,game,date);
   const {data,error}=await db.from('game_daily_attempts')
    .insert({user_id:user.id,challenge_date:date,game_type:game,question_bank:questionBank,phase:'question',step_index:0,question_started_at:null})
    .select('challenge_date,game_type,started_at').single();
   if(error?.code==='23505')return respond({error:'استخدمت محاولتك اليوم. يعود التحدي غداً عند 00:00 UTC.',used:true,date,game,nextAt},409);
   if(error){console.error('Daily game claim failure',error.code||'unknown');throw new RequestValidationError('تعذر حجز المحاولة بأمان. لم يبدأ التحدي.',503);}
   return respond({used:true,claimed:true,date,game,nextAt,startedAt:data.started_at});
  }
  const {data,error}=await db.from('game_daily_attempts')
   .select('challenge_date,game_type,started_at').eq('user_id',user.id).eq('challenge_date',date).maybeSingle();
  if(error)throw new RequestValidationError('تعذر التأكد من محاولتك اليومية. حاول مجدداً.',503);
  return respond({used:!!data,date,game,nextAt,startedAt:data?.started_at||null});
 }catch(error){
  if(error instanceof RequestValidationError)return respond({error:error.message},error.status);
  console.error('Daily game error',error?.name||'unexpected');
  return respond({error:'تعذر التحقق من حالة التحدي. حاول مجدداً.'},503);
 }
}
export const GET=request=>handle(request,false);
export const POST=request=>handle(request,true);
