import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {RequestValidationError,readJsonObject} from '@/lib/requestSecurity';
import {UUID_RE,REPORT_REASONS} from '@/lib/privateMessaging';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});
async function management(request){
 const db=serverDb();
 const actor=await authorizeEditorRequest(request,db);
 if(actor.role!=='management')throw new RequestValidationError('هذه الصفحة مخصصة للإدارة فقط.',403);
 return {db,user:actor.user};
}
const fail=error=>{
 if(error instanceof RequestValidationError)return json({error:error.message},error.status);
 console.error('private message moderation failed',error?.code||error?.name||'unknown');
 return json({error:'تعذر تنفيذ إجراء مراجعة بلاغات الرسائل.'},503);
};

export async function GET(request){
 try{
  const {db}=await management(request);
  const params=new URL(request.url).searchParams;
  const status=['open','reviewed','dismissed'].includes(params.get('status'))?params.get('status'):'open';
  const page=Math.max(1,Math.min(1000,parseInt(params.get('page'),10)||1));
  const start=(page-1)*25;
  const {data:reports,count,error}=await db.from('private_message_reports')
   .select('id,reporter_id,conversation_id,message_id,reason,note,evidence,status,created_at,reviewed_at,reviewed_by',{count:'exact'})
   .eq('status',status).order('created_at',{ascending:false}).range(start,start+24);
  if(error)throw error;
  return json({reports:reports||[],total:count||0,page,status});
 }catch(error){return fail(error);}
}
export async function POST(request){
 try{
  const {db,user}=await management(request);
  const body=await readJsonObject(request,2000);
  if(!UUID_RE.test(body.id||'')||!['reviewed','dismissed'].includes(body.status))
   throw new RequestValidationError('البلاغ أو القرار غير صالح.');
  const {data,error}=await db.from('private_message_reports')
   .update({status:body.status,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
   .eq('id',body.id).eq('status','open').select('id').maybeSingle();
  if(error)throw error;
  if(!data)throw new RequestValidationError('البلاغ عولج من قبل أو لم يعد متاحًا.',409);
  return json({ok:true});
 }catch(error){return fail(error);}
}
