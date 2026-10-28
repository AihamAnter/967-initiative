'use client';
import {useState} from 'react';
import {ArrowLeft,RotateCcw} from 'lucide-react';
import {formatYear,isTimelineCorrect} from '@/lib/arcadeChallenges';
import {geometryToPath,boundsToViewBox,viewBoxToString} from '@/components/yemen-map/mapGeometry';
import styles from './ArcadeChallenge.module.css';

export function PlaceBoard({task,locked,onAnswer,onReady}){
 const [broken,setBroken]=useState(false);
 return <div className={styles.placeBoard}>
  <figure className={styles.placePhoto}>
   {!broken?<img key={task.id} src={task.photo.url} alt="صورة لأحد المواقع اليمنية؛ خمن اسم الموقع من الاختيارات" loading="eager" onLoad={()=>onReady(true)} onError={()=>{setBroken(true);onReady(true);}}/>:
    <div className={styles.imageFallback}><p>تعذر تحميل الصورة من ويكيميديا.</p><p>استخدم التلميح للإجابة عن السؤال.</p></div>}
   <figcaption>صورة لمكان يمني — اختر اسمه قبل انتهاء الوقت</figcaption>
  </figure>
  {broken&&<p className={styles.hint}>التلميح: {task.hint}</p>}
  <div className={styles.options}>{task.options.map((value,i)=><button type="button" key={i} disabled={locked} onClick={()=>onAnswer(i)}
   className={locked&&task.correct===i?styles.correct:locked?'':''}>
   <span className={styles.optionIndex}>{['أ','ب','ج','د'][i]}</span>{value}
  </button>)}</div>
 </div>;
}

export function TimelineBoard({task,locked,onAnswer}){
 const [chosen,setChosen]=useState([]);
 const nextPosition=chosen.length+1;
 const choose=id=>{
  if(locked||chosen.includes(id))return;
  const next=[...chosen,id];setChosen(next);
  if(next.length===task.events.length)onAnswer(next);
 };
 return <div className={styles.timelineBoard}>
  <p>اضغط على الأحداث واحداً تلو الآخر، من <strong>الأقدم إلى الأحدث</strong>. {task.events.length} أحداث لإكمال الترتيب.</p>
  <div className={styles.timelineSlots} aria-label="التسلسل الذي اخترته">
   {Array.from({length:task.events.length},(_,i)=><span key={i} className={chosen[i]?styles.filledSlot:''}>{chosen[i]?task.events.find(event=>event.id===chosen[i])?.title:'المحطة '+(i+1)}</span>)}
  </div>
  <div className={styles.timelineOptions}>{task.events.map(event=><button type="button" key={event.id}
   disabled={locked||chosen.includes(event.id)} aria-pressed={chosen.includes(event.id)}
   onClick={()=>choose(event.id)}>
   <span className={styles.eventNumber}>{chosen.includes(event.id)?chosen.indexOf(event.id)+1:nextPosition}</span>{event.title}
  </button>)}</div>
  {!locked&&chosen.length>0&&<button type="button" className={styles.undo} onClick={()=>setChosen(previous=>previous.slice(0,-1))}><RotateCcw size={16}/> تراجع عن آخر اختيار</button>}
  {locked&&<div className={styles.correctOrder}>الترتيب الصحيح: {[...task.events].sort((a,b)=>a.year-b.year).map(event=><span key={event.id}><b>{formatYear(event.year)}</b> — {event.title}</span>)}</div>}
 </div>;
}

export function MapBoard({task,locked,onAnswer,data,selectedId}){
 if(!data)return <p role="status">جاري تحميل خريطة اليمن…</p>;
 const box=boundsToViewBox(data.country.bounds,0.08);
 return <div className={styles.mapBoard}>
  <p>أين تقع <strong>محافظة {task.name}</strong>؟ انقر على منطقتها في الخريطة. أسماء المحافظات مخفية حتى تختبر معرفتك.</p>
  <div className={styles.mapSurface}>
   <svg viewBox={viewBoxToString(box)} role="group" aria-label="خريطة تفاعلية لمحافظات اليمن دون أسماء؛ حدد المحافظة المطلوبة" preserveAspectRatio="xMidYMid meet">
    {data.governorates.map((region,i)=><path key={region.id} d={geometryToPath(region.geometry)}
     className={[styles.region,locked&&region.id===task.regionId?styles.correctRegion:'',locked&&region.id===selectedId&&region.id!==task.regionId?styles.wrongRegion:''].join(' ')}
     role="button" tabIndex={locked?-1:0} aria-label={'منطقة الخريطة رقم '+(i+1)}
     aria-disabled={locked}
     onClick={()=>{if(!locked)onAnswer(region.id);}}
     onKeyDown={e=>{if(!locked&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onAnswer(region.id);}}}
    />)}
   </svg>
  </div>
  <small className={styles.mapCredit}>حدود المحافظات مأخوذة من ملفات الأطلس الجغرافي لمبادرة 967. الدقة للتعلم ولا تمثل حدوداً تاريخية.</small>
 </div>;
}
