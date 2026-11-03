import {serverDb} from '@/lib/supabase-server';
import {authorizeAudience} from '@/lib/debateApi';
import {RequestValidationError,readJsonObject} from '@/lib/requestSecurity';
import {validateMemberId,validateMemberReport,memberReportReference} from '@/lib/memberProfiles';
import {demoSpeakerProfile} from '@/lib/demoSpeakerProfiles';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});

function fail(error){
 if(error instanceof RequestValidationError)return json({error:error.message},error.status);
 console.error('member profile API error',error?.code||error?.name||'unknown');
 return json({error:'تعذر تحميل بيانات العضو حاليًا.'},503);
}
async function authorize(request,db){
 const actor=await authorizeAudience(request,db);
 if(!actor.email_confirmed_at||actor.banned_until&&Date.parse(actor.banned_until)>Date.now())
  throw new RequestValidationError('المراسلة والملفات الشخصية تتطلب حسابًا مؤكدًا ونشطًا.',403);
 const {data:profile,error}=await db.from('public_profiles')
  .select('suspended,deletion_requested_at').eq('user_id',actor.id).maybeSingle();
 if(error)throw error;
 if(profile?.suspended||profile?.deletion_requested_at)
  throw new RequestValidationError('هذا الحساب غير مؤهل للاستخدام حاليًا.',403);
 return actor;
}
async function publicMember(db,id){
 const {data:p,error}=await db.from('public_profiles')
  .select('user_id,display_name,avatar_url,show_avatar,created_at,suspended,deletion_requested_at')
  .eq('user_id',id).maybeSingle();
 if(error)throw error;
 if(!p){
  // Published speakers without a login can have clearly marked preview profiles.
  const {data:speaker,error:speakerError}=await db.from('debate_speakers')
   .select('id,slug,name,specialty,bio,photo_url,is_published')
   .eq('id',id).eq('is_published',true).maybeSingle();
  if(speakerError)throw speakerError;
  const demo=demoSpeakerProfile(speaker);
  if(!demo)throw new RequestValidationError('حساب العضو غير متاح.',404);
  return demo;
 }
 if(p.suspended||p.deletion_requested_at)
  throw new RequestValidationError('حساب العضو غير متاح.',404);
 // Never return email, personal profile preferences or private account metadata.
 return {id:p.user_id,name:p.display_name||'عضو في 967',
  avatar_url:p.show_avatar?p.avatar_url:null,joined_at:p.created_at};
}
export async function GET(request,{params}){
 try{
  const db=serverDb(),target=validateMemberId((await params).id);
  const actor=await authorize(request,db);
  const member=await publicMember(db,target);
  if(member.is_demo)return json({member,self:false,blocked:false,canMessage:false,hasConversation:false});
  const self=actor.id===target;
  if(self)return json({member,self:true,blocked:false,canMessage:false,hasConversation:false});
  const [blocks,prefs,conversation]=await Promise.all([
   db.from('private_user_blocks').select('blocker_id,blocked_id')
    .or('and(blocker_id.eq.'+actor.id+',blocked_id.eq.'+target+'),and(blocker_id.eq.'+target+',blocked_id.eq.'+actor.id+')'),
   db.from('private_messaging_settings').select('allow_requests').eq('user_id',target).maybeSingle(),
   db.from('private_conversations').select('id,status').eq('user_low',actor.id<target?actor.id:target)
    .eq('user_high',actor.id<target?target:actor.id).maybeSingle()
  ]);
  if(blocks.error||prefs.error||conversation.error)throw blocks.error||prefs.error||conversation.error;
  const blocked=(blocks.data||[]).some(b=>b.blocker_id===actor.id);
  const anyBlock=(blocks.data||[]).length>0;
  const hasConversation=['pending','accepted'].includes(conversation.data?.status);
  return json({member,self:false,blocked,
   hasConversation,
   canMessage:!anyBlock&&(hasConversation||prefs.data?.allow_requests!==false)});
 }catch(error){return fail(error);}
}
export async function POST(request,{params}){
 try{
  const db=serverDb(),target=validateMemberId((await params).id);
  const actor=await authorize(request,db);
  if(actor.id===target)throw new RequestValidationError('لا يمكنك الإبلاغ عن حسابك.',400);
  const targetMember=await publicMember(db,target);
  if(targetMember.is_demo)throw new RequestValidationError('هذا ملف تجريبي، وليس حسابًا فعليًا يمكن الإبلاغ عنه.',403);
  const body=await readJsonObject(request,1500);
  const validated=validateMemberReport(body);
  const {data,error}=await db.from('member_profile_reports')
   .insert({reporter_id:actor.id,reported_id:target,reason:validated.reason,detail:validated.detail})
   .select('report_number').single();
  if(error){
   if(error.code==='23505')throw new RequestValidationError('يوجد بلاغ منك عن هذا الحساب قيد المراجعة بالفعل.',409);
   if(error.message?.includes('MEMBER_REPORT_LIMIT'))
    throw new RequestValidationError('وصلت إلى الحد اليومي البالغ 3 بلاغات.',429);
   throw error;
  }
  return json({ok:true,reference:memberReportReference(data.report_number)});
 }catch(error){return fail(error);}
}
