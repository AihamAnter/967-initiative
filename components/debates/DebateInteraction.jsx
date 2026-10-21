'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import ValidatedForm,{FormInput} from './ValidatedForm';
import useAudience,{audienceRequest} from './useAudience';
import useLiveDebateResults from './useLiveDebateResults';
import DebateLiveResults from './DebateLiveResults';
import DebateDisclosure from './DebateDisclosure';
import DebateArena from './DebateArena';
import {pollOpen,formatDebateDateTime} from '@/lib/debates';
function ParticipationGate({user,ready,slug,anchor}){
 const next='/debates/'+slug+'#'+anchor;
 if(!ready)return <p role="status">جارٍ التحقق من الحساب…</p>;
 if(!user)return <p className="debate-login-note">للمشاركة <Link href={'/login?next='+encodeURIComponent(next)}>سجل الدخول</Link> أو <Link href={'/register?next='+encodeURIComponent(next)}>أنشئ حساباً</Link>.</p>;
 if(!user.email_confirmed_at)return <p className="debate-login-note">أكد بريدك الإلكتروني قبل المشاركة. <Link href={'/login?next='+encodeURIComponent(next)}>إرسال رسالة التحقق</Link></p>;
 return null;
}
export default function DebateInteraction({debate}){
 const {user,ready,error:authError}=useAudience(),[rawAccount,setAccount]=useState(null),[notice,setNotice]=useState(''),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false),[myPage,setMyPage]=useState(1),[discussionVersion,setDiscussionVersion]=useState(0),[now,setNow]=useState(()=>Date.now());
 const liveResults=useLiveDebateResults(debate.id),activeUser=useRef(null),accountRevision=useRef(0);activeUser.current=user?.id||null;
 const account=rawAccount?.user.id===user?.id?rawAccount:null;
 useEffect(()=>{const next=(debate.polls||[]).filter(p=>p.enabled).flatMap(p=>[p.opens_at,p.closes_at]).filter(Boolean).map(Date.parse).filter(time=>time>now).sort((a,b)=>a-b)[0];if(!next)return;const timer=setTimeout(()=>setNow(Date.now()),Math.min(Math.max(next-Date.now()+25,25),2147480000));return()=>clearTimeout(timer);},[debate.polls,now]);
 const reloadAccount=useCallback(async pageOverride=>{const revision=++accountRevision.current;if(!user){setAccount(null);return;}const owner=user.id;try{const result=await audienceRequest('/api/account?debate='+debate.id+'&page='+(Number.isInteger(pageOverride)?pageOverride:myPage));if(activeUser.current===owner&&result.user.id===owner&&revision===accountRevision.current)setAccount(result);}catch(err){if(activeUser.current===owner&&revision===accountRevision.current){setFailed(true);setNotice(err.message);}}},[user,debate.id,myPage]);
 useEffect(()=>{const guard=accountRevision;setAccount(null);reloadAccount();return()=>{guard.current++;};},[reloadAccount]);
 useEffect(()=>{if(account&&myPage>1&&!account.debate_comments.items.length&&!account.debate_questions.items.length)setMyPage(Math.max(1,Math.ceil(Math.max(account.debate_comments.total,account.debate_questions.total)/20)));},[account,myPage]);
 async function act(body,success){setBusy(true);setNotice('');setFailed(false);try{await audienceRequest('/api/debates',body);const isNew=body.action==='comment'||body.action==='question';if(isNew)setMyPage(1);await Promise.all([reloadAccount(isNew?1:undefined),...(body.action==='vote'?[liveResults.refresh()]:[])]);if(body.action!=='vote')setDiscussionVersion(n=>n+1);setNotice(success);return true;}catch(err){setFailed(true);setNotice(err.message);return false;}finally{setBusy(false);}}
 const canParticipate=Boolean(user?.email_confirmed_at&&account?.profile&&!account.profile.suspended&&!account.profile.deletion_requested_at);
 const gate=anchor=><ParticipationGate user={user} ready={ready} slug={debate.slug} anchor={anchor}/>;
 const polls=debate.polls?.filter(p=>p.enabled).sort((a,b)=>a.phase==='before'?-1:b.phase==='before'?1:0)||[];
 return <div className="debate-interactions debate-interactions-compact">
  {authError&&<p role="status">{authError}</p>}{user&&account&&!account.profile&&<p className="debate-login-note">أكمل اسم العرض ووافق على شروط المشاركة في <Link href="/account">ملفك الشخصي</Link>.</p>}{account?.profile?.suspended&&<p className="feedback error">المشاركة معطلة لهذا الحساب. {account.profile.suspension_reason}</p>}{account?.profile?.deletion_requested_at&&<p>المشاركة متوقفة أثناء معالجة طلب حذف الحساب.</p>}
  {notice&&<p className={'debate-sticky-notice feedback '+(failed?'error':'success')} role={failed?'alert':'status'}>{notice}</p>}
  {polls.length>0&&<DebateDisclosure id="polls" title="استطلاعات المشاهدين" description="شارك برأيك قبل المناظرة وبعدها"><p className="debate-poll-question">{debate.question}</p><div className="debate-poll-grid">{polls.map(poll=>{
   const before=poll.phase==='before',anchor='vote-'+poll.phase,vote=account?.debate_votes.items.find(v=>v.poll_id===poll.id),open=pollOpen(poll,debate,now),afterAllowed=before||(debate.debate_type==='prerecorded'?debate.recording_published:['ended','recording_available'].includes(debate.stage));
   return <section key={poll.id} id={anchor} className="debate-poll-compact"><div className="debate-poll-title"><span className="debate-poll-step">{before?'1':'2'}</span><h3>{before?(debate.debate_type==='prerecorded'?'قبل المشاهدة':'قبل المناظرة'):(debate.debate_type==='prerecorded'?'بعد المشاهدة':'بعد المناظرة')}</h3><span className="debate-poll-state">{vote?'صوتك محفوظ':open&&afterAllowed?'متاح الآن':'غير متاح'}</span></div>
    {(poll.opens_at||poll.closes_at)&&<details className="debate-poll-dates"><summary>مواعيد التصويت</summary>{poll.opens_at&&<p>يفتح: {formatDebateDateTime(poll.opens_at)}</p>}{poll.closes_at&&<p>يغلق: {formatDebateDateTime(poll.closes_at)}</p>}</details>}
    {vote&&<p className="debate-poll-saved" role="status">حُفظ صوتك. {poll.allow_change&&open?'يمكنك تعديل اختيارك حتى الإغلاق.':'لك صوت واحد في هذه المرحلة.'}</p>}
    {open&&afterAllowed?<>{gate(anchor)}<ValidatedForm className="debate-vote-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await act({action:'vote',id:poll.id,data:{debate_id:debate.id,option_id:f.get('option_id'),watched_confirmed:Boolean(f.get('watched_confirmed'))}},'تم حفظ اختيارك بخصوصية.');}}><fieldset key={vote?.option_id||'unvoted'} disabled={busy||!canParticipate||Boolean(vote&&!poll.allow_change)}><legend>اختر موقفك <span className="debate-required-inline" aria-hidden="true">*</span></legend><div className="debate-vote-choices">{debate.options.map(option=><label className="debate-poll-choice" key={option.id}><FormInput type="radio" name="option_id" value={option.id} defaultChecked={vote?.option_id===option.id} required/><span>{option.label}</span></label>)}</div>{!before&&debate.debate_type==='prerecorded'&&<label className="debate-watch-confirm"><FormInput type="checkbox" name="watched_confirmed" required defaultChecked={Boolean(vote?.watched_confirmed)}/><span>أؤكد أنني شاهدت التسجيل <span className="debate-required-inline" aria-hidden="true">*</span></span></label>}<button className="btn btn-primary" disabled={busy||!canParticipate||Boolean(vote&&!poll.allow_change)}>{vote?'حفظ تعديل الاختيار':'حفظ صوتي'}</button></fieldset></ValidatedForm></>:<p className="small-muted">{!afterAllowed?'يتاح بعد انتهاء المناظرة أو نشر التسجيل.':poll.opens_at&&Date.parse(poll.opens_at)>now?'لم يفتح هذا الاستطلاع بعد.':'هذا الاستطلاع مغلق.'}</p>}
   </section>;
  })}</div></DebateDisclosure>}
  <DebateLiveResults {...liveResults} debateType={debate.debate_type}/>
  <DebateArena debate={debate} user={user} account={account} canParticipate={canParticipate} busy={busy} act={act} gate={gate} refreshVersion={discussionVersion} myPage={myPage} setMyPage={setMyPage}/>
 </div>;
}
