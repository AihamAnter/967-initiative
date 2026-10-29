import 'server-only';
import {RequestValidationError} from './requestSecurity.js';
import {leaderboardWindow,normalizeLeaderboardNickname,SCHOOL_LEADERBOARD_PERIODS} from './schoolLeaderboard.js';
const TABLE='school_leaderboard_preferences';
export async function getSchoolLeaderboard(db,user,period='week'){
 if(!db||!user?.id)throw new RequestValidationError('سجّل الدخول.',401);
 if(!SCHOOL_LEADERBOARD_PERIODS.includes(period))throw new RequestValidationError('الفترة غير صالحة.');
 const [{data:settings,error:prefError},{data:ranking,error:rankError}]=await Promise.all([
  db.from(TABLE).select('opted_in,nickname').eq('user_id',user.id).maybeSingle(),
  db.rpc('school_leaderboard_top',{p_period:period})
 ]);
 if(prefError||rankError)throw new RequestValidationError('تعذر قراءة ترتيب المتعلمين حاليًا.',503);
 return {
  period,window:leaderboardWindow(period),myProfile:{optedIn:settings?.opted_in===true,nickname:settings?.nickname||''},
  entries:(ranking||[]).map(row=>({rank:Number(row.place),nickname:row.nickname,xp:Number(row.points),stages:Number(row.stages)}))
 };
}
export async function updateSchoolLeaderboardParticipation(db,user,body){
 if(!db||!user?.id)throw new RequestValidationError('سجّل الدخول.',401);
 if(typeof body?.optedIn!=='boolean')throw new RequestValidationError('اختر المشاركة أو إخفاء حسابك.');
 let nickname=null;
 if(body.optedIn){
  try{nickname=normalizeLeaderboardNickname(body.nickname);}catch{
   throw new RequestValidationError('اسم العرض يجب أن يتكون من 2 إلى 24 حرفًا أو رقمًا أو مسافة، دون رموز خاصة.');
  }
 }
 const {error}=await db.from(TABLE).upsert({
  user_id:user.id,opted_in:body.optedIn,nickname,updated_at:new Date().toISOString()
 },{onConflict:'user_id'});
 if(error?.code==='23505')throw new RequestValidationError('اسم العرض مستخدم بالفعل؛ اختر اسمًا آخر.',409);
 if(error)throw new RequestValidationError('تعذر حفظ تفضيلات المنافسة.',503);
 return {optedIn:body.optedIn,nickname:nickname||''};
}
