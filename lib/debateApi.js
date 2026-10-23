import {authorizeEditorRequest} from './adminAuthorization.js';
import {recordOperationalEvent} from './operationalEvents.js';
import {isSameOrigin,readJsonObject,RequestValidationError} from './requestSecurity.js';
import {debateRpc,readAudienceAccount,readDebateAdmin,mutateDebate,requireDebateId} from './debateRepository.js';

export async function authorizeAudience(request,db){
 if(!isSameOrigin(request))throw new RequestValidationError('طلب غير مسموح.',403);
 if(!db)throw new RequestValidationError('خدمة الحسابات غير مفعلة.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]{1,8000})$/i)?.[1];
 if(!token)throw new RequestValidationError('سجل الدخول للمشاركة.',401);
 let result;try{result=await db.auth.getUser(token);}catch{throw new RequestValidationError('تعذر التحقق من الجلسة.',503);}
 if(result.error||!result.data?.user)throw new RequestValidationError('انتهت الجلسة أو أُلغيت. سجل الدخول مجدداً.',result.error?.status>=500?503:401);
 return result.data.user;
}
export async function handleDebateRequest(request,createDb,{admin=false,account=false}={}){
 const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Vary':'Authorization'}});
 try{
  const db=createDb(request),params=new URL(request.url).searchParams;
  if(!admin&&!account&&request.method==='GET'){
   if(params.has('target'))return json(await debateRpc(db,'debate_discussion_target',{p_debate:requireDebateId(params.get('debate')),p_kind:params.get('target'),p_id:requireDebateId(params.get('id')),p_order:params.get('order')||'newest'}));
   if(params.has('results'))return json(await debateRpc(db,'debate_live_results',{p_debate:requireDebateId(params.get('debate'))}));
   if(params.has('discussion'))return json(await debateRpc(db,'debate_discussion',{p_debate:requireDebateId(params.get('debate')),p_kind:params.get('discussion'),p_page:Math.max(1,parseInt(params.get('page'),10)||1),p_order:params.get('order')||'newest'}));
   if(params.has('speaker'))return json(await debateRpc(db,'debate_speaker_public',{p_slug:params.get('speaker').slice(0,120)}));
   return json(await debateRpc(db,params.has('slug')?'debate_detail':'debate_catalog',params.has('slug')?{p_slug:params.get('slug').slice(0,120)}:{}));
  }
  const actor=admin?await authorizeEditorRequest(request,db):{user:await authorizeAudience(request,db)};
  if(request.method==='GET')return json(admin?await readDebateAdmin(db,actor):await readAudienceAccount(db,actor.user,params));
  if(request.method!=='POST')return json({error:'إجراء غير مدعوم.'},405);
  const body=await readJsonObject(request,180000);
  if(!admin&&!['profile','deletion_request','comment_delete'].includes(body.action)&&!actor.user.email_confirmed_at)throw new RequestValidationError('أكد بريدك الإلكتروني قبل المشاركة.',403);
  return json(await mutateDebate(db,body,admin));
 }catch(error){const status=error instanceof RequestValidationError?error.status:503;if(status>=500)recordOperationalEvent('api_failure',{source:'api',route:new URL(request.url).pathname,status});return json({error:error instanceof RequestValidationError?error.message:'تعذر إتمام الطلب. حاول مجدداً.',...(error instanceof RequestValidationError&&error.code?{code:error.code}:{})},status);}
}
