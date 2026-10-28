import 'server-only';
import {calculateGameAchievements} from './gameAchievements.js';

/** Idempotent award reconciler: supports past results, concurrent requests and new badges. */
export async function syncPlayerAchievements(db,userId){
 if(!db||!userId)throw new Error('Authenticated achievement context required');
 const rows=[];
 for(let page=0;page<30;page++){
  const {data,error}=await db.from('game_daily_attempts')
   .select('challenge_date,game_type,phase,score,correct_count,finished_at')
   .eq('user_id',userId).eq('phase','finished')
   .order('challenge_date',{ascending:true}).range(page*500,(page+1)*500-1);
  if(error)throw new Error('Achievement history unavailable');
  rows.push(...data);
  if(data.length<500)break;
  if(page===29)throw new Error('Achievement history page limit reached');
 }
 const computed=calculateGameAchievements(rows);
 if(computed.newlyQualified.length){
  const {error}=await db.from('game_player_achievements')
   .upsert(computed.newlyQualified.map(item=>({
    user_id:userId,code:item.code,earned_at:item.earnedAt
   })),{onConflict:'user_id,code',ignoreDuplicates:true});
  if(error)throw new Error('Unable to persist achievements');
 }
 const {data:saved,error:readError}=await db.from('game_player_achievements')
  .select('code,earned_at').eq('user_id',userId);
 if(readError)throw new Error('Unable to read saved achievements');
 const persisted=new Map((saved||[]).map(item=>[item.code,item.earned_at]));
 const items=computed.items.map(item=>({
  code:item.code,title:item.title,description:item.description,
  icon:item.icon,tier:item.tier,category:item.category,
  goal:item.goal,progress:item.progress,
  unlocked:persisted.has(item.code),earnedAt:persisted.get(item.code)||null
 }));
 const earned=items.filter(item=>item.unlocked);
 return {
  earned:earned.length,total:items.length,items,
  recent:[...earned].sort((a,b)=>b.earnedAt.localeCompare(a.earnedAt)).slice(0,4)
 };
}
