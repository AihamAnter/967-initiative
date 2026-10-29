import {MUSNAD_STAGES} from './schoolMusnad.js';

// Administrative preview is based only on the trusted editors table and an
// authenticated, confirmed, non-banned user. Never trust client-supplied roles.
export const SCHOOL_PREVIEW_ROLES=['admin','management'];

export function eligibleSchoolStaff(user,role,now=Date.now()){
 if(!SCHOOL_PREVIEW_ROLES.includes(role)||!user?.id||!user.email_confirmed_at)return false;
 if(user.banned_until&&Date.parse(user.banned_until)>now)return false;
 return true;
}

export async function schoolStaffPreview(db,user){
 if(!user?.id||!user.email_confirmed_at||(user.banned_until&&Date.parse(user.banned_until)>Date.now()))return false;
 const {data,error}=await db.from('editors').select('role').eq('user_id',user.id).maybeSingle();
 if(error)throw new Error('School staff lookup failed');
 return eligibleSchoolStaff(user,data?.role);
}

export function canStartSchoolStage(stageIndex,unlocked,staffPreview=false){
 return Number.isInteger(stageIndex)&&stageIndex>=0&&stageIndex<MUSNAD_STAGES.length
  &&(staffPreview||stageIndex<=unlocked);
}
