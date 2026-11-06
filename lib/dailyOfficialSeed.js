import 'server-only';
import {createHmac} from 'node:crypto';
import {dailyGameForDate} from './dailyGame.js';
import {officialDailyTasks} from './dailyVerifiedScore.js';

// The official daily round is drawn with a server-only key, so the questions,
// their order and the option order cannot be computed from the public code.
// GAME_DAILY_SECRET is optional; like CONTACT_RATE_LIMIT_SECRET it falls back
// to the server-only service-role key.
export function officialDailySeed(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Daily date must use YYYY-MM-DD');
 const secret=process.env.GAME_DAILY_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return null;
 return 'official-'+createHmac('sha256',secret).update('967-daily|'+date).digest('hex').slice(0,32);
}

// Question IDs of today's official quiz, or an empty list when today's daily
// game is not the quiz. Practice banks sent to browsers and friend rounds leave
// these out, so their answers are not available before the player commits.
export async function officialQuizIdsToday(db,date,questions=null){
 if(dailyGameForDate(date)!=='quiz')return [];
 const tasks=await officialDailyTasks(db,'quiz',date,{dailyKey:officialDailySeed(date),questions});
 return tasks.map(task=>task.id);
}
