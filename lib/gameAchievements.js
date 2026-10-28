import {DAILY_GAME_ORDER} from './dailyGame.js';

// Stable codes are persisted in Postgres; changing a title never revokes an earned badge.
export const GAME_ACHIEVEMENTS=[
 {code:'first_step',title:'أول خطوة',description:'أكمل أول تحدٍ يومي رسمي.',metric:'completed',goal:1,icon:'flag',tier:'bronze',category:'المشاركة'},
 {code:'explorer',title:'مستكشف 967',description:'أكمل 5 تحديات يومية رسمية.',metric:'completed',goal:5,icon:'compass',tier:'bronze',category:'المشاركة'},
 {code:'veteran',title:'المثابر',description:'أكمل 20 تحديًا رسميًا.',metric:'completed',goal:20,icon:'shield',tier:'silver',category:'المشاركة'},
 {code:'legend',title:'أسطورة 967',description:'أكمل 50 تحديًا رسميًا.',metric:'completed',goal:50,icon:'crown',tier:'gold',category:'المشاركة'},
 {code:'perfect_round',title:'علامة كاملة',description:'أجب إجابة صحيحة عن الأسئلة العشرة في تحدٍ رسمي واحد.',metric:'perfect',goal:1,icon:'target',tier:'gold',category:'الإتقان'},
 {code:'high_score',title:'نجم النقاط',description:'احصل على 900 نقطة أو أكثر في تحدٍ رسمي واحد.',metric:'highScores',goal:1,icon:'star',tier:'silver',category:'الإتقان'},
 {code:'accuracy_5',title:'عين الصقر',description:'أكمل 5 تحديات بنتيجة 8 إجابات صحيحة أو أكثر لكل منها.',metric:'accurateRounds',goal:5,icon:'crosshair',tier:'gold',category:'الإتقان'},
 {code:'streak_3',title:'ثلاثة أيام متتالية',description:'أكمل تحدي اليوم في 3 أيام UTC متتالية.',metric:'longestStreak',goal:3,icon:'flame',tier:'bronze',category:'الاستمرارية'},
 {code:'streak_7',title:'أسبوع من التحدي',description:'أكمل تحدي اليوم في 7 أيام UTC متتالية.',metric:'longestStreak',goal:7,icon:'calendar',tier:'gold',category:'الاستمرارية'},
 {code:'cartographer',title:'خبير الخريطة',description:'أكمل تحدي «أين تقع؟» الرسمي 3 مرات.',metric:'map',goal:3,icon:'map',tier:'silver',category:'الألعاب'},
 {code:'historian',title:'مؤرخ 967',description:'أكمل تحدي «رتب التاريخ» الرسمي 3 مرات.',metric:'timeline',goal:3,icon:'scroll',tier:'silver',category:'الألعاب'},
 {code:'famous_faces',title:'عارف الشخصيات',description:'أكمل تحدي «من أنا؟» الرسمي 3 مرات.',metric:'who',goal:3,icon:'users',tier:'silver',category:'الألعاب'},
 {code:'variety_5',title:'متعدد المواهب',description:'أكمل تحديات رسمية في 5 ألعاب مختلفة.',metric:'uniqueGames',goal:5,icon:'shapes',tier:'silver',category:'التنوع'},
 {code:'variety_9',title:'إتقان العوالم التسعة',description:'أكمل تحديًا رسميًا في كل واحدة من ألعاب 967 التسع.',metric:'uniqueGames',goal:9,icon:'gem',tier:'gold',category:'التنوع'},
];

/** Pure: never accept browser-reported scores or progress; consume verified DB rows only. */
export function calculateGameAchievements(rows){
 const valid=(Array.isArray(rows)?rows:[]).filter(r=>r?.phase==='finished'
  &&Number.isInteger(r.score)&&r.score>=0&&r.score<=1000
  &&Number.isInteger(r.correct_count)&&r.correct_count>=0&&r.correct_count<=10
  &&DAILY_GAME_ORDER.includes(r.game_type)
  &&typeof r.challenge_date==='string'
  &&/^\d{4}-\d{2}-\d{2}$/.test(r.challenge_date)
  &&!Number.isNaN(Date.parse(r.challenge_date+'T00:00:00Z')));
 valid.sort((a,b)=>a.challenge_date.localeCompare(b.challenge_date)
  ||String(a.finished_at||'').localeCompare(String(b.finished_at||'')));
 const progress={
  completed:0,perfect:0,highScores:0,accurateRounds:0,
  longestStreak:0,map:0,timeline:0,who:0,uniqueGames:0
 };
 const knownGames=new Set();
 const knownDays=new Set();
 const earned=new Map();
 let streak=0,previousDay=null;
 for(const item of valid){
  progress.completed++;
  if(item.correct_count===10)progress.perfect++;
  if(item.score>=900)progress.highScores++;
  if(item.correct_count>=8)progress.accurateRounds++;
  if(item.game_type==='map')progress.map++;
  if(item.game_type==='timeline')progress.timeline++;
  if(item.game_type==='who')progress.who++;
  knownGames.add(item.game_type);
  progress.uniqueGames=knownGames.size;
  if(!knownDays.has(item.challenge_date)){
   const dayMs=Date.parse(item.challenge_date+'T00:00:00Z');
   streak=previousDay!==null&&dayMs-previousDay===86400000?streak+1:1;
   previousDay=dayMs;
   knownDays.add(item.challenge_date);
   progress.longestStreak=Math.max(streak,progress.longestStreak);
  }
  const earnedAt=item.finished_at||item.challenge_date+'T23:59:59.000Z';
  for(const badge of GAME_ACHIEVEMENTS){
   if(!earned.has(badge.code)&&progress[badge.metric]>=badge.goal)earned.set(badge.code,earnedAt);
  }
 }
 return {
  total:GAME_ACHIEVEMENTS.length,
  earned:earned.size,
  newlyQualified:[...earned].map(([code,earnedAt])=>({code,earnedAt})),
  items:GAME_ACHIEVEMENTS.map(badge=>({
   ...badge,progress:Math.min(progress[badge.metric],badge.goal),
   unlocked:earned.has(badge.code),qualifiedAt:earned.get(badge.code)||null
  }))
 };
}
