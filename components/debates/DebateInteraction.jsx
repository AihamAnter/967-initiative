'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from '@/components/SiteLink';
import {useRouter} from 'next/navigation';
import useAudience,{audienceRequest} from './useAudience';
import useLiveDebateResults from './useLiveDebateResults';
import DebatePollExperience from './DebatePollExperience';
import DebateArena from './DebateArena';
import {useInlineEditor} from '@/components/inline/InlineEditorProvider';
import {participationNotice} from '@/lib/debatePublication';
import {prepareDebateDraftReturn,safeTabStorage} from '@/lib/debateDraft';
import {debateParticipationSummary} from '@/lib/debates';

function ParticipationGate({user,ready,slug,anchor,debateId}){
 const next='/debates/'+slug+'#'+anchor;
 function authenticate(event,mode){event.preventDefault();const target=prepareDebateDraftReturn(safeTabStorage(),debateId,next,crypto.randomUUID());location.assign('/'+mode+'?next='+encodeURIComponent(target));}
 if(!ready)return <p role="status">جارٍ التحقق من الحساب…</p>;
 if(!user)return <p className="debate-login-note">المشاهدة متاحة دون حساب. اكتب مسودتك هنا، ثم <Link href={'/login?next='+encodeURIComponent(next)} onClick={event=>authenticate(event,'login')}>سجل الدخول</Link> أو <Link href={'/register?next='+encodeURIComponent(next)} onClick={event=>authenticate(event,'register')}>أنشئ حساباً</Link> لإرسالها. تُحفظ المسودة في علامة التبويب هذه لمدة 30 دقيقة إذا سمحت إعدادات المتصفح بالتخزين.</p>;
 if(!user.email_confirmed_at)return <p className="debate-login-note">أكد بريدك الإلكتروني قبل المشاركة. <Link href={'/login?next='+encodeURIComponent(next)}>إرسال رسالة التحقق</Link></p>;
 return null;
}

