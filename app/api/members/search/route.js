import {serverDb} from '@/lib/supabase-server';
import {authorizeAudience} from '@/lib/debateApi';
import {RequestValidationError} from '@/lib/requestSecurity';
import {memberSearchTerms,matchingMembers} from '@/lib/memberSearch';
import {searchDemoSpeakers} from '@/lib/demoSpeakerProfiles';
import {rankSearchResults} from '@/lib/search';

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
  const [real,speakers]=await Promise.all([
   db.from('public_profiles')
    .select('user_id,display_name,avatar_url,show_avatar,suspended,deletion_requested_at')
    .or(terms.map(term=>'display_name.ilike.%'+term+'%').join(','))
    .order('display_name',{ascending:true}).limit(150),
   db.from('debate_speakers')
    .select('id,slug,name,specialty,photo_url,is_published')
    .eq('is_published',true)
    .or(terms.map(term=>'name.ilike.%'+term+'%').join(','))
    .order('name',{ascending:true}).limit(40)
  ]);
  if(real.error||speakers.error)throw real.error||speakers.error;
  const candidates=(real.data||[]).filter(p=>p.user_id!==actor.id&&!p.suspended&&!p.deletion_requested_at);
  let prefs=[],blocks=[];
  if(candidates.length){
   const ids=candidates.map(p=>p.user_id);
   const [settingsResult,blocksResult]=await Promise.all([
    db.from('private_messaging_settings').select('user_id,discoverable').in('user_id',ids),
    db.from('private_user_blocks').select('blocker_id,blocked_id')
     .or('blocker_id.eq.'+actor.id+',blocked_id.eq.'+actor.id)
   ]);
   if(settingsResult.error||blocksResult.error)throw settingsResult.error||blocksResult.error;
   prefs=settingsResult.data||[];blocks=blocksResult.data||[];
  }
  // The demo entries are not Auth users and cannot be messaged or blocked.
  const realResults=matchingMembers(candidates,prefs,blocks,actor.id,query,{mode,exclude});
  const demos=searchDemoSpeakers(speakers.data,query,{mode,exclude});
  const ranked=rankSearchResults(query,[...realResults,...demos].map(person=>({
   ...person,type:'members',title:person.name,description:'',meta:''
  })),{mode,scope:'title',exclude});
  const users=ranked.slice(0,24).map(({type,title,description,meta,...person})=>person);
  return json({users,hasMore:ranked.length>24});
 }catch(error){
  if(!(error instanceof RequestValidationError))
   console.error('member directory search failed',error?.code||error?.name||'unknown');
  return json({error:error instanceof RequestValidationError?error.message:'تعذر البحث عن الأعضاء حاليًا.'},
   error instanceof RequestValidationError?error.status:503);
 }
}
