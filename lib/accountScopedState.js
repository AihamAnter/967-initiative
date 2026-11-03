// A missing session must never match the owner of an uninitialized state.
// Keep account data isolated during initial hydration, sign-out and account changes.
export function accountScopedState(state,userId){
 return state!=null && typeof userId==='string' && userId.length>0 && state.owner===userId ? state : null;
}
