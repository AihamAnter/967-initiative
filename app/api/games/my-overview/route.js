import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {utcDay,dailyGameForDate,nextUtcMidnight} from '@/lib/dailyGame';
import {summarizeOfficialAttempts} from '@/lib/gamePlayerSummary';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const respond=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache'}});

/** Never take a user ID or points from the request: ownership comes from Supabase Auth. */
export async function GET(request){
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)return respond({error:'سجّل الدخول لعرض إحصائيات ألعابك.'},401);
 try{
  const db=serverDb();
  if(!db)return respond({error:'خدمة حسابات الألعاب غير متاحة.'},503);
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth?.user||auth.user.is_anonymous)return respond({error:'يرجى تسجيل الدخول مجددًا.'},401);
  const user=auth.user;
  const date=utcDay();
  const attempts=[];
  // Deliberately select no question_bank, answers, or other players' rows.
  for(let page=0;page<20;page++){
   const {data,error}=await db.from('game_daily_attempts')
    .select('challenge_date,game_type,phase,score,correct_count,finished_at')
    .eq('user_id',user.id)
    .order('challenge_date',{ascending:false})
    .range(page*500,(page+1)*500-1);
   if(error)throw new Error('Player results query failed');
   attempts.push(...data);
   if(data.length<500)break;
   if(page===19)throw new Error('Player results pagination limit reached');
  }
  const today=attempts.find(row=>row.challenge_date===date)||null;
  return respond({
   date,game:dailyGameForDate(date),nextAt:nextUtcMidnight(date),
   daily:{date,used:!!today,finished:today?.phase==='finished',
    score:today?.phase==='finished'?today.score:null,
    correct:today?.phase==='finished'?today.correct_count:null},
   stats:summarizeOfficialAttempts(attempts,date)
  });
 }catch(error){
  console.error('Game overview read error',error?.name||'unknown');
  return respond({error:'تعذر تحميل إحصائيات الألعاب الآن.'},503);
 }
}
