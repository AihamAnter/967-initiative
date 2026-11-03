import {serverDb} from '@/lib/supabase-server';
import {authorizeAudience} from '@/lib/debateApi';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {validateMessagingAction,safeMessagingQuery,messagingError,canReceiveSearchRequests,MESSAGE_PAGE_SIZE,UUID_RE} from '@/lib/privateMessaging';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});
const fail=(message,status)=>json({error:message},status);

async function authorized(request){
 const db=serverDb();
 const user=await authorizeAudience(request,db);
 if(!user.email_confirmed_at||user.banned_until&&Date.parse(user.banned_until)>Date.now())
  throw new RequestValidationError('يجب تأكيد البريد وألا يكون الحساب محظورًا للمراسلة.',403);
 const {data:profile,error}=await db.from('public_profiles')
  .select('suspended,deletion_requested_at').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(profile?.suspended||profile?.deletion_requested_at)
  throw new RequestValidationError('المراسلة غير متاحة لهذا الحساب.',403);
 return {db,user};
}
function check(result){
 if(result.error)throw messagingError(result.error)||result.error;
 return result.data;
}
async function inbox(db,id){
 return check(await db.rpc('private_messaging_inbox',{p_actor:id}))||[];
}
async function getThread(db,id,conversation,before){
 const {data:c,error}=await db.from('private_conversations')
  .select('id,user_low,user_high,status,requested_by,intro,requested_at')
  .eq('id',conversation).maybeSingle();
 if(error)throw error;
 if(!c||![c.user_low,c.user_high].includes(id))throw new RequestValidationError('المحادثة غير موجودة.',404);
 let query=db.from('private_messages')
  .select('id,sender_id,body,created_at')
  .eq('conversation_id',conversation)
  .order('created_at',{ascending:false}).order('id',{ascending:false})
  .limit(MESSAGE_PAGE_SIZE+1);
 if(before)query=query.lt('created_at',before);
 const {data:messages,error:messageError}=await query;
 if(messageError)throw messageError;
 const hasMore=(messages||[]).length>MESSAGE_PAGE_SIZE;
 const page=(messages||[]).slice(0,MESSAGE_PAGE_SIZE);
 const partner=c.user_low===id?c.user_high:c.user_low;
 const {data:p,error:profileError}=await db.from('public_profiles')
  .select('display_name,avatar_url,show_avatar').eq('user_id',partner).maybeSingle();
 if(profileError)throw profileError;
 return {conversation:{id:c.id,status:c.status,requested_by:c.requested_by,intro:c.intro,requested_at:c.requested_at,partner_id:partner,partner_name:p?.display_name||'مستخدم 967',avatar_url:p?.show_avatar?p.avatar_url:null},
  messages:page.reverse(),hasMore,nextBefore:hasMore?page[page.length-1]?.created_at:null};
}
async function search(db,actor,q){
 if(q.length<2)return {users:[]};
 const {data:profiles,error}=await db.from('public_profiles')
  .select('user_id,display_name,avatar_url,show_avatar,suspended,deletion_requested_at')
  .ilike('display_name','%'+q+'%').limit(40);
 if(error)throw error;
 const candidates=(profiles||[]).filter(p=>p.user_id!==actor&&!p.suspended&&!p.deletion_requested_at);
 if(!candidates.length)return {users:[]};
 const ids=candidates.map(p=>p.user_id);
 const [settings,blocks]=await Promise.all([
  db.from('private_messaging_settings').select('user_id,discoverable,allow_requests').in('user_id',ids),
  db.from('private_user_blocks').select('blocker_id,blocked_id')
   .or('blocker_id.eq.'+actor+',blocked_id.eq.'+actor)
 ]);
 if(settings.error)throw settings.error;
 if(blocks.error)throw blocks.error;
 const prefs=new Map((settings.data||[]).map(s=>[s.user_id,s]));
 const forbidden=new Set((blocks.data||[]).map(b=>b.blocker_id===actor?b.blocked_id:b.blocker_id));
 return {users:candidates.filter(p=>canReceiveSearchRequests(prefs.get(p.user_id))&&!forbidden.has(p.user_id)).slice(0,15)
  .map(p=>({id:p.user_id,name:p.display_name,avatar_url:p.show_avatar?p.avatar_url:null}))};
}

