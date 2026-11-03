import {serverDb} from '@/lib/supabase-server';
import {authorizeAudience} from '@/lib/debateApi';
import {RequestValidationError} from '@/lib/requestSecurity';
import {memberSearchTerms,matchingMembers} from '@/lib/memberSearch';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});

export async function GET(request){
 try{
  const db=serverDb();
  const actor=await authorizeAudience(request,db);
  if(!actor.email_confirmed_at||actor.banned_until&&Date.parse(actor.banned_until)>Date.now())
   throw new RequestValidationError('يتطلب البحث عن الأعضاء حسابًا مؤكدًا ونشطًا.',403);
  const {data:ownProfile,error:ownError}=await db.from('public_profiles')
   .select('suspended,deletion_requested_at').eq('user_id',actor.id).maybeSingle();
  if(ownError)throw ownError;
  if(ownProfile?.suspended||ownProfile?.deletion_requested_at)
   throw new RequestValidationError('البحث عن الأعضاء غير متاح لهذا الحساب.',403);
  const params=new URL(request.url).searchParams;
  const query=(params.get('q')||'').trim().slice(0,150);
  if(query.length<2)return json({users:[],hasMore:false});
  const mode=['all','any','phrase'].includes(params.get('mode'))?params.get('mode'):'all';
  const exclude=(params.get('exclude')||'').trim().slice(0,150);
  const terms=memberSearchTerms(query);
  if(!terms.length)return json({users:[],hasMore:false});
  const {data:profiles,error:profileError}=await db.from('public_profiles')
   .select('user_id,display_name,avatar_url,show_avatar,suspended,deletion_requested_at')
   .or(terms.map(term=>'display_name.ilike.%'+term+'%').join(','))
   .order('display_name',{ascending:true}).limit(150);
  if(profileError)throw profileError;
  const candidates=(profiles||[]).filter(p=>p.user_id!==actor.id&&!p.suspended&&!p.deletion_requested_at);
  if(!candidates.length)return json({users:[],hasMore:false});
  const ids=candidates.map(p=>p.user_id);
  const [settings,blocks]=await Promise.all([
   db.from('private_messaging_settings').select('user_id,discoverable').in('user_id',ids),
   db.from('private_user_blocks').select('blocker_id,blocked_id')
    .or('blocker_id.eq.'+actor.id+',blocked_id.eq.'+actor.id)
  ]);
  if(settings.error||blocks.error)throw settings.error||blocks.error;
  // Discoverability and permission to start a conversation are separate choices.
  const results=matchingMembers(candidates,settings.data,blocks.data,actor.id,query,{mode,exclude});
  return json({users:results.slice(0,24),hasMore:results.length>24});
 }catch(error){
  if(!(error instanceof RequestValidationError))
   console.error('member directory search failed',error?.code||error?.name||'unknown');
  return json({error:error instanceof RequestValidationError?error.message:'تعذر البحث عن الأعضاء حاليًا.'},
   error instanceof RequestValidationError?error.status:503);
 }
}
