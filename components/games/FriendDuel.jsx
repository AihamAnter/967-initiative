'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,Clock3,Copy,Flame,Gamepad2,Link2,LockKeyhole,RefreshCw,Share2,ShieldCheck,Swords,Timer,Trophy,UserRound,Zap} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import useQuestionTimer from './useQuestionTimer';
import {PlaceBoard,TimelineBoard,MapBoard} from './ArcadeBoards';
import {ExtraBoard} from './ExtraBoards';
import styles from './FriendDuel.module.css';

const choices=['أ','ب','ج','د'];
const format=n=>Number(n||0).toLocaleString('ar');
const isSvgGame=game=>game==='map';
const isPhoto=game=>game==='place'||game==='object';
const readyToStart=(game,task,mapData,mediaReady)=>game==='map'?!!mapData:isPhoto(game)?mediaReady:!!task;

export default function FriendDuel({id}){
 const [match,setMatch]=useState(null);
 const [phase,setPhase]=useState('loading'),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[copyNote,setCopyNote]=useState('');
 const [mapData,setMapData]=useState(null),[mapError,setMapError]=useState('');
 const [mediaReady,setMediaReady]=useState(false);
 const [reload,setReload]=useState(0);
 const submitting=useRef(false);
 const mine=match?.mine;
 const task=mine?.task;
 const started=mine?.phase==='question'&&!!mine.startedAt;
 const questionKey=mine?.step+'|'+mine?.startedAt;
 const seconds=match?.seconds||15;

 useEffect(()=>{
  let alive=true,serial=0,timer=null;
  const db=browserDb();
  const refresh=async()=>{
   const seq=++serial;
   try{
    const {data}=await db?.auth.getSession()||{};
    const token=data?.session?.access_token;
    if(!token){if(alive){setPhase('guest');setMatch(null);}return;}
    const response=await fetch('/api/games/friends/'+id,{cache:'no-store',headers:{Authorization:'Bearer '+token}});
    const result=await response.json();
    if(!alive||seq!==serial)return;
    if(!response.ok)throw Error(result.error||'تعذر تحميل التحدي.');
    setMatch(result);setPhase('ready');setError('');
   }catch(e){if(alive&&seq===serial){setError(e.message||'تعذر تحميل التحدي.');setPhase('error');}}
  };
  refresh();
  const auth=db?.auth.onAuthStateChange(()=>setTimeout(()=>{if(alive)refresh();},0)).data?.subscription;
  const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
  document.addEventListener('visibilitychange',onVisible);
  // While waiting for the friend to finish, poll the server without affecting the player's timer.
  timer=setInterval(()=>{if(alive)refresh();},20000);
  return()=>{alive=false;serial++;auth?.unsubscribe();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[id,reload]);

 useEffect(()=>{
  if(!isSvgGame(match?.game))return;
  let active=true;
  fetch('/data/yemen-map/yemen-boundaries.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();})
   .then(data=>{if(active){setMapData(data);setMapError('');}})
   .catch(()=>{if(active)setMapError('تعذر تحميل خريطة اليمن. أعد تحميل الصفحة.');});
  return()=>{active=false;};
 },[match?.game]);

 useEffect(()=>{
  setMediaReady(!isPhoto(match?.game));
  if(!task||!isPhoto(match?.game)||!task.photo?.url)return;
  let active=true;
  const img=new Image();
  img.onload=img.onerror=()=>{if(active)setMediaReady(true);};
  img.src=task.photo.url;
  return()=>{active=false;};
 },[match?.game,task?.id]);

 useEffect(()=>{submitting.current=false;},[questionKey]);

 async function post(action,extras={}){
  if(busy)return null;
  setBusy(true);setError('');
  try{
   const db=browserDb();
   const {data}=await db?.auth.getSession()||{};
   const token=data?.session?.access_token;
   if(!token)throw Error('سجّل الدخول مجددًا للمتابعة.');
   const response=await fetch('/api/games/friends/'+id,{
    method:'POST',cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action,step:mine?.step,questionId:task?.id,...extras})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'تعذر تنفيذ العملية.');
   setMatch(result);setPhase('ready');
   return result;
  }catch(e){setError(e.message||'تعذر تحديث الجولة.');return null;}
  finally{setBusy(false);}
 }

 async function answer(choice,timedOut=false){
  if(submitting.current||!mine||mine.phase!=='question'||!mine.startedAt||busy)return;
  if(!timedOut&&!timer.claim())return;
  submitting.current=true;
  const result=await post('answer',{choice:timedOut?null:choice});
  if(!result)submitting.current=false;
 }
 const timer=useQuestionTimer({
  seconds,token:questionKey,
  active:started&&!busy&&!!task,
  startTime:mine?.startedAt||null,
  onExpire:()=>answer(null,true)
 });
 async function next(){
  const result=await post('next');
  if(result){submitting.current=false;setMediaReady(!isPhoto(result.game));}
 }
 const shareUrl=typeof window!=='undefined'?window.location.origin+'/games/friends/'+id:'/games/friends/'+id;
 async function copyLink(){
  try{
   await navigator.clipboard.writeText(shareUrl);
   setCopyNote('تم نسخ رابط التحدي. أرسله إلى صديقك.');
  }catch{setCopyNote('الرابط: '+shareUrl);}
 }
 async function share(){
  try{
   if(navigator.share)await navigator.share({title:'تحدّاني في ألعاب 967',text:'هل تستطيع التفوق عليّ في تحدي اليمن نفسه؟',url:shareUrl});
   else await copyLink();
  }catch(e){if(e?.name!=='AbortError')await copyLink();}
 }
 const players=match?.players||[];
 const finishedBoth=players.length===2&&players.every(x=>x.finished);
 const myPosition=players.find(x=>x.isMe);
 const other=players.find(x=>!x.isMe);
 const done=mine?.phase==='finished';
 return <section className={styles.wrapper}>
  <div className={styles.top}>
   <span className={styles.eyebrow}><Swords size={19}/> FRIEND DUEL / 967</span>
   <div className={styles.links}><Link href="/games/friends"><Swords size={15}/> تحدٍّ جديد</Link><Link href="/games"><ArrowRight size={15}/> جميع الألعاب</Link></div>
  </div>
  {phase==='loading'&&<div className={styles.notice} role="status">جارٍ تحميل التحدي والتحقق من حسابك…</div>}
  {phase==='guest'&&<div className={styles.join}>
   <LockKeyhole size={33}/><h2>سجّل الدخول أولًا</h2><p>التحدي محفوظ برابطه الخاص، ويلزم حساب مؤكد لكل واحد من اللاعبين لضمان صحة النتائج.</p>
   <Link href="/login" className={styles.primary}>تسجيل الدخول <ArrowLeft size={17}/></Link>
  </div>}
  {phase==='error'&&<div className={styles.notice} role="alert">{error} <button type="button" onClick={()=>setReload(x=>x+1)}>إعادة المحاولة <RefreshCw size={15}/></button></div>}
  {match&&phase==='ready'&&<>
   <div className={styles.hero}>
    <div><span className={styles.kicker}>تحدٍّ خاص · لاعبان فقط</span><h2>{match.title}</h2>
     <p><Timer size={16}/> {format(match.seconds)} ثانية لكل سؤال <span>·</span> 10 مهام متطابقة <span>·</span> دون التأثير على ترتيب اليوم</p>
    </div>
    <div className={styles.share}>
     <button type="button" onClick={copyLink}><Copy size={17}/> نسخ الرابط</button>
     <button type="button" onClick={share}><Share2 size={17}/> مشاركة</button>
    </div>
   </div>
   {copyNote&&<p className={styles.note} role="status">{copyNote}</p>}
   <div className={styles.versus} aria-label="مقارنة المتنافسين">
    {players.map(p=><div className={[styles.contender,p.isMe?styles.you:''].join(' ')} key={p.slot}>
     <span className={styles.avatar}><UserRound size={23}/></span>
     <span className={styles.playerName}>{p.name} {p.isMe&&<small>أنت</small>}</span>
     <strong>{p.finished?format(p.score)+' / 1000':p.phase==='review'||p.phase==='question'?'يلعب الآن':'بانتظار البداية'}</strong>
     <small>{p.finished?format(p.correctCount)+' إجابات صحيحة':'المقعد '+format(p.slot)}</small>
    </div>)}
    {players.length===1&&<div className={styles.emptySeat}><UserRound size={26}/><strong>بانتظار صديقك</strong><small>شارك الرابط لحجز المقعد الثاني</small></div>}
    <span className={styles.vs}>VS</span>
   </div>
   {match.expired&&!done&&<div className={styles.notice}>انتهت مهلة هذا التحدي بعد 7 أيام. يمكنك إنشاء تحدٍّ جديد.</div>}
   {!match.joined&&!match.expired&&<div className={styles.join}>
    {match.canJoin?<><Swords size={31}/><h3>هل تقبل التحدي؟</h3>
     <p>ستواجه منشئ الرابط في الأسئلة نفسها وبنفس الوقت. لديك محاولة واحدة مرتبطة بحسابك.</p>
     <button type="button" className={styles.primary} disabled={busy} onClick={()=>post('join')}>{busy?'جارٍ الانضمام…':'اقبل التحدي وابدأ'} <ArrowLeft size={18}/></button>
    </>:<p>المقعد الثاني محجوز، ولا يمكن الانضمام إلى هذا التحدي.</p>}
   </div>}
   {match.joined&&!done&&!match.expired&&<>
    <div className={styles.progressBar}><span>السؤال {format((mine?.step||0)+1)} من ١٠</span><span>{mine?.phase==='review'?'الإجابة معتمدة':mine?.startedAt?'المؤقت يعمل':'المؤقت متوقف'}</span></div>
    <div className={styles.progressTrack}><span style={{width:((mine.step+1)*10)+'%'}}/></div>
    {mine?.phase==='question'&&!started&&<div className={styles.startPanel}>
     <Gamepad2 size={35}/><h3>جاهز للسؤال {format(mine.step+1)}؟</h3><p>سيبدأ عدّاد {format(seconds)} ثانية عندما تضغط الزر. الوقت متوقف الآن، ولا تظهر الإجابة الصحيحة قبل اعتمادها.</p>
     {isSvgGame(match.game)&&!mapData&&<p className={styles.note}>{mapError||'جارٍ تحميل خريطة اليمن…'}</p>}
     {isPhoto(match.game)&&!mediaReady&&<p className={styles.note}>جارٍ تجهيز الصورة قبل بدء المؤقت…</p>}
     <button type="button" disabled={busy||!readyToStart(match.game,task,mapData,mediaReady)} className={styles.primary} onClick={()=>post('ready')}>ابدأ السؤال <Zap size={18}/></button>
    </div>}
    {(started||mine?.phase==='review')&&task&&<div className={styles.questionPanel}>
     <div className={styles.questionHead}>
      <span><TargetIcon/> السؤال {format(mine.step+1)} / ١٠</span>
      <strong className={[styles.timer,started&&timer.secondsLeft<=3?styles.urgent:''].join(' ')}><Clock3 size={17}/> {mine?.phase==='review'?'توقف المؤقت':format(timer.secondsLeft)+' ثانية'}</strong>
     </div>
     <div className={styles.questionBody}>
      {match.game==='quiz'?<div className={styles.quiz}>
       <h3>{task.question}</h3>
       <div className={styles.quizOptions}>{task.options.map((option,i)=><button type="button" key={i} disabled={!started||busy}
        className={mine?.phase==='review'&&i===task.correct?styles.correctChoice:''} onClick={()=>answer(i)}>
        <b>{choices[i]}</b> {option}</button>)}</div>
       {mine.phase==='review'&&task.explanation&&<div className={styles.explain}><strong>معلومة تستحق المعرفة</strong><p>{task.explanation}</p>{task.source?.url&&<a target="_blank" rel="noopener noreferrer" href={task.source.url}>المصدر <ArrowLeft size={15}/></a>}</div>}
      </div>:match.game==='place'?<PlaceBoard key={task.id} task={task} locked={!started||busy} onAnswer={value=>answer(value)} onReady={()=>{}}/>
      :match.game==='timeline'?<TimelineBoard key={task.id} task={task} locked={!started||busy} onAnswer={value=>answer(value)}/>
      :match.game==='map'?<MapBoard task={task} locked={!started||busy} onAnswer={value=>answer(value)} data={mapData} selectedId={null}/>
      :<ExtraBoard key={task.id} game={match.game} task={task} locked={!started||busy} onAnswer={value=>answer(value)}
        onReady={()=>{}} remaining={timer.remaining} duration={seconds}/>}
     </div>
     {mine.phase==='review'&&<div className={styles.review}>
      <span className={mine.last?.correct?styles.good:styles.bad}>{mine.last?.correct?<CheckCircle2 size={19}/>:<Flame size={19}/>}
       {mine.last?.correct?'إجابة صحيحة!':'إجابة غير صحيحة أو انتهى الوقت'}</span>
      <strong>{mine.last?.correct?'+'+format(mine.last.points)+' نقطة':'0 نقطة'}</strong>
      <button type="button" className={styles.primary} disabled={busy} onClick={next}>{busy?'جارٍ الانتقال…':'السؤال التالي'} <ArrowLeft size={17}/></button>
     </div>}
    </div>}
   </>}
   {done&&<div className={styles.finished} role="status">
    <Trophy size={36}/><h3>أكملت التحدي الخاص!</h3><p>نتيجتك الموثقة: <strong>{format(mine.score)} / 1000</strong> · {format(mine.correctCount)} إجابات صحيحة من 10.</p>
    {finishedBoth&&other?.finished?<p className={styles.outcome}>{myPosition.score===other.score?'تعادل رائع بينكما!':myPosition.score>other.score?'أنت الفائز بهذا التحدي!':'تفوق صديقك هذه المرة!'}
     <span> يمكنكما إنشاء تحدٍّ جديد للمنافسة مرة أخرى.</span></p>
    :<p className={styles.waiting}>بانتظار إكمال صديقك للتحدي. ستظهر المقارنة النهائية تلقائيًا، ويمكنك تحديث النتائج.</p>}
    <div className={styles.actions}><button type="button" onClick={()=>setReload(x=>x+1)}><RefreshCw size={17}/> تحديث نتيجة صديقي</button>
     <Link href="/games/friends">تحدٍ جديد <ArrowLeft size={17}/></Link></div>
   </div>}
   {error&&<div className={styles.notice} role="alert">{error} <button type="button" onClick={()=>setReload(x=>x+1)}>تحديث الحالة <RefreshCw size={16}/></button>
    {started&&<button type="button" onClick={()=>answer(null,true)} disabled={busy}>اعتماد انتهاء الوقت</button>}
   </div>}
   <p className={styles.security}><ShieldCheck size={16}/> هذا تحدٍ مستقل، لا يُحتسب في «تحدي اليوم» أو ترتيب 967 الرسمي أو شارات الإنجازات. النتائج محفوظة على الخادم ولا يمكن إعادة المحاولة بالحساب نفسه.</p>
  </>}
 </section>;
}
function TargetIcon(){return <Zap size={16}/>;}
