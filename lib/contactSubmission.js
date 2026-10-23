// A CAPTCHA refresh does not change the message. Editing any user/reference
// field does, including after a committed request whose response was lost.
export function contactSubmissionIdentity(previous,payload,createId=()=>globalThis.crypto.randomUUID()){
 const fingerprint=JSON.stringify(['name','email','type','message','referenceTitle','referencePath','referenceId'].map(key=>String(payload[key]||'')));
 return previous?.fingerprint===fingerprint?previous:{id:createId(),fingerprint};
}
