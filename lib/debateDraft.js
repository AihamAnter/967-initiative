// Drafts stay in this browser tab for 30 minutes. No private text enters URLs,
// localStorage, network requests or a different account's restored state.
export const DEBATE_DRAFT_TTL=30*60*1000;
export const DEBATE_DRAFT_PREFIX='967:debate-draft:';
export function safeTabStorage(host=globalThis){try{return host.sessionStorage||null;}catch{return null;}}
export function emptyDebateDraft(){return {comment:'',question:{body:'',participant_id:'',axis:'',anonymous:false}};}
export function readDebateDraft(storage,debateId,owner,now=Date.now()){
 try{const key=DEBATE_DRAFT_PREFIX+debateId,record=JSON.parse(storage.getItem(key)||'null');if(!record)return null;
  if(record.version!==1||!Number.isFinite(record.expiresAt)||record.expiresAt<=now){storage.removeItem(key);return null;}
  if(record.owner!==(owner||'guest'))return null;
  if(typeof record.draft?.comment!=='string'||typeof record.draft?.question?.body!=='string')return null;
  return record.draft;
 }catch{return null;}
}
export function saveDebateDraft(storage,debateId,owner,draft,now=Date.now()){
 try{const key=DEBATE_DRAFT_PREFIX+debateId;if(!draft.comment&&!draft.question.body){storage.removeItem(key);return;}
  const previous=JSON.parse(storage.getItem(key)||'null');
  storage.setItem(key,JSON.stringify({version:1,owner:owner||'guest',draft,expiresAt:now+DEBATE_DRAFT_TTL,...(previous?.owner===(owner||'guest')&&previous.handoff?{handoff:previous.handoff}:{})}));
 }catch{/* Storage may be disabled. Keep the React draft usable. */}
}
export function prepareDebateDraftReturn(storage,debateId,next,token,now=Date.now()){
 try{const key=DEBATE_DRAFT_PREFIX+debateId,record=JSON.parse(storage.getItem(key)||'null');if(!readDebateDraft(storage,debateId,null,now)||record.owner!=='guest')return next;
  record.handoff=token;storage.setItem(key,JSON.stringify(record));const url=new URL(next,'https://local.invalid');url.searchParams.set('draft',token);return url.pathname+url.search+url.hash;
 }catch{return next;}
}
export function claimDebateDraft(storage,next,userId,now=Date.now()){
 if(!userId)return false;
 try{const token=new URL(next,'https://local.invalid').searchParams.get('draft');if(!token)return false;
  for(let index=0;index<storage.length;index++){const key=storage.key(index);if(!key?.startsWith(DEBATE_DRAFT_PREFIX))continue;const record=JSON.parse(storage.getItem(key)||'null');
   if(record?.handoff===token&&record.owner==='guest'&&record.expiresAt>now){record.owner=userId;delete record.handoff;storage.setItem(key,JSON.stringify(record));return true;}
  }
 }catch{/* Never block authentication if browser storage is unavailable. */}
 return false;
}
// A signup user object alone is not proof of authentication: an existing email
// can receive an obfuscated user with no session. Keep its guest handoff intact.
export function claimSessionDebateDraft(storage,next,session,now=Date.now()){
 return claimDebateDraft(storage,next,session?.user?.id,now);
}