// A management-only account-directory deep link. This does not grant a
// conversation or bypass the recipient's messaging privacy/blocks.
// Direct member-profile links are permitted for signed-in members.
// New requests still respect the recipient's settings and both users' blocks.
async function directContact(db,actor,targetId){
 if(actor===targetId)throw new RequestValidationError('لا يمكنك مراسلة نفسك.',400);
 const {data:userInfo,error:userError}=await db.auth.admin.getUserById(targetId);
 if(userError||!userInfo?.user)throw new RequestValidationError('المستخدم المطلوب غير موجود.',404);
 const target=userInfo.user;
 if(!target.email_confirmed_at||target.banned_until&&Date.parse(target.banned_until)>Date.now())
  throw new RequestValidationError('المستخدم غير متاح للمراسلة حاليًا.',409);
 const [profileResult,prefResult,blockResult]=await Promise.all([
  db.from('public_profiles').select('display_name,avatar_url,show_avatar,suspended,deletion_requested_at').eq('user_id',targetId).maybeSingle(),
  db.from('private_messaging_settings').select('allow_requests').eq('user_id',targetId).maybeSingle(),
  db.from('private_user_blocks').select('blocker_id,blocked_id')
   .or('and(blocker_id.eq.'+actor+',blocked_id.eq.'+targetId+'),and(blocker_id.eq.'+targetId+',blocked_id.eq.'+actor+')')
 ]);
 if(profileResult.error||prefResult.error||blockResult.error)
  throw profileResult.error||prefResult.error||blockResult.error;
 const p=profileResult.data;
 if(!p||p.suspended||p.deletion_requested_at)
  throw new RequestValidationError('المستخدم غير متاح للمراسلة حاليًا.',409);
 if(prefResult.data?.allow_requests===false||(blockResult.data||[]).length>0)
  throw new RequestValidationError('هذا المستخدم لا يستقبل طلبات محادثة حاليًا.',403);
 return {person:{id:targetId,name:p.display_name||'عضو 967',avatar_url:p.show_avatar?p.avatar_url:null}};
}

export async function GET(request){
 try{
  const {db,user}=await authorized(request);
  const {mode,id,q,before}=safeMessagingQuery(new URL(request.url).searchParams);
  if(mode==='inbox')return json({conversations:await inbox(db,user.id)});
  if(mode==='summary'){
   const rows=await inbox(db,user.id);
   const unreadRows=rows.filter(c=>c.status==='accepted'&&Number(c.unread)>0);
   const [preferences,recent]=await Promise.all([
    db.from('private_messaging_settings').select('notify_messages').eq('user_id',user.id).maybeSingle(),
    unreadRows.length?db.from('private_messages').select('created_at')
     .in('conversation_id',unreadRows.map(c=>c.id)).neq('sender_id',user.id)
     .order('created_at',{ascending:false}).limit(1).maybeSingle()
     :Promise.resolve({data:null,error:null})
   ]);
   if(preferences.error||recent.error)throw preferences.error||recent.error;
   return json({requests:rows.filter(c=>c.status==='pending'&&c.requested_by!==user.id).length,
    unread:rows.reduce((n,c)=>n+Number(c.unread||0),0),
    notify_messages:preferences.data?.notify_messages!==false,
    latest_incoming_unread_at:recent.data?.created_at||null});
  }
  if(mode==='thread')return json(await getThread(db,user.id,id,before));
  if(mode==='search')return json(await search(db,user.id,q));
  if(mode==='contact')return json(await directContact(db,user.id,id));
  const [setting,blocks]=await Promise.all([
   db.from('private_messaging_settings').select('discoverable,allow_requests,notify_messages').eq('user_id',user.id).maybeSingle(),
   db.from('private_user_blocks').select('blocked_id,created_at').eq('blocker_id',user.id).limit(100)
  ]);
  if(setting.error||blocks.error)throw setting.error||blocks.error;
  const blockedIds=(blocks.data||[]).map(b=>b.blocked_id);
  let profiles=[];
  if(blockedIds.length){
   const result=await db.from('public_profiles').select('user_id,display_name').in('user_id',blockedIds);
   if(result.error)throw result.error;
   profiles=result.data||[];
  }
  const names=new Map(profiles.map(p=>[p.user_id,p.display_name]));
  return json({settings:{discoverable:true,allow_requests:true,notify_messages:true,...setting.data},
   blocked:(blocks.data||[]).map(b=>({id:b.blocked_id,name:names.get(b.blocked_id)||'مستخدم 967'}))});
 }catch(error){
  if(!(error instanceof RequestValidationError))console.error('private messages GET failed',error?.code||error?.name||'unknown');
  return fail(error instanceof RequestValidationError?error.message:'تعذر تحميل الرسائل. حاول مجددًا.',error instanceof RequestValidationError?error.status:503);
 }
}
export async function POST(request){
 try{
  const {db,user}=await authorized(request);
  const body=await readJsonObject(request,6500);
  const params=validateMessagingAction(body);
  const result=check(await db.rpc('private_messaging_action',{p_actor:user.id,...params}));
  return json(result);
 }catch(error){
  if(!(error instanceof RequestValidationError))console.error('private messages POST failed',error?.code||error?.name||'unknown');
  return fail(error instanceof RequestValidationError?error.message:'تعذر تنفيذ الإجراء حاليًا.',error instanceof RequestValidationError?error.status:503);
 }
}
