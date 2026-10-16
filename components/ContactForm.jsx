'use client';
import {useState,useEffect,useRef} from 'react';
import {Send,CheckCircle2,AlertCircle} from 'lucide-react';
import {contributionTypes} from '@/lib/contributions';
export default function ContactForm({initialType=''}){
 const [status,setStatus]=useState('idle'),[msg,setMsg]=useState('');
 const captchaRef=useRef(null);
 const widgetRef=useRef(null);
 const sendingRef=useRef(false);
 useEffect(()=>{
  const key=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if(!key)return;
  let active=true;
  const render=()=>{if(active&&captchaRef.current&&window.turnstile&&widgetRef.current===null)widgetRef.current=window.turnstile.render(captchaRef.current,{sitekey:key});};
  let script=document.querySelector('script[data-turnstile]');
  if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;script.dataset.turnstile='1';document.body.appendChild(script);}
  if(window.turnstile)render();else script.addEventListener('load',render);
  const failed=()=>{if(active){setStatus('error');setMsg('تعذر تحميل التحقق البشري. أعد تحميل الصفحة.');}};
  script.addEventListener('error',failed);
  return()=>{active=false;script.removeEventListener('load',render);script.removeEventListener('error',failed);if(widgetRef.current!==null&&window.turnstile)window.turnstile.remove(widgetRef.current);widgetRef.current=null;};
 },[]);
 async function handleSubmit(e){e.preventDefault();if(sendingRef.current)return;sendingRef.current=true;setStatus('sending');setMsg('');
  const form=new FormData(e.currentTarget);const target=e.currentTarget;
  const payload=Object.fromEntries(form.entries());
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),25000);
  try{
   const res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   const json=await res.json().catch(()=>null);
   if(!res.ok||json?.ok!==true)throw new Error(typeof json?.error==='string'?json.error:'تعذر إرسال الرسالة حالياً. حاول مجدداً لاحقاً.');
   setStatus('sent');setMsg('تم استلام رسالتك للمراجعة. شكراً لمساهمتك.');target.reset();
  }catch(err){setStatus('error');setMsg(err.name==='AbortError'?'تأخر رد الخادم. لم نتمكن من تأكيد استلام الرسالة؛ تحقق من الاتصال قبل المحاولة مجدداً.':err instanceof TypeError?'تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً؛ احتفظنا بنص رسالتك.':err.message||'تعذر إرسال الرسالة. حاول مجدداً.');}
  finally{window.clearTimeout(timeout);sendingRef.current=false;if(window.turnstile&&widgetRef.current!==null)window.turnstile.reset(widgetRef.current);}
 }
 return <form className="contact-form" onSubmit={handleSubmit} aria-busy={status==='sending'}>
  <div className="form-row"><label>الاسم <input name="name" autoComplete="name" placeholder="اسمك الكريم" required minLength={2} maxLength={100}/></label><label>البريد الإلكتروني <input name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" required maxLength={250}/></label></div>
  <label>نوع الرسالة <select name="type" required defaultValue={initialType}><option value="" disabled>اختر نوع رسالتك</option>{contributionTypes.map(v=><option key={v}>{v}</option>)}</select></label>
  <label>الرسالة <textarea name="message" rows="5" placeholder="اكتب رسالتك هنا..." required minLength={10} maxLength={4000}/></label>
  <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div ref={captchaRef}/>}
  <div className="form-bottom"><button type="submit" className="btn btn-red" disabled={status==='sending'}>{status==='sending'?'جارٍ الإرسال...':'إرسال الرسالة'} <Send size={17}/></button><span className="form-note">نستخدم بياناتك للرد على رسالتك فقط.</span></div>
  {msg&&<p className={status==='sent'?'feedback success':'feedback error'} role={status==='sent'?'status':'alert'}>{status==='sent'?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {msg}</p>}
 </form>
}
