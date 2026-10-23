'use client';
import ValidatedForm,{FormInput,FormTextarea,FormSelect,FormLabel} from './ValidatedForm';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {browserDb} from '@/lib/supabase';
import {safeAccountReturn} from '@/lib/debates';
import {accountAuthErrorMessage} from '@/lib/authErrors';
import {claimSessionDebateDraft,safeTabStorage} from '@/lib/debateDraft';

const labels={login:'تسجيل الدخول',register:'إنشاء حساب',forgot:'استعادة كلمة المرور',update:'تحديث كلمة المرور',callback:'تأكيد الحساب'};
export default function AudienceAuth({mode='login'}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[failed,setFailed]=useState(false),[next,setNext]=useState('/account');
 const db=browserDb();
 useEffect(()=>{const params=new URLSearchParams(location.search);setNext(safeAccountReturn(params.get('next')));},[]);
 useEffect(()=>{
  if(mode!=='callback'||!db)return;
  let live=true;
  (async()=>{try{
   const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
   if(params.has('error')||hash.has('error'))throw Error('تعذر تأكيد الرابط. قد يكون منتهياً أو مستخدماً من قبل. اطلب رسالة جديدة.');
   if(params.has('code')){const result=await db.auth.exchangeCodeForSession(params.get('code'));if(result.error)throw result.error;}
   const {data,error}=await db.auth.getSession();if(error||!data.session)throw Error('افتح رابط التأكيد من بريدك الإلكتروني، أو سجل الدخول بعد التأكيد.');
   if(live){const target=safeAccountReturn(params.get('next'));claimSessionDebateDraft(safeTabStorage(),target,data.session);location.replace(target);}
  }catch{if(live){setFailed(true);setNotice('تعذر إكمال التأكيد. قد يكون الرابط منتهياً. يمكنك تسجيل الدخول أو طلب رسالة تحقق جديدة.');}}})();
  return()=>{live=false;};
 },[mode,db]);
 async function submit(e){e.preventDefault();setBusy(true);setNotice('');setFailed(false);const form=new FormData(e.currentTarget),email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
  try{
   if(!db)throw Error('خدمة الحسابات غير مفعّلة بعد.');
   let result;
   if(mode==='login')result=await db.auth.signInWithPassword({email,password});
   if(mode==='register'){
    if(!form.get('accepted'))throw Error('الموافقة على الشروط والخصوصية مطلوبة.');
    result=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/auth/callback?next='+encodeURIComponent(next),data:{display_name:String(form.get('display_name')).trim(),audience_terms:true}}});
   }
   if(mode==='forgot')result=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/update-password'});
   if(mode==='update'){
    if(password!==form.get('confirmation'))throw Error('كلمتا المرور غير متطابقتين.');
    const session=await db.auth.getSession();if(!session.data.session)throw Error('افتح رابط استعادة كلمة المرور المرسل إلى بريدك أولاً.');
    result=await db.auth.updateUser({password});
   }
   if(result?.error)throw Error(accountAuthErrorMessage(result.error,mode));
   if(mode==='login'){claimSessionDebateDraft(safeTabStorage(),next,result.data.session);location.assign(next);return;}
   if(mode==='register'){if(result.data.session){claimSessionDebateDraft(safeTabStorage(),next,result.data.session);location.assign(next);return;}setNotice('تحقق من بريدك وافتح رسالة تأكيد الحساب، ثم سجل الدخول.');}
   if(mode==='forgot')setNotice('إذا كان البريد مرتبطاً بحساب، ستصلك رسالة لاستعادة كلمة المرور.');
   if(mode==='update'){setNotice('تم تحديث كلمة المرور. يمكنك العودة إلى حسابك.');e.target.reset();}
   if(mode!=='update')e.target.reset();
  }catch(error){setFailed(true);setNotice(error?.__isAuthError||['TypeError','AbortError','TimeoutError'].includes(error?.name)?accountAuthErrorMessage(error,mode):error.message);}finally{setBusy(false);}
 }
 async function resend(e){e.preventDefault();setBusy(true);setFailed(false);try{const email=String(new FormData(e.currentTarget).get('email')).trim();const result=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+'/auth/callback?next='+encodeURIComponent(next)}});if(result.error)throw result.error;setNotice('إذا كان الحساب بانتظار التأكيد، ستصلك رسالة جديدة.');}catch{setFailed(true);setNotice('تعذر إرسال رسالة التأكيد. حاول لاحقاً.');}setBusy(false);}
 return <div className="container debate-auth"><Link href="/" className="eyebrow">مبادرة 967 · حساب المستخدم</Link><h1>{labels[mode]}</h1><p>يمكنك تصفح 967 دون حساب. أنشئ حساباً للمشاركة في المناظرات، والتصويت، وطرح الأسئلة، ومتابعة مشاركاتك.</p>{!db&&<p className="feedback error" role="alert">خدمة الحسابات غير مفعّلة بعد.</p>}
  {next.includes('draft=')&&<p className="small-muted">للحفاظ على مسودة مشاركتك، أكمل الدخول في علامة التبويب هذه خلال 30 دقيقة. إذا فتحت رسالة التأكيد في علامة تبويب أخرى، عُد إلى هذه العلامة وسجل الدخول.</p>}
  {mode!=='callback'&&<ValidatedForm className="debate-form" onSubmit={submit}><fieldset disabled={busy||!db}>
   {mode==='register'&&<FormLabel>اسم العرض<FormInput name="display_name" required minLength={2} maxLength={60} autoComplete="nickname"/><small>يمكن استخدام اسم مستعار. لا يُطلب نشر اسمك الحقيقي.</small></FormLabel>}
   {mode!=='update'&&<FormLabel>البريد الإلكتروني<FormInput name="email" type="email" dir="ltr" required maxLength={254} autoComplete="email"/></FormLabel>}
   {mode!=='forgot'&&<FormLabel>{mode==='update'?'كلمة المرور الجديدة':'كلمة المرور'}<FormInput name="password" type="password" minLength={mode==='login'?undefined:8} maxLength={128} required autoComplete={mode==='login'?'current-password':'new-password'}/></FormLabel>}
   {mode==='update'&&<FormLabel>تأكيد كلمة المرور<FormInput name="confirmation" type="password" minLength={8} maxLength={128} required autoComplete="new-password"/></FormLabel>}
   {mode==='register'&&<FormLabel className="debate-check"><FormInput type="checkbox" name="accepted" required/><span>أوافق على <Link href="/terms" target="_blank">شروط الاستخدام</Link> و<Link href="/privacy" target="_blank">سياسة الخصوصية</Link>.</span></FormLabel>}
   <button className="btn btn-primary" disabled={busy||!db}>{busy?'جارٍ التنفيذ…':labels[mode]}</button>
  </fieldset></ValidatedForm>}
  {notice&&<p className={'feedback '+(failed?'error':'success')} role={failed?'alert':'status'}>{notice}</p>}
  {mode==='callback'&&!notice&&<p role="status">جارٍ التحقق من الرابط…</p>}
  <nav className="debate-actions" aria-label="خيارات الحساب"><Link href={'/login?next='+encodeURIComponent(next)}>تسجيل الدخول</Link><Link href={'/register?next='+encodeURIComponent(next)}>حساب جديد</Link><Link href="/forgot-password">نسيت كلمة المرور</Link><Link href="/account">حسابي</Link></nav>
  {['login','callback'].includes(mode)&&<details><summary>إعادة إرسال رسالة تأكيد البريد</summary><ValidatedForm className="debate-form" onSubmit={resend}><FormLabel>بريد الحساب<FormInput name="email" type="email" dir="ltr" required autoComplete="email"/></FormLabel><button className="btn btn-outline" disabled={busy||!db}>إرسال رسالة التحقق</button></ValidatedForm></details>}
 </div>;
}
