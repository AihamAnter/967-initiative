import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
import {contributionTypes} from '@/lib/contributions';
import {isSameOrigin, readJsonObject, RequestValidationError} from '@/lib/requestSecurity';
export const runtime='nodejs';
const fail=(message,status=400)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'600'}:{})}});
const requests=new Map();
function rateLimited(request){
 // Vercel replaces x-vercel-forwarded-for at its trusted edge. In-memory limits
 // are a best-effort fallback only; Turnstile / edge limits handle many instances.
 const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const now=Date.now();
 for(const [key,value] of requests)if(value.expires<now)requests.delete(key);
 const current=requests.get(ip)||{count:0,expires:now+600000};
 if(current.count>=8)return true;
 if(requests.size>=5000&&!requests.has(ip))return true;
 current.count++;requests.set(ip,current);return false;
}
export async function POST(request){
 try{
  if(!isSameOrigin(request))return fail('طلب غير مسموح',403);
  if(rateLimited(request))return fail('وصلت إلى حد الإرسال. حاول بعد عدة دقائق.',429);
  const data=await readJsonObject(request);
  if(data.website)return NextResponse.json({ok:true});
  if(['name','email','type','message'].some(field=>typeof data[field]!=='string'))return fail('تحقق من الحقول وحاول مرة أخرى');
  const name=data.name.trim();
  const email=data.email.trim().toLowerCase();
  const type=data.type.trim();
  const message=data.message.trim();
  const types=contributionTypes;
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>250||!types.includes(type)||message.length<10||message.length>4000)return fail('تحقق من الحقول وحاول مرة أخرى');
  if(Boolean(process.env.TURNSTILE_SECRET_KEY)!==Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY))return fail('التحقق البشري غير متاح حالياً. حاول لاحقاً.',503);
  if(process.env.TURNSTILE_SECRET_KEY){
   const token=typeof data['cf-turnstile-response']==='string'?data['cf-turnstile-response']:'';if(!token||token.length>2048)return fail('يرجى إكمال التحقق البشري');
   const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token}),cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!verify.ok)return fail('تعذر التحقق البشري حالياً. حاول لاحقاً.',503);
   if(!(await verify.json()).success)return fail('فشل التحقق البشري');
  }
  const db=serverDb();
  if(!db)return fail('التواصل غير مفعّل بعد. حاول لاحقاً.',503);
  const {error}=await db.from('messages').insert({name,email,type,message});
  if(error){console.error('contact save failed',error.message);return fail('تعذر حفظ الرسالة حالياً',503)}
  return NextResponse.json({ok:true},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(err){if(err instanceof RequestValidationError)return fail(err.message,err.status);console.error('contact service failed',err?.name);return fail('تعذر إرسال الرسالة حالياً. حاول لاحقاً.',503)}
}
