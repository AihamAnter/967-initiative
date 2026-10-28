import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {dailyGameUrl,utcDay} from '@/lib/dailyGame';
import {officialGameWeek,calculateWeeklyGameMissions,publicWeeklyGameMissions} from '@/lib/gameWeeklyMissions';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{
 'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'
}});

export async function GET(request){
 const week=officialGameWeek();
 const dailyHref=dailyGameUrl(utcDay());
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)return reply({...publicWeeklyGameMissions(week),authenticated:false,dailyHref});
 try{
  const db=serverDb();
  if(!db)return reply({error:'خدمة المهمات الأسبوعية غير متاحة.'},503);
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth?.user||auth.user.is_anonymous)return reply({error:'سجّل الدخول مجددًا لعرض تقدم المهمات.'},401);

  // Private server read, scoped to the authenticated user and seven UTC dates.
  // Answer keys, untrusted browser points, and other accounts never enter this response.
  const {data,error}=await db.from('game_daily_attempts')
   .select('challenge_date,game_type,phase,score,correct_count')
   .eq('user_id',auth.user.id).eq('phase','finished')
   .gte('challenge_date',week.start).lt('challenge_date',week.end)
   .order('challenge_date',{ascending:true}).limit(7);
  if(error)throw Error('Weekly official attempts query failed');
  return reply({...calculateWeeklyGameMissions(data,week),authenticated:true,dailyHref});
 }catch(error){
  console.error('Weekly games mission read error',error?.name||'unknown');
  return reply({error:'تعذّر تحميل المهمات الأسبوعية. حاول مجددًا.'},503);
 }
}
