import {authorizeAudience} from '@/lib/debateApi';
import {taskRequestDb} from '@/lib/taskServer';
import {serverDb} from '@/lib/supabase-server';
import {readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {UUID} from '@/lib/debates';
import {eligibleForDebateReminder} from '@/lib/debateNotificationRules';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization'};
const json=(value,status=200)=>Response.json(value,{status,headers});

async function context(request){
 const db=taskRequestDb(request),user=await authorizeAudience(request,db),service=serverDb();
 if(!service)throw new RequestValidationError('خدمة تذكيرات المناظرات غير متاحة.',503);
 if(!user.email_confirmed_at||user.banned_until&&Date.parse(user.banned_until)>Date.now())
  throw new RequestValidationError('يجب تأكيد البريد الإلكتروني وأن يكون الحساب نشطًا.',403);
 const {data:profile,error:profileError}=await service.from('public_profiles')
  .select('suspended,deletion_requested_at').eq('user_id',user.id).maybeSingle();
 if(profileError)throw profileError;
 if(profile?.suspended||profile?.deletion_requested_at)
  throw new RequestValidationError('هذا الحساب غير متاح للاشتراك.',403);
 return {user,service};
}
async function readDebate(service,id){
 const {data,error}=await service.from('debates')
  .select('id,slug,debate_type,publication_status,stage,scheduled_at,recording_published,recording_first_published_at')
  .eq('id',id).maybeSingle();
 if(error)throw error;
 return data;
}
export async function GET(request){
 try{
  const {user,service}=await context(request),id=new URL(request.url).searchParams.get('id');
  if(!UUID.test(id||''))throw new RequestValidationError('معرّف المناظرة غير صالح.');
  const debate=await readDebate(service,id);
  if(!debate||debate.publication_status!=='published')throw new RequestValidationError('المناظرة غير متاحة.',404);
  const {data,error}=await service.from('debate_notification_subscriptions')
   .select('debate_id').eq('user_id',user.id).eq('debate_id',id).maybeSingle();
  if(error)throw error;
  return json({subscribed:Boolean(data),eligible:eligibleForDebateReminder(debate)});
 }catch(e){return json({error:e instanceof RequestValidationError?e.message:'تعذر جلب التذكيرات.'},e instanceof RequestValidationError?e.status:503);}
}
export async function POST(request){
 try{
  const {user,service}=await context(request),body=await readJsonObject(request,2048);
  if(!body||typeof body!=='object'||Array.isArray(body)||!UUID.test(body.id||'')||typeof body.enabled!=='boolean')
   throw new RequestValidationError('طلب التذكير غير صالح.');
  const debate=await readDebate(service,body.id);
  if(body.enabled){
   if(!eligibleForDebateReminder(debate))throw new RequestValidationError('التذكير غير متاح لهذه المناظرة في الوقت الحالي.',409);
   const {error}=await service.from('debate_notification_subscriptions')
    .upsert({user_id:user.id,debate_id:body.id},{onConflict:'user_id,debate_id',ignoreDuplicates:true});
   if(error)throw error;
  }else{
   // Removing a subscription is always permitted, even after postponement.
   const {error}=await service.from('debate_notification_subscriptions')
    .delete().eq('user_id',user.id).eq('debate_id',body.id);
   if(error)throw error;
  }
  return json({ok:true,subscribed:body.enabled});
 }catch(e){return json({error:e instanceof RequestValidationError?e.message:'تعذر حفظ التذكير.'},e instanceof RequestValidationError?e.status:503);}
}
