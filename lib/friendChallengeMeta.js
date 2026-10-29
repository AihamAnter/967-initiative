import {DAILY_GAME_ORDER,DAILY_GAME_TITLES} from './dailyGame.js';
export const FRIEND_GAMES=DAILY_GAME_ORDER;
export const FRIEND_SECONDS=[10,15,20,30];
export const FRIEND_QUESTIONS=10;
export function friendGameTitle(game){return DAILY_GAME_TITLES[game]||'تحدي 967';}
