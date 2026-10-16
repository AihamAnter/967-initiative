import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {contributionTypes} from '@/lib/contributions';
export const runtime='nodejs';
const fail=(message,status=400)=>NextResponse.json({error:message},{status});
const requests=new Map();
function rateLimited(request){
 const ip=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
 if(!ip)return false;
 const now=Date.now();
 for(const [key,value] of requests)if(value.expires<now)requests.delete(key);
 const current=requests.get(ip)||{count:0,expires:now+600000};
 if(current.count>=8)return true;
 if(requests.size>=5000&&!requests.has(ip))return true;
 current.count++;requests.set(ip,current);return false;
}
export async function POST(request){
 try{
  const origin=request.headers.get('origin');const host=request.headers.get('host');
  if(origin&&host&&new URL(origin).host!==host)return fail('طلب غير مسموح',403);
  if(Number(request.headers.get('content-length')||0)>12000)return fail('الرسالة طويلة جداً',413);
  if(rateLimited(request))return fail('وصلت إلى حد الإرسال. حاول بعد عدة دقائق.',429);
  const body=await request.text();
  if(Buffer.byteLength(body,'utf8')>12000)return fail('الرسالة طويلة جداً',413);
  const data=JSON.parse(body);
  if(data.website)return NextResponse.json({ok:true});
  const name=String(data.name||'').trim().slice(0,101);
  const email=String(data.email||'').trim().toLowerCase().slice(0,251);
  const type=String(data.type||'').trim();
  const message=String(data.message||'').trim();
  const types=contributionTypes;
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>250||!types.includes(type)||message.length<10||message.length>4000)return fail('تحقق من الحقول وحاول مرة أخرى');
  if(process.env.TURNSTILE_SECRET_KEY){
   const token=String(data['cf-turnstile-response']||'');if(!token)return fail('يرجى إكمال التحقق البشري');
   const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token}),cache:'no-store'});
   if(!(await verify.json()).success)return fail('فشل التحقق البشري');
  }
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return fail('التواصل غير مفعّل بعد. حاول لاحقاً.',503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.from('messages').insert({name,email,type,message});
  if(error){console.error('contact save failed',error.message);return fail('تعذر حفظ الرسالة حالياً',503)}
  return NextResponse.json({ok:true},{status:201});
 }catch(err){console.error('contact error',err);return fail('تعذر معالجة الطلب',400)}
}
