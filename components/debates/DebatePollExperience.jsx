'use client';
import {useEffect,useState} from 'react';
import ValidatedForm,{FormInput} from './ValidatedForm';
import DebateDisclosure from './DebateDisclosure';
import DebateLiveResults from './DebateLiveResults';
import {CheckCircle2,Clock,Info,Lock,Pencil,Vote} from 'lucide-react';
import './DebatePoll.css';
import {currentPollPhase,pollOpen,formatDebateDateTime} from '@/lib/debates';

export default function DebatePollExperience({debate,account,canParticipate,busy,act,gate,now,liveResults,stale=false}){
 const phase=currentPollPhase(debate),poll=debate.polls?.find(item=>item.phase===phase),vote=account?.debate_votes.items.find(item=>item.poll_id===poll?.id),[editing,setEditing]=useState(false);
 const open=pollOpen(poll,debate,now)&&!stale,after=phase==='after';
 useEffect(()=>setEditing(false),[phase,poll?.id,vote?.option_id,vote?.updated_at]);
 let unavailable='';
 if(debate.publication_status!=='published'||debate.stage==='cancelled')unavailable='هذه المناظرة لا تستقبل أصواتاً جديدة. يمكنك قراءة النتائج المتاحة.';
 else if(after&&!debate.recording_published)unavailable='التسجيل غير متاح للعامة حالياً. التصويت متوقف، والأصوات السابقة محفوظة.';
 else if(!poll)unavailable='لم يُضف استطلاع لهذه المرحلة بعد.';
 else if(!poll.enabled)unavailable='استطلاع هذه المرحلة غير مفعّل.';
 else if(poll.is_closed||poll.closes_at&&Date.parse(poll.closes_at)<=now)unavailable='أُغلق استطلاع هذه المرحلة.';
 else if(poll.opens_at&&Date.parse(poll.opens_at)>now)unavailable='لم يفتح هذا الاستطلاع بعد.';
 else if(stale)unavailable='جارٍ التحقق من مرحلة التصويت الحالية. انتظر التحديث قبل المحاولة.';
 const status=vote&&!editing?'saved':open?'open':'closed',statusLabel={saved:'صوتك محفوظ',open:'التصويت مفتوح',closed:'التصويت متوقف'}[status];
 const chosen=debate.options?.find(option=>option.id===vote?.option_id)?.label;
 const StatusIcon={saved:CheckCircle2,open:Vote,closed:Lock}[status];
 // Closed until the visitor opens it; links to #polls, #results and #vote-* still open it.
 return <DebateDisclosure id="polls" className="poll-v2" title="استطلاع الرأي" description={(after?'بعد المشاهدة':'قبل المشاهدة')+' · '+statusLabel}>
  <span id="results" className="debate-legacy-anchor" aria-hidden="true"/><span id="vote-before" className="debate-legacy-anchor" aria-hidden="true"/><span id="vote-after" className="debate-legacy-anchor" aria-hidden="true"/>
  <section className="debate-current-poll poll-v2-card" data-current-phase={phase} data-status={status}>
   <h3 className="sr-only">استطلاع الرأي — {after?'بعد المشاهدة':'قبل المشاهدة'}</h3>
   <div className="poll-v2-top">
    <ol className="poll-v2-phases" aria-label="مراحل الاستطلاع"><li aria-current={!after?'step':undefined}><span>1</span>قبل المشاهدة</li><li aria-current={after?'step':undefined}><span>2</span>بعد المشاهدة</li></ol>
    <span className="poll-v2-status" data-status={status}><StatusIcon size={13} aria-hidden="true"/>{statusLabel}</span>
   </div>
   <p className="debate-poll-question poll-v2-question">{debate.question}</p>
   {poll&&(poll.opens_at||poll.closes_at)&&<p className="debate-poll-dates poll-v2-dates"><Clock size={13} aria-hidden="true"/>{poll.opens_at&&<span>يفتح: {formatDebateDateTime(poll.opens_at)}</span>}{poll.closes_at&&<span>يغلق: {formatDebateDateTime(poll.closes_at)}</span>}</p>}
   {vote&&!editing&&<div className="debate-poll-saved poll-v2-saved" role="status"><CheckCircle2 size={20} aria-hidden="true"/><div><small>اخترت</small><strong>{chosen||'اختيارك في هذه المرحلة'}</strong><span>{open&&poll.allow_change?'يمكنك تعديل اختيارك حتى الإغلاق.':'لك صوت واحد في هذه المرحلة.'}</span></div>{open&&poll.allow_change&&<button type="button" className="btn btn-outline" disabled={busy||!canParticipate} onClick={()=>setEditing(true)}><Pencil size={14} aria-hidden="true"/> تعديل صوتي</button>}</div>}
   {unavailable&&<p className="debate-poll-unavailable poll-v2-note" role="status"><Info size={15} aria-hidden="true"/><span>{unavailable}</span></p>}
   {open&&(!vote||editing)&&<>{gate('polls')}<ValidatedForm key={poll.id+':'+phase} className="debate-vote-form poll-v2-form" data-vote-phase={phase} onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);if(await act({action:'vote',id:poll.id,data:{debate_id:debate.id,option_id:form.get('option_id'),watched_confirmed:Boolean(form.get('watched_confirmed'))}},'حُفظ صوتك. تظهر النتائج المتاحة في البطاقة نفسها.'))setEditing(false);}}><fieldset disabled={busy||!canParticipate}><legend>اختر موقفك <span className="debate-required-inline" aria-hidden="true">*</span></legend><div className="debate-vote-choices">{(debate.options||[]).map(option=><label className="debate-poll-choice" key={option.id}><FormInput type="radio" name="option_id" value={option.id} required defaultChecked={vote?.option_id===option.id}/><span>{option.label}</span></label>)}</div>{after&&debate.debate_type==='prerecorded'&&<label className="debate-watch-confirm"><FormInput type="checkbox" name="watched_confirmed" required defaultChecked={Boolean(vote?.watched_confirmed)}/><span>أؤكد أنني شاهدت التسجيل <span className="debate-required-inline" aria-hidden="true">*</span></span></label>}<div className="poll-v2-actions"><button className="btn btn-primary" disabled={busy||!canParticipate}><Vote size={16} aria-hidden="true"/> {vote?'حفظ تعديل اختياري':'حفظ صوتي'}</button>{editing&&<button type="button" className="btn btn-outline" disabled={busy} onClick={()=>setEditing(false)}>إلغاء التعديل</button>}</div></fieldset></ValidatedForm></>}
  </section>
  <DebateLiveResults {...liveResults} currentPhase={phase}/>
 </DebateDisclosure>;
}
