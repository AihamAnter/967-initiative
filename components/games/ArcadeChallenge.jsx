'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,Flame,Play,RotateCcw,Share2,Target,Trophy,XCircle,Zap} from 'lucide-react';
import {buildPlaceChallenges,buildTimelineChallenges,buildMapChallenges,gameTypes,formatYear,isTimelineCorrect} from '@/lib/arcadeChallenges';
import {questionPoints} from '@/lib/gameEngine';
import {dailySeed} from '@/lib/gameEngine';
import {roundDuration} from '@/lib/gameClock';
import useQuestionTimer from './useQuestionTimer';
import {TimeControls,GameTimer} from './TimeControls';
import {PlaceBoard,TimelineBoard,MapBoard} from './ArcadeBoards';
import styles from './ArcadeChallenge.module.css';

const builders={place:buildPlaceChallenges,timeline:buildTimelineChallenges,map:buildMapChallenges};
function getStored(game){
 try{const x=JSON.parse(localStorage.getItem('967-game-'+game+'-progress-v1')||'null');return x&&typeof x==='object'?x:{plays:0,best:0,correct:0};}
 catch{return {plays:0,best:0,correct:0};}
}
export default function ArcadeChallenge({game,date,initialMode='practice'}){
 const [mode,setMode]=useState(initialMode),[seconds,setSeconds]=useState(15);
 const [tasks,setTasks]=useState([]),[runId,setRunId]=useState(0),[index,setIndex]=useState(0);
 const [answer,setAnswer]=useState(null),[records,setRecords]=useState([]),[finished,setFinished]=useState(false);
 const [ready,setReady]=useState(game==='timeline'),[imageError,setImageError]=useState(false);
 const [mapData,setMapData]=useState(null),[mapError,setMapError]=useState('');
 const [mapAttempt,setMapAttempt]=useState(0);
 const [stats,setStats]=useState({plays:0,best:0,correct:0}),[shareStatus,setShareStatus]=useState('');
 const answerLocked=useRef(false),titleRef=useRef(null);
 useEffect(()=>{setStats(getStored(game));},[game]);
 useEffect(()=>{
  if(game!=='map')return;
  let mounted=true;
  fetch('/data/yemen-map/yemen-boundaries.json').then(res=>{if(!res.ok)throw Error();return res.json();})
  .then(result=>{if(mounted){setMapData(result);setMapError('');}}).catch(()=>{if(mounted)setMapError('تعذر تحميل بيانات خريطة اليمن. يمكنك إعادة المحاولة.');});
  return ()=>{mounted=false;};
 },[game,mapAttempt]);
 const task=tasks[index];
 const duration=roundDuration(mode,seconds);
 const isActive=tasks.length>0&&!finished&&answer===null&&ready;
 const timer=useQuestionTimer({seconds:duration,token:runId+':'+index,active:isActive,onExpire:()=>submitAnswer(null,true)});
 useEffect(()=>{if(tasks.length&&!finished)titleRef.current?.focus({preventScroll:true});},[index,finished,tasks.length]);
 function start(){
  const seed=mode==='daily'?dailySeed(date):'free-'+Date.now()+'-'+Math.random();
  const tasksNow=builders[game]({mode,date,seed});
  if(!tasksNow.length)return;
  answerLocked.current=false;
  setRunId(x=>x+1);setTasks(tasksNow);setIndex(0);setRecords([]);setAnswer(null);
  setReady(game==='timeline'||(game==='map'&&Boolean(mapData)));setImageError(false);
  setFinished(false);setShareStatus('');
 }
 function submitAnswer(value,timedOut=false){
  if(answerLocked.current||!tasks.length||finished)return;
  if(!timedOut&&!timer.claim())return;
  answerLocked.current=true;
  const taskNow=tasks[index];
  const correct=timedOut?false:game==='place'?value===taskNow.correct:game==='map'?value===taskNow.regionId:isTimelineCorrect(taskNow.events,value);
  const streak=records.slice().reverse().findIndex(r=>!r.correct);
  const points=questionPoints(taskNow,correct,streak===-1?records.length:streak);
  const record={correct,points,choice:value,timedOut};
  setAnswer(record);
  setRecords(prev=>[...prev,record]);
 }
 function next(){
  if(!answer)return;
  if(index+1<tasks.length){
   answerLocked.current=false;setReady(game==='timeline'||(game==='map'&&Boolean(mapData)));
   setAnswer(null);setIndex(i=>i+1);setImageError(false);
  }else{
   const total=records.reduce((sum,r)=>sum+r.points,0),correct=records.filter(r=>r.correct).length;
   const old=getStored(game),updated={plays:(old.plays||0)+1,correct:(old.correct||0)+correct,best:Math.max(old.best||0,total)};
   try{localStorage.setItem('967-game-'+game+'-progress-v1',JSON.stringify(updated));}catch{}
   setStats(updated);setFinished(true);
  }
 }
 function reset(){setTasks([]);setIndex(0);setRecords([]);setAnswer(null);setFinished(false);answerLocked.current=false;setShareStatus('');}
 async function share(){
  const total=records.reduce((sum,r)=>sum+r.points,0);
  const url=location.origin+'/games/'+game+(mode==='daily'?'?mode=daily':'');
  const text='حصلت على '+total+' نقطة في «'+gameTypes[game].title+'» ضمن ألعاب 967. هل تتفوق عليّ؟';
  try{if(navigator.share)await navigator.share({title:'ألعاب 967',text,url});
   else if(navigator.clipboard){await navigator.clipboard.writeText(text+' '+url);setShareStatus('تم نسخ رابط المشاركة ونتيجتك.');}
   else setShareStatus('رابط التحدي: '+url);
  }catch(e){if(e?.name!=='AbortError')setShareStatus('شارك الرابط: '+url);}
 }
 const total=records.reduce((sum,r)=>sum+r.points,0);
 const correctCount=records.filter(r=>r.correct).length;
 return <section className={styles.wrapper} aria-label={gameTypes[game].title}><div className="container">
  {!tasks.length&&<div className={styles.setup}>
   <span className={styles.kicker}><Target size={17}/> GAME SETUP / إعداد التحدي</span>
   <h2>اختر سرعتك. وانطلق.</h2><p>{gameTypes[game].description} كل جولة تحتوي على عشر مهام، وبعد اختيار الإجابة يتوقف الوقت حتى تضغط «التالي».</p>
   <div className={styles.modes} role="group" aria-label="نوع الجولة">
    <button type="button" aria-pressed={mode==='practice'} onClick={()=>setMode('practice')}>جولة حرة</button>
    <button type="button" aria-pressed={mode==='daily'} onClick={()=>setMode('daily')}><Flame size={17}/> تحدي اليوم</button>
   </div>
   <TimeControls mode={mode} seconds={seconds} onChange={setSeconds}/>
   {mode==='daily'&&<p className={styles.dailyNote}>تحدي {date} بتوقيت UTC: المهام وترتيبها موحدة لهذا اليوم، والمهلة 7 ثوانٍ لكل مهمة.</p>}
   {game==='map'&&mapError&&<div role="alert" className={styles.mapFailure}>{mapError}<button type="button" onClick={()=>{setMapError('');setMapAttempt(x=>x+1);}}>إعادة التحميل</button></div>}
   <button type="button" className={styles.primary} disabled={game==='map'&&!mapData} onClick={start}><Play size={18}/> ابدأ التحدي <ArrowLeft size={18}/></button>
   <aside className={styles.playerStats}><span><Trophy size={18}/> أفضل نتيجة: {stats.best||0} XP</span><span>الجولات المكتملة: {stats.plays||0}</span><span>نتائج محلية دون تسجيل</span></aside>
  </div>}
  {!!tasks.length&&!finished&&<div className={styles.arena}>
   <header className={styles.arenaHeader}><span>{gameTypes[game].english} <span> / {mode==='daily'?'DAILY':'FREE'}</span></span><strong>المهمة {index+1} / {tasks.length}</strong><span className={styles.xp}><Zap size={15}/> {total} XP</span></header>
   <div className={styles.progress} role="progressbar" aria-label="تقدم الجولة" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={index+1}><span style={{width:((index+1)/tasks.length*100)+'%'}}/></div>
   <h2 ref={titleRef} tabIndex={-1} className={styles.taskTitle}>{game==='place'?'ما اسم المكان في الصورة؟':game==='timeline'?'رتّب الأحداث من الأقدم إلى الأحدث':'أين تقع محافظة '+task.name+'؟'}</h2>
   <div className={styles.taskBody} key={task.id}>
    {game==='place'&&<PlaceBoard task={task} locked={answer!==null} onAnswer={submitAnswer} onReady={setReady}/>}
    {game==='timeline'&&<TimelineBoard task={task} locked={answer!==null} onAnswer={submitAnswer}/>}
    {game==='map'&&<MapBoard task={task} locked={answer!==null} onAnswer={submitAnswer} data={mapData} selectedId={answer?.choice}/>}
   </div>
   {!ready&&<p className={styles.loading} role="status">{game==='place'?'جاري تجهيز الصورة… يبدأ الوقت عند ظهورها.':'جاري تجهيز الخريطة…'}</p>}
   <GameTimer remaining={timer.remaining} duration={duration} paused={!isActive}/>
   {answer&&<div className={[styles.feedback,answer.correct?styles.good:styles.bad].join(' ')} role="status">
    <strong>{answer.timedOut?<><Clock3 size={18}/> انتهى الوقت!</>:answer.correct?<><CheckCircle2 size={18}/> إجابة صحيحة!</>:<><XCircle size={18}/> إجابة غير صحيحة</>}</strong>
    {game==='place'&&<p>المكان هو <b>{task.answer}</b>. {task.hint}</p>}
    {game==='timeline'&&<p>تم عرض الترتيب الصحيح للأحداث مع السنوات أسفلها.</p>}
    {game==='map'&&<p>الموقع الصحيح هو محافظة <b>{task.name}</b>، والمكان مُلوّن بالأخضر على الخريطة.</p>}
    {game==='place'&&<p className={styles.credit}>الصورة: {task.photo.credit} · {task.photo.license} — <a href={task.photo.page} target="_blank" rel="noopener noreferrer">صفحة الصورة وحقوقها</a></p>}
    <a href={game==='place'?task.source:game==='map'?task.source:task.events[0].source} target={game==='map'||game==='timeline'?'_self':'_blank'} rel="noopener noreferrer">اقرأ المزيد عن الموضوع <ArrowLeft size={14}/></a>
    {answer.correct&&<span className={styles.bonus}>+{answer.points} XP</span>}
   </div>}
   <div className={styles.actions}><button type="button" className={styles.secondary} onClick={reset}><ArrowRight size={16}/> إنهاء الجولة</button>
    <button type="button" className={styles.primary} disabled={!answer} onClick={next}>{index+1===tasks.length?'عرض النتيجة':'المهمة التالية'} <ArrowLeft size={17}/></button></div>
  </div>}
  {finished&&<div className={styles.result} role="status">
   <span className={styles.victoryIcon}><Trophy size={49}/></span>
   <span className={styles.kicker}>QUEST COMPLETE / اكتمل التحدي</span>
   <h2>{correctCount===tasks.length?'أنت خبير حقيقي!':correctCount>=6?'نتيجة رائعة!':'تحدٍ جديد في انتظارك'}</h2>
   <div className={styles.resultStats}><div><strong>{correctCount} / {tasks.length}</strong><span>إجابات صحيحة</span></div><div><strong>{total}</strong><span>نقاط الجولة</span></div><div><strong>{stats.best}</strong><span>أفضل نتيجة محلية</span></div></div>
   <p>انتهت الجولة. الإجابات الخاطئة أو التي انتهى وقتها لا تحصل على نقاط.</p>
   <div className={styles.actions}><button className={styles.primary} type="button" onClick={reset}><RotateCcw size={18}/> جولة جديدة</button><button className={styles.secondary} type="button" onClick={share}><Share2 size={17}/> مشاركة</button><Link className={styles.secondary} href="/games">جميع الألعاب <ArrowRight size={17}/></Link></div>
   {shareStatus&&<p role="status" className={styles.credit}>{shareStatus}</p>}
  </div>}
 </div></section>;
}
