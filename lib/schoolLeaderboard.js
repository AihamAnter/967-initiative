// Public leaderboard exposes aliases only; never identity, profile, email or UUID.
export const SCHOOL_LEADERBOARD_PERIODS=['week','month'];
export function leaderboardWindow(period,now=new Date()){
 if(!SCHOOL_LEADERBOARD_PERIODS.includes(period))throw Error('Invalid leaderboard period');
 const dt=new Date(now);
 if(!Number.isFinite(dt.valueOf()))throw Error('Invalid date');
 let start;
 if(period==='week'){
  const monday=(dt.getUTCDay()+6)%7;
  start=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate()-monday));
 }else start=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),1));
 const end=period==='week'?new Date(start.valueOf()+7*86400000):
  new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1));
 return {start:start.toISOString(),end:end.toISOString(),zone:'UTC'};
}
export function normalizeLeaderboardNickname(value){
 if(typeof value!=='string')throw Error('Invalid nickname');
 const nickname=value.normalize('NFC').trim().replace(/\s+/gu,' ');
 if(nickname.length<2||nickname.length>24||!/^[\p{L}\p{N}_ ]+$/u.test(nickname))throw Error('Invalid nickname');
 return nickname;
}
