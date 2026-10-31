// Game participation must match the visibility rules used by leaderboards.
// No public profile is required just to play, but a suspended profile or a
// pending account deletion cannot submit new official or friend challenges.
import {RequestValidationError} from './requestSecurity.js';

export async function requireEligibleGameProfile(db,user){
 if(!db||!user?.id)throw new RequestValidationError('تعذر التحقق من أهلية الحساب.',503);
 const {data:profile,error}=await db.from('public_profiles')
  .select('suspended,deletion_requested_at').eq('user_id',user.id).maybeSingle();
 if(error)throw new RequestValidationError('تعذر التحقق من حالة الحساب. حاول لاحقاً.',503);
 if(profile?.suspended)throw new RequestValidationError('مشاركة هذا الحساب موقوفة.',403);
 if(profile?.deletion_requested_at)throw new RequestValidationError('لا يمكن المشاركة أثناء معالجة طلب حذف الحساب.',403);
 return true;
}
