'use client';
import {useEffect,useState} from 'react';
import ValidatedForm,{FormInput} from './ValidatedForm';
import DebateDisclosure from './DebateDisclosure';
import DebateLiveResults from './DebateLiveResults';
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
 return <DebateDisclosure id="polls" title="استطلاع الرأي" description={after?'بعد المشاهدة':'قبل المشاهدة'} defaultOpen>
  <span id="results" className="debate-legacy-anchor" aria-hidden="true"/><span id="vote-before" className="debate-legacy-anchor" aria-hidden="true"/><span id="vote-after" className="debate-legacy-anchor" aria-hidden="true"/>
  <section className="debate-current-poll" data-current-phase={phase}><h3>استطلاع الرأي — {after?'بعد المشاهدة':'قبل المشاهدة'}</h3><p className="debate-poll-question">{debate.question}</p>
   {poll&&(poll.opens_at||poll.closes_at)&&<details className="debate-poll-dates"><summary>مواعيد التصويت</summary>{poll.opens_at&&<p>يفتح: {formatDebateDateTime(poll.opens_at)}</p>}{poll.closes_at&&<p>يغلق: {formatDebateDateTime(poll.closes_at)}</p>}</details>}
   {vote&&<p className="debate-poll-saved" role="status">صوتك محفوظ: {debate.options?.find(option=>option.id===vote.option_id)?.label||'اختيارك في هذه المرحلة'}. {open&&poll.allow_change?'يمكنك تعديل اختيارك حتى الإغلاق.':'لك صوت واحد في هذه المرحلة.'}</p>}
   {unavailable&&<p className="debate-poll-unavailable" role="status">{unavailable}</p>}
   {open&&(!vote||editing)?<>{gate('polls')}<ValidatedForm key={poll.id+':'+phase} className="debate-vote-form" data-vote-phase={phase} onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);if(await act({action:'vote',id:poll.id,data:{debate_id:debate.id,option_id:form.get('option_id'),watched_confirmed:Boolean(form.get('watched_confirmed'))}},'حُفظ صوتك. تظهر النتائج المتاحة في البطاقة نفسها.'))setEditing(false);}}><fieldset disabled={busy||!canParticipate}><legend>اختر موقفك <span className="debate-required-inline" aria-hidden="true">*</span></legend><div className="debate-vote-choices">{(debate.options||[]).map(option=><label className="debate-poll-choice" key={option.id}><FormInput type="radio" name="option_id" value={option.id} required defaultChecked={vote?.option_id===option.id}/><span>{option.label}</span></label>)}</div>{after&&debate.debate_type==='prerecorded'&&<label className="debate-watch-confirm"><FormInput type="checkbox" name="watched_confirmed" required defaultChecked={Boolean(vote?.watched_confirmed)}/><span>أؤكد أنني شاهدت التسجيل <span className="debate-required-inline" aria-hidden="true">*</span></span></label>}<button className="btn btn-primary" disabled={busy||!canParticipate}>{vote?'حفظ تعديل اختياري':'حفظ صوتي'}</button>{editing&&<button type="button" className="btn btn-outline" disabled={busy} onClick={()=>setEditing(false)}>إلغاء التعديل</button>}</fieldset></ValidatedForm></>:open&&vote&&poll.allow_change&&<button type="button" className="btn btn-outline" disabled={busy||!canParticipate} onClick={()=>setEditing(true)}>تعديل صوتي</button>}
  </section>
  <DebateLiveResults {...liveResults} currentPhase={phase}/>
 </DebateDisclosure>;
}
