// One official challenge per UTC date across Games 967. Everyone plays the SAME game.
// This rotation is deterministic and independent of local time zone and browser state.
export const LEGACY_DAILY_ORDER=['quiz','place','timeline','map'];
export const DAILY_GAME_ORDER=['quiz','place','timeline','map','who','bigger','connect','yemenword','object'];
// Freeze the former four-game schedule through 29 October 2026.
// New players see a nine-game rotation starting 30 October 2026 (UTC).
export const EXPANSION_UTC_DATE='2026-10-30';
export function utcDay(value=new Date()){
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))throw Error('Invalid UTC date');
 return date.toISOString().slice(0,10);
}
export function dailyGameForDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||utcDay(date+'T12:00:00Z')!==date)throw Error('Invalid daily date');
 const days=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
 if(date<EXPANSION_UTC_DATE)return LEGACY_DAILY_ORDER[((days%4)+4)%4];
 const start=Math.floor(Date.parse(EXPANSION_UTC_DATE+'T00:00:00Z')/86400000);
 return DAILY_GAME_ORDER[(4+(days-start))%DAILY_GAME_ORDER.length];
}
export function dailyGameUrl(date){return '/games/'+dailyGameForDate(date)+'?mode=daily';}
export function nextUtcMidnight(date){return new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString();}
