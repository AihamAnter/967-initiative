import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {RequestValidationError,readJsonObject} from '@/lib/requestSecurity';
import {UUID_RE} from '@/lib/privateMessaging';
import {memberReportReference} from '@/lib/memberProfiles';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});
async function management(request){
 const db=serverDb();
 const actor=await authorizeEditorRequest(request,db);
 if(actor.role!=='management')
  throw new RequestValidationError('صفحة بلاغات الحسابات للإدارة فقط.',403);
 return {db,user:actor.user};
}
const fail=error=>{
 if(error instanceof RequestValidationError)return json({error:error.message},error.status);
 console.error('member report review error',error?.code||error?.name||'unknown');
 return json({error:'تعذرت مراجعة بلاغات الحسابات.'},503);
};
export async function GET(request){
 try{
  const {db}=await management(request);
  const params=new URL(request.url).searchParams;
  const status=['open','reviewed','dismissed'].includes(params.get('status'))?params.get('status'):'open';
  const page=Math.max(1,Math.min(1000,Number.parseInt(params.get('page'),10)||1));
  const {data,count,error}=await db.from('member_profile_reports')
   .select('id,report_number,reporter_id,reported_id,reason,detail,status,created_at,reviewed_at',{count:'exact'})
   .eq('status',status).order('created_at',{ascending:false}).range((page-1)*25,page*25-1);
  if(error)throw error;
  const ids=[...new Set((data||[]).flatMap(r=>[r.reporter_id,r.reported_id]))];
  let names=new Map();
  if(ids.length){
   const {data:profiles,error:profilesError}=await db.from('public_profiles')
    .select('user_id,display_name').in('user_id',ids);
   if(profilesError)throw profilesError;
   names=new Map((profiles||[]).map(p=>[p.user_id,p.display_name]));
  }
  return json({total:count||0,page,status,reports:(data||[]).map(r=>({
   id:r.id,reference:memberReportReference(r.report_number),
   reporter:{id:r.reporter_id,name:names.get(r.reporter_id)||'حساب غير متاح'},
   reported:{id:r.reported_id,name:names.get(r.reported_id)||'حساب غير متاح'},
   reason:r.reason,detail:r.detail,status:r.status,created_at:r.created_at,reviewed_at:r.reviewed_at
  }))});
 }catch(error){return fail(error);}
}
export async function POST(request){
 try{
  const {db,user}=await management(request);
  const body=await readJsonObject(request,1200);
  if(!UUID_RE.test(body.id||'')||!['reviewed','dismissed'].includes(body.status))
   throw new RequestValidationError('مرجع البلاغ أو القرار غير صالح.',400);
  const {data,error}=await db.from('member_profile_reports')
   .update({status:body.status,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
   .eq('id',body.id).eq('status','open').select('id').maybeSingle();
  if(error)throw error;
  if(!data)throw new RequestValidationError('البلاغ غير موجود أو تمت مراجعته بالفعل.',409);
  return json({ok:true});
 }catch(error){return fail(error);}
}
