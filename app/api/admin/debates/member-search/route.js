import {authorizeEditorRequest} from '@/lib/adminAuthorization';
import {serverDb} from '@/lib/supabase-server';
import {RequestValidationError} from '@/lib/requestSecurity';
import {memberSearchTerms} from '@/lib/memberSearch';
import {rankSearchResults} from '@/lib/search';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'};
const json=(body,status=200)=>Response.json(body,{status,headers});

export async function GET(request){
 try{
  const db=serverDb();
  await authorizeEditorRequest(request,db);
  const q=(new URL(request.url).searchParams.get('q')||'').trim().slice(0,80);
  if(q.length<2)return json({members:[]});
  const terms=memberSearchTerms(q);
  if(!terms.length)return json({members:[]});
  const lookup=await db.from('public_profiles')
   .select('user_id,display_name,avatar_url,show_avatar,suspended,deletion_requested_at')
   .or(terms.map(term=>'display_name.ilike.%'+term+'%').join(','))
   .order('display_name').limit(100);
  if(lookup.error)throw lookup.error;
  const profiles=(lookup.data||[]).filter(p=>
   !p.suspended&&!p.deletion_requested_at&&p.display_name?.trim()
  );
  if(!profiles.length)return json({members:[]});
  const preferences=await db.from('private_messaging_settings')
   .select('user_id,discoverable').in('user_id',profiles.map(p=>p.user_id));
  if(preferences.error)throw preferences.error;
  const hidden=new Set((preferences.data||[]).filter(p=>p.discoverable===false).map(p=>p.user_id));
  const visible=profiles.filter(p=>!hidden.has(p.user_id)).map(p=>({
   id:p.user_id,name:p.display_name,avatar_url:p.show_avatar?p.avatar_url:null,
   title:p.display_name,description:'',meta:'',type:'members'
  }));
  const matches=rankSearchResults(q,visible,{mode:'all',scope:'title'});
  return json({members:matches.slice(0,20).map(({title,description,meta,type,...member})=>member)});
 }catch(error){
  if(!(error instanceof RequestValidationError))
   console.error('debate member lookup failed',error?.code||error?.name||'unknown');
  return json({error:error instanceof RequestValidationError?error.message:'تعذر البحث عن الأعضاء حاليًا.'},
   error instanceof RequestValidationError?error.status:503);
 }
}