export default function DebateInteraction({debate:initialDebate}){
 const {user,ready,error:authError}=useAudience(),[rawAccount,setAccount]=useState(null),[notice,setNotice]=useState(''),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false),[myPage,setMyPage]=useState(1),[discussionVersion,setDiscussionVersion]=useState(0),[now,setNow]=useState(()=>Date.now()),[questionBlocked,setQuestionBlocked]=useState(false),[pollStale,setPollStale]=useState(false);
 const liveResults=useLiveDebateResults(initialDebate.id),activeUser=useRef(null),accountRevision=useRef(0),routedState=useRef(''),router=useRouter();activeUser.current=user?.id||null;
 const refreshParticipation=liveResults.refresh;
 const incoming=liveResults.data?.participation;
 const newer=incoming&&(!initialDebate.updated_at||Date.parse(incoming.updated_at)>=Date.parse(initialDebate.updated_at));
 const unavailable=!liveResults.loading&&!liveResults.error&&liveResults.data===null;
 const debate={...initialDebate,...(newer?incoming:{}),...(unavailable?{publication_status:'hidden',questions_open:false,comments_open:false,polls:[]}:{}),...(questionBlocked?{questions_closed_after_recording:true}:{})};
 const account=rawAccount?.user.id===user?.id?rawAccount:null,inline=useInlineEditor();
 useEffect(()=>{setQuestionBlocked(false);setPollStale(false);routedState.current='';},[initialDebate.id]);
 useEffect(()=>{if(liveResults.data?.updated_at)setPollStale(false);},[liveResults.data?.updated_at]);
 useEffect(()=>{refreshParticipation();},[initialDebate.id,initialDebate.updated_at,refreshParticipation]);
 useEffect(()=>{
  if(!newer||unavailable)return;
  const signature=[incoming.recording_published,incoming.stage,incoming.publication_status,incoming.updated_at].join(':');
  if(signature!==[initialDebate.recording_published,initialDebate.stage,initialDebate.publication_status,initialDebate.updated_at].join(':')&&signature!==routedState.current){routedState.current=signature;router.refresh();}
 },[newer,unavailable,incoming,initialDebate.recording_published,initialDebate.stage,initialDebate.publication_status,initialDebate.updated_at,router]);
 useEffect(()=>{const next=(debate.polls||[]).filter(p=>p.enabled).flatMap(p=>[p.opens_at,p.closes_at]).filter(Boolean).map(Date.parse).filter(time=>time>now).sort((a,b)=>a-b)[0];if(!next)return;const timer=setTimeout(()=>setNow(Date.now()),Math.min(Math.max(next-Date.now()+25,25),2147480000));return()=>clearTimeout(timer);},[debate.polls,now]);
 const reloadAccount=useCallback(async pageOverride=>{const revision=++accountRevision.current;if(!user){setAccount(null);return;}const owner=user.id;try{const result=await audienceRequest('/api/account?debate='+initialDebate.id+'&page='+(Number.isInteger(pageOverride)?pageOverride:myPage));if(activeUser.current===owner&&result.user.id===owner&&revision===accountRevision.current)setAccount(result);}catch(err){if(activeUser.current===owner&&revision===accountRevision.current){setFailed(true);setNotice(err.message);}}},[user,initialDebate.id,myPage]);
 useEffect(()=>{const guard=accountRevision;setAccount(null);reloadAccount();return()=>{guard.current++;};},[reloadAccount]);
 useEffect(()=>{if(inline.revision&&user&&(!inline.lastChange?.debate_id||inline.lastChange.debate_id===initialDebate.id)){reloadAccount();refreshParticipation();}},[inline.revision,inline.lastChange,initialDebate.id,reloadAccount,user,refreshParticipation]);
 useEffect(()=>{if(account&&myPage>1&&!account.debate_comments.items.length&&!account.debate_questions.items.length)setMyPage(Math.max(1,Math.ceil(Math.max(account.debate_comments.total,account.debate_questions.total)/20)));},[account,myPage]);
 async function act(body,success){
  setBusy(true);setNotice('');setFailed(false);
  try{const result=await audienceRequest('/api/debates',body);const isNew=body.action==='comment'||body.action==='question';if(isNew)setMyPage(1);await Promise.all([reloadAccount(isNew?1:undefined),...(body.action==='vote'?[refreshParticipation()]:[])]);if(body.action!=='vote')setDiscussionVersion(n=>n+1);setNotice(participationNotice(body.action,result,success).message);return true;}
  catch(err){setFailed(true);setNotice(err.message);if(err.code==='questions_closed_after_recording')setQuestionBlocked(true);if(body.action==='vote')setPollStale(true);if(body.action==='question'||body.action==='vote')await refreshParticipation();return false;}
  finally{setBusy(false);}
 }
 const canParticipate=Boolean(user?.email_confirmed_at&&account?.profile&&!account.profile.suspended&&!account.profile.deletion_requested_at&&debate.publication_status==='published'&&debate.stage!=='cancelled');
 const gate=anchor=><ParticipationGate user={user} ready={ready} slug={debate.slug} anchor={anchor} debateId={debate.id}/>;
 return <div className="debate-interactions debate-interactions-compact">
  {authError&&<p role="status">{authError}</p>}{user&&account&&!account.profile&&<p className="debate-login-note">أكمل اسم العرض ووافق على شروط المشاركة في <Link href="/account">ملفك الشخصي</Link>.</p>}{account?.profile?.suspended&&<p className="feedback error">المشاركة معطلة لهذا الحساب. {account.profile.suspension_reason}</p>}{account?.profile?.deletion_requested_at&&<p>المشاركة متوقفة أثناء معالجة طلب حذف الحساب.</p>}
  {unavailable&&<p className="feedback error" role="status">لم تعد هذه المناظرة متاحة للمشاركة.</p>}
  {notice&&<p className={'debate-sticky-notice feedback '+(failed?'error':'success')} role={failed?'alert':'status'}>{notice}</p>}
  <DebatePollExperience debate={debate} account={account} canParticipate={canParticipate} busy={busy} act={act} gate={gate} now={now} liveResults={liveResults} stale={pollStale}/>
  <p className="debate-participation-summary" role="status">{debateParticipationSummary(debate)}</p>
  <DebateArena debate={debate} user={user} ready={ready} account={account} canParticipate={canParticipate} busy={busy} act={act} gate={gate} refreshVersion={discussionVersion} myPage={myPage} setMyPage={setMyPage} refreshAccount={user?reloadAccount:null}/>
 </div>;
}
