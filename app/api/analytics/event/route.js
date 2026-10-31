import {serverDb} from '@/lib/supabase-server';
import {isSameOrigin,readJsonObject,RequestValidationError} from '@/lib/requestSecurity';
import {usageEvent} from '@/lib/siteAnalytics';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
let windowStarted=Date.now(),counter=0;

// Per-instance backstop; serverless instances do not share this state.
// It is not a guarantee of bot-free or unique human traffic.
function allowRequest(){
 const now=Date.now();
 if(now-windowStarted>60000){windowStarted=now;counter=0;}
 return ++counter<=240;
}
export async function POST(request){
 if(!isSameOrigin(request))return new Response(null,{status:403,headers:noStore});
 // Browsers send one of these headers. Reject plain cross-site posts and
 // ad-hoc nonbrowser requests to reduce automated noise (not a security boundary).
 const origin=request.headers.get('origin');
 const site=request.headers.get('sec-fetch-site');
 if(site&&site!=='same-origin'&&site!=='none')return new Response(null,{status:403,headers:noStore});
 if(!origin&&site!=='same-origin')return new Response(null,{status:403,headers:noStore});
 if(!allowRequest())return new Response(null,{status:429,headers:noStore});
 try{
  const body=await readJsonObject(request,200);
  const valid=usageEvent(body);
  if(!valid)return new Response(null,{status:400,headers:noStore});
  const db=serverDb();
  if(!db)return new Response(null,{status:503,headers:noStore});
  // The DB accepts only aggregate category counters. No identity, request
  // headers, raw search queries or referrers are forwarded to Supabase.
  const {error}=await db.rpc('record_site_usage',{p_metric:valid.event,p_section:valid.section});
  if(error){console.error('Activity counter unavailable',error.code||'database');return new Response(null,{status:503,headers:noStore});}
  return new Response(null,{status:204,headers:noStore});
 }catch(error){
  return new Response(null,{status:error instanceof RequestValidationError?error.status:503,headers:noStore});
 }
}
