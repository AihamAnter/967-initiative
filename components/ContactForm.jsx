'use client';
import Link from 'next/link';
import {useState,useEffect,useRef,useCallback} from 'react';
import {Send,CheckCircle2,AlertCircle} from 'lucide-react';
import {contributionTypes} from '@/lib/contributions';
const DRAFT_KEY='967-contribution-draft-v1';
const DRAFT_TTL=30*60*1000;
export default function ContactForm({initialType=''}){
 const [status,setStatus]=useState('idle'),[msg,setMsg]=useState('');
 const [draftStatus,setDraftStatus]=useState('');
 const formRef=useRef(null);
 const captchaRef=useRef(null);
 const widgetRef=useRef(null);
 const sendingRef=useRef(false);
 const saveDraft=useCallback(()=>{
  const form=formRef.current;if(!form)return;
  const values=Object.fromEntries(new FormData(form).entries());
  const draft={name:String(values.name||'').slice(0,100),email:String(values.email||'').slice(0,250),message:String(values.message||'').slice(0,4000),type:contributionTypes.includes(values.type)?values.type:''};
  try{
   if(draft.name||draft.email||draft.message){sessionStorage.setItem(DRAFT_KEY,JSON.stringify({savedAt:Date.now(),...draft}));setDraftStatus('تُحفظ المسودة في هذه التبويبة لمدة 30 دقيقة.');}
   else{sessionStorage.removeItem(DRAFT_KEY);setDraftStatus('');}
  }catch{setDraftStatus('تعذر حفظ المسودة في المتصفح؛ احتفظ بنسخة من رسالتك.');}
 },[]);
 useEffect(()=>{
  try{
   const draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'null');
   if(!draft)return;
   if(!Number.isFinite(draft.savedAt)||Date.now()-draft.savedAt>DRAFT_TTL){sessionStorage.removeItem(DRAFT_KEY);return;}
   for(const [key,max] of [['name',100],['email',250],['message',4000]])if(typeof draft[key]==='string')formRef.current.elements.namedItem(key).value=draft[key].slice(0,max);
   if(!initialType&&contributionTypes.includes(draft.type))formRef.current.elements.namedItem('type').value=draft.type;
   setDraftStatus('استعدنا مسودتك في هذه التبويبة.');
  }catch{ /* A blocked session store does not prevent writing a message. */ }
  // Restore only when the form mounts; choosing a type never replaces the fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{if(initialType){formRef.current.elements.namedItem('type').value=initialType;saveDraft();}},[initialType,saveDraft]);
 function changeType(event){
  const url=new URL(window.location.href);url.searchParams.set('type',event.target.value);
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
 }
 function resetFields(){
  const form=formRef.current;if(!form)return;form.reset();
  const type=new URL(window.location.href).searchParams.get('type');
  if(contributionTypes.includes(type))form.elements.namedItem('type').value=type;
 }
 function clearDraft(){
  resetFields();
  try{sessionStorage.removeItem(DRAFT_KEY);}catch{}
  setDraftStatus('');setMsg('');setStatus('idle');
 }
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
  const form=new FormData(e.currentTarget);
  const payload=Object.fromEntries(form.entries());
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),25000);
  try{
   const res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   const json=await res.json().catch(()=>null);
   if(!res.ok||json?.ok!==true)throw new Error(typeof json?.error==='string'?json.error:'تعذر إرسال الرسالة حالياً. حاول مجدداً لاحقاً.');
   setStatus('sent');setMsg('تم استلام رسالتك للمراجعة. شكراً لمساهمتك.');resetFields();
   try{sessionStorage.removeItem(DRAFT_KEY);}catch{}setDraftStatus('');
  }catch(err){setStatus('error');setMsg(err.name==='AbortError'?'تأخر رد الخادم. لم نتمكن من تأكيد استلام الرسالة؛ تحقق من الاتصال قبل المحاولة مجدداً.':err instanceof TypeError?'تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً؛ احتفظنا بنص رسالتك.':err.message||'تعذر إرسال الرسالة. حاول مجدداً.');}
  finally{window.clearTimeout(timeout);sendingRef.current=false;if(window.turnstile&&widgetRef.current!==null)window.turnstile.reset(widgetRef.current);}
 }
 return <form id="contribution-form" ref={formRef} className="contact-form" onChange={saveDraft} onSubmit={handleSubmit} aria-busy={status==='sending'}>
  <div className="form-row"><label>الاسم <input name="name" autoComplete="name" placeholder="اسمك الكريم" required minLength={2} maxLength={100}/></label><label>البريد الإلكتروني <input name="email" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" required maxLength={250}/></label></div>
  <label>نوع الرسالة <select name="type" required defaultValue={initialType} onChange={changeType}><option value="" disabled>اختر نوع رسالتك</option>{contributionTypes.map(v=><option key={v}>{v}</option>)}</select></label>
  <label>الرسالة <textarea name="message" rows="5" placeholder="اكتب رسالتك هنا..." required minLength={10} maxLength={4000}/></label>
  <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div ref={captchaRef}/>}
  <div className="form-bottom"><button type="submit" className="btn btn-red" disabled={status==='sending'}>{status==='sending'?'جارٍ الإرسال...':'إرسال الرسالة'} <Send size={17}/></button><span className="form-note">نستخدم بياناتك لمعالجة رسالتك والرد عليها. <Link href="/privacy">سياسة الخصوصية</Link></span></div>
  {draftStatus&&<div className="draft-status"><p role="status">{draftStatus}</p><button type="button" onClick={clearDraft} disabled={status==='sending'}>مسح المسودة</button></div>}
  {msg&&<p className={status==='sent'?'feedback success':'feedback error'} role={status==='sent'?'status':'alert'}>{status==='sent'?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>} {msg}</p>}
 </form>
}
