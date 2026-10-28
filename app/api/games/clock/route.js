import {NextResponse} from 'next/server';
import {dailyWindow} from '@/lib/dailyGame';

export const dynamic='force-dynamic';
export const runtime='nodejs';

// Public clock: no account or score information. The server is the UTC time authority.
export function GET(){
 const now=Date.now();
 const schedule=dailyWindow(now);
 return NextResponse.json({
  serverNow:new Date(now).toISOString(),
  date:schedule.date,
  game:schedule.game,
  nextAt:schedule.nextAt,
  nextDate:schedule.nextDate,
  nextGame:schedule.nextGame
 },{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
}
