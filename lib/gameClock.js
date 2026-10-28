export const PRACTICE_DURATIONS=[10,15,20,30];
export const DAILY_DURATION=7;
export function roundDuration(mode,selection=15){return mode==='daily'?DAILY_DURATION:PRACTICE_DURATIONS.includes(selection)?selection:15;}
export function millisecondsRemaining(deadline,now){return Math.max(0,deadline-now);}
export function secondsRemaining(deadline,now){return Math.ceil(millisecondsRemaining(deadline,now)/1000);}
