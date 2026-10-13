'use client';
import {useState,useEffect,useRef} from 'react';
import {Send,CheckCircle2,AlertCircle} from 'lucide-react';
export default function ContactForm(){
 const [status,setStatus]=useState('idle'),[msg,setMsg]=useState('');
 const captchaRef=useRef(null);
 useEffect(()=>{
  const key=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if(!key || document.querySelector('script[data-turnstile]'))return;
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';script.async=true;script.defer=true;script.dataset.turnstile='1';document.body.appendChild(script);
 },[]);
 async function handleSubmit(e){e.preventDefault();setStatus('sending');setMsg('');
  const form=new FormData(e.currentTarget);const target=e.currentTarget;
  const payload=Object.fromEntries(form.entries());
  try{const res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const json=await res.json();if(!res.ok)throw new Error(json.error||'تعذر إرسال الرسالة');setStatus('sent');setMsg('تم استلام رسالتك. شكراً لتواصلك معنا.');target.reset();if(window.turnstile)window.turnstile.reset();}
  catch(err){setStatus('error');setMsg(err.message)}
 }
 return <form className="contact-form" onSubmit={handleSubmit}>
  <div className="form-row"><label>الاسم <input name="name" placeholder="اسمك الكريم" required minLength={2} maxLength={100}/></label><label>البريد الإلكتروني <input name="email" type="email" placeholder="name@example.com" required maxLength={250}/></label></div>
  <label>نوع الرسالة <select name="type" required defaultValue=""><option value="" disabled>اختر نوع رسالتك</option>{['استفسار','اقتراح موضوع','تصحيح معلومة','التطوع والمشاركة','تعاون إعلامي','أخرى'].map(v=><option key={v}>{v}</option>)}</select></label>
  <label>الرسالة <textarea name="message" rows="5" placeholder="اكتب رسالتك هنا..." required minLength={10} maxLength={4000}/></label>
  <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div ref={captchaRef} className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}></div>}
  <div className="form-bottom"><button type="submit" className="btn btn-red" disabled={status==='sending'}>{status==='sending'?'جارٍ الإرسال...':'إرسال الرسالة'} <Send size={17}/></button><span className="form-note">نستخدم بياناتك للرد على رسالتك فقط.</span></div>
  {msg&&<p className={status==='sent'?'feedback success':'feedback error'} role="status">{status==='sent'?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {msg}</p>}
 </form>
}
