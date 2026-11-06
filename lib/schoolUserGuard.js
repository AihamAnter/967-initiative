import {RequestValidationError} from './requestSecurity.js';

// Same rules as games and messaging: unconfirmed or suspended accounts cannot
// save progress, earn XP or appear on the leaderboard.
export function assertSchoolUser(user,error,now=Date.now()){
 if(error||!user||user.is_anonymous)throw new RequestValidationError('يرجى تسجيل الدخول مجددًا.',401);
 if(!user.email_confirmed_at)throw new RequestValidationError('أكّد بريدك الإلكتروني لتحفظ تقدمك في المدرسة.',403);
 if(user.banned_until&&Date.parse(user.banned_until)>now)throw new RequestValidationError('هذا الحساب موقوف.',403);
 return user;
}
