import {serverDb} from '@/lib/supabase-server';
import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {RequestValidationError,readJsonObject} from '@/lib/requestSecurity';
import {UUID_RE} from '@/lib/privateMessaging';
import {reportParties,REPORT_THREAD_PAGE_SIZE} from '@/lib/messageReports';

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

async function contextFor(db,reports){
 if(!reports.length)return [];
 const ids=[...new Set(reports.map(r=>r.conversation_id))];
 const {data:conversations,error:conversationError}=await db.from('private_conversations')
  .select('id,user_low,user_high,requested_by,intro,requested_at').in('id',ids);
 if(conversationError)throw conversationError;
 const byId=new Map((conversations||[]).map(c=>[c.id,c]));
 const users=[...new Set((conversations||[]).flatMap(c=>[c.user_low,c.user_high]))];
 let names=new Map();
 if(users.length){
  const {data:profiles,error:profileError}=await db.from('public_profiles')
   .select('user_id,display_name').in('user_id',users);
  if(profileError)throw profileError;
  names=new Map((profiles||[]).map(p=>[p.user_id,p.display_name]));
 }
 return reports.map(report=>reportParties(report,byId.get(report.conversation_id),names)).filter(Boolean);
}

async function reportTranscript(db,viewer,reportId,page){
 if(!UUID_RE.test(reportId||''))throw new RequestValidationError('مرجع البلاغ غير صالح.',400);
 if(!Number.isSafeInteger(page)||page<1||page>500)throw new RequestValidationError('رقم الصفحة غير صالح.',400);
 // The conversation is selected ONLY by a real report ID; no arbitrary
 // conversation identifier is accepted at this endpoint.
 const {data:report,error:reportError}=await db.from('private_message_reports')
  .select('id,report_number,reporter_id,conversation_id,message_id,reason,note,evidence,status,created_at,reviewed_at,reviewed_by')
  .eq('id',reportId).maybeSingle();
 if(reportError)throw reportError;
 if(!report)throw new RequestValidationError('البلاغ غير موجود.',404);
 const described=await contextFor(db,[report]);
 if(!described.length)throw new RequestValidationError('لا يمكن التحقق من أطراف هذا البلاغ.',409);
 // Every page view must be recorded BEFORE revealing any transcript content.
 // An audit write error intentionally blocks the read.
 const {error:auditError}=await db.from('private_message_report_views')
  .insert({report_id:reportId,viewer_id:viewer.id});
 if(auditError)throw auditError;
 const start=(page-1)*REPORT_THREAD_PAGE_SIZE;
 const {data:messages,error:messagesError}=await db.from('private_messages')
  .select('id,sender_id,body,created_at')
  .eq('conversation_id',report.conversation_id)
  .lte('created_at',report.created_at)
  .order('created_at',{ascending:false})
  .order('id',{ascending:false})
  .range(start,start+REPORT_THREAD_PAGE_SIZE);
 if(messagesError)throw messagesError;
 const hasMore=(messages||[]).length>REPORT_THREAD_PAGE_SIZE;
 const visible=(messages||[]).slice(0,REPORT_THREAD_PAGE_SIZE).reverse();
 const record=described[0];
 // Intro text is only relevant if it existed when the user filed the report.
 const {data:conversation,error:conversationError}=await db.from('private_conversations')
  .select('intro,requested_by,requested_at').eq('id',report.conversation_id).single();
 if(conversationError)throw conversationError;
 const intro=conversation.requested_at&&Date.parse(conversation.requested_at)<=Date.parse(report.created_at)?
  {body:conversation.intro,sender_id:conversation.requested_by,created_at:conversation.requested_at}:null;
 return json({report:record,intro:page===1?intro:null,messages:visible,hasMore,nextPage:hasMore?page+1:null});
}

export async function GET(request){
 try{
  const {db,user}=await management(request);
  const params=new URL(request.url).searchParams;
  const reportId=params.get('report');
  const pageRaw=Number(params.get('page')||1);
  if(reportId!==null)return await reportTranscript(db,user,reportId,pageRaw);
  const status=['open','reviewed','dismissed'].includes(params.get('status'))?params.get('status'):'open';
  const page=Number.isSafeInteger(pageRaw)?Math.max(1,Math.min(1000,pageRaw)):1;
  const start=(page-1)*25;
  const {data:reports,count,error}=await db.from('private_message_reports')
   .select('id,report_number,reporter_id,conversation_id,message_id,reason,note,evidence,status,created_at,reviewed_at,reviewed_by',{count:'exact'})
   .eq('status',status).order('created_at',{ascending:false}).range(start,start+24);
  if(error)throw error;
  return json({reports:await contextFor(db,reports||[]),total:count||0,page,status});
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
