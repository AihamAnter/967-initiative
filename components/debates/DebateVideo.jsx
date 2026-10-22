'use client';
import {useEffect,useState} from 'react';
import {Play,ExternalLink} from 'lucide-react';
import {parseMediaUrl} from '@/lib/media';
import {httpsUrl,publicRecordingAvailable,recordingPreviewState,questionsAvailable,pollOpen} from '@/lib/debates';
import DebateCover from './DebateCover';
import DebateSchedule from './DebateSchedule';
export default function DebateVideo({debate,now=0}){
 const [loaded,setLoaded]=useState(false),[start,setStart]=useState(0);
 const url=httpsUrl(debate.recording_url),parsed=parseMediaUrl(url),youtube=parsed.kind==='youtube'||parsed.provider==='youtube'||parsed.embedUrl?.includes('youtube');
 const embed=youtube&&parsed.embedUrl?parsed.embedUrl.replace('www.youtube.com','www.youtube-nocookie.com').replace('youtube.com/','youtube-nocookie.com/')+(parsed.embedUrl.includes('?')?'&':'?')+'start='+start+'&autoplay=1':null;
 const available=publicRecordingAvailable(debate),state=recordingPreviewState(debate);
 useEffect(()=>{setLoaded(false);setStart(0);},[debate.id,url,available]);
 if(!available){
  const liveUrl=debate.stage!=='cancelled'&&httpsUrl(debate.live_url),questions=questionsAvailable(debate),beforeOpen=pollOpen(debate.polls?.find(p=>p.phase==='before'),debate,now);
  const captions={pending:'التسجيل قادم',live:'تُبث المناظرة الآن على منصة خارجية',ended:'انتهى البث الخارجي؛ التسجيل لم يُنشر بعد',postponed:'المناظرة مؤجلة',cancelled:'أُلغيت هذه المناظرة',withdrawn:'التسجيل غير متاح حالياً',archived:'مناظرة مؤرشفة'};
  return <section className="debate-recording-preview" id="recording" data-preview-state={state}><div className="debate-preview-cover"><DebateCover url={debate.cover_url} title={debate.title} eager/><p className="debate-preview-caption">{captions[state]}</p></div><DebateSchedule debate={debate}/>
   {liveUrl&&debate.debate_type==='external_live'&&<div className="debate-preview-live"><div><strong>{state==='live'?'مباشر الآن على '+(debate.live_platform||'المنصة الخارجية'):'البث الخارجي'}</strong><p>رابط المنصة الخارجية مستقل عن إتاحة التسجيل على 967.</p></div><a href={liveUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">{state==='live'?'شاهد البث المباشر':'صفحة البث الخارجي'} <ExternalLink size={16}/></a></div>}
   {(questions||beforeOpen)&&<div className="debate-preview-participation"><p>{questions&&beforeOpen?'الأسئلة واستطلاع قبل المشاهدة متاحان الآن.':questions?'يمكنك طرح سؤالك قبل نشر التسجيل.':'استطلاع قبل المشاهدة متاح الآن.'}</p><div>{questions&&<a href="#questions">اطرح سؤالك</a>}{beforeOpen&&<a href="#polls">شارك برأيك</a>}</div></div>}
  </section>;
 }
 return <section className="debate-watch" id="recording">
  <div className="debate-video">{loaded&&embed?<iframe key={start} src={embed} title={'تسجيل '+debate.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>:<div className="debate-video-poster"><DebateCover url={debate.cover_url} title={debate.title} eager/>{embed?<button onClick={()=>setLoaded(true)} className="btn btn-primary"><Play size={22}/> تشغيل المناظرة</button>:<p>شاهد التسجيل على المنصة الأصلية عبر الرابط أدناه.</p>}</div>}</div>
  <div className="debate-watch-footer"><div><h2>تسجيل المناظرة</h2>{debate.duration_seconds&&<span>{Math.ceil(debate.duration_seconds/60)} دقيقة</span>}</div><a href={url} target="_blank" rel="noopener noreferrer">فتح على المنصة الأصلية <ExternalLink size={14}/></a></div>
  {debate.chapters?.length>0&&<details className="debate-video-chapters"><summary>فصول التسجيل <span>{debate.chapters.length}</span></summary><div className="debate-chapters">{debate.chapters.map(c=><button disabled={!embed} key={c.id} onClick={()=>{setStart(c.start_seconds);setLoaded(true);document.getElementById('recording')?.scrollIntoView({block:'start',behavior:'smooth'});}}><bdi>{Math.floor(c.start_seconds/60)}:{String(c.start_seconds%60).padStart(2,'0')}</bdi> {c.title}</button>)}</div></details>}
 </section>;
}
