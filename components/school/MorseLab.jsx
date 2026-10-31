'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,Square,Radio,Delete,CheckCircle2} from 'lucide-react';
import {encodeMorse,decodeMorse} from '@/lib/schoolThinkingLabs';
import styles from '@/app/school/studio/studio.module.css';
export default function MorseLab({sample='SOS',onComplete}){
 const [message,setMessage]=useState(sample),[signal,setSignal]=useState(''),[lit,setLit]=useState(false),[playing,setPlaying]=useState(false),[error,setError]=useState('');
 const timers=useRef([]),engine=useRef(null),oscillators=useRef([]);
 const stop=()=>{
  timers.current.forEach(clearTimeout);timers.current=[];
  oscillators.current.forEach(o=>{try{o.stop();}catch{}});oscillators.current=[];
  if(engine.current){engine.current.close().catch(()=>{});engine.current=null;}
  setLit(false);setPlaying(false);
 };
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);oscillators.current.forEach(o=>{try{o.stop();}catch{}});engine.current?.close().catch(()=>{});},[]);
 const encoded=encodeMorse(message);
 const targetCode=encodeMorse(sample);
 const solved=signal.trim().replace(/\s+/g,' ')===targetCode;
 const send=async()=>{
  stop();setError('');
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)throw Error('الصوت غير مدعوم في هذا المتصفح. يمكنك قراءة الشفرة بصريًا.');
   const ctx=new Audio();engine.current=ctx;
   await ctx.resume();
   const unit=.115;let tick=0;
   const words=message.trim().toUpperCase().split(/ +/);
   for(let wi=0;wi<words.length;wi++){
    for(let ci=0;ci<words[wi].length;ci++){
     const symbols=encodeMorse(words[wi][ci]);
     for(let si=0;si<symbols.length;si++){
      const length=symbols[si]==='-'?3:1;
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='sine';oscillator.frequency.value=650;
      oscillator.connect(gain);gain.connect(ctx.destination);
      gain.gain.value=.055;
      oscillator.start(ctx.currentTime+tick*unit);
      oscillator.stop(ctx.currentTime+(tick+length)*unit);
      oscillators.current.push(oscillator);
      timers.current.push(setTimeout(()=>setLit(true),tick*unit*1000));
      timers.current.push(setTimeout(()=>setLit(false),(tick+length)*unit*1000));
      tick+=length+(si<symbols.length-1?1:0);
     }
     if(ci<words[wi].length-1)tick+=3;
    }
    if(wi<words.length-1)tick+=7;
   }
   setPlaying(true);
   timers.current.push(setTimeout(()=>{setPlaying(false);setLit(false);ctx.close().catch(()=>{});engine.current=null;},(tick+1)*unit*1000));
  }catch(e){setError(e.message);setPlaying(false);}
 };
 const add=symbol=>{
  const next=signal.length<180?signal+symbol:signal;
  setSignal(next);
  if(next.trim().replace(/\s+/g,' ')===targetCode)onComplete?.({kind:'morse',signal:next});
 };
 return <div className={styles.thinkingLab} aria-labelledby="morse-lab-title">
  <div className={styles.labHeading}><Radio size={21}/><div><strong id="morse-lab-title">مختبر مورس المباشر</strong><small>شفرة مورس الدولية للحروف اللاتينية والأرقام، وليست تحويلًا للحروف العربية</small></div></div>
  <label className={styles.labLabel}>اكتب رسالة إنجليزية قصيرة (A–Z و0–9)
   <input dir="ltr" lang="en" maxLength={30} value={message} onChange={e=>{
    const v=e.target.value.toUpperCase();if(/^[A-Z0-9 ]*$/.test(v))setMessage(v);
   }} placeholder="SOS HELP"/>
  </label>
  <div className={styles.morseOutput} dir="ltr" aria-label="الرموز الناتجة">{encoded||'...'}</div>
  <div className={styles.morsePlayer}>
   <div className={styles.morseLamp} data-on={lit?'true':'false'} aria-label={lit?'إشارة مضيئة':'إشارة مطفأة'}/>
   <button type="button" onClick={playing?stop:send} disabled={!message.trim()}>{playing?<><Square size={17}/> إيقاف</>:<><Volume2 size={17}/> سماع الإشارة ورؤيتها</>}</button>
  </div>
  {error&&<p className={styles.muted} role="alert">{error}</p>}
  <div className={styles.morseTap}>
   <strong>جرّب النقر بنفسك ثم فك الرمز</strong>
   <p>مهمتك قبل الاختبار: كوّن شفرة الرسالة «{sample}» من النقاط والشرطات والفواصل. يمكنك قراءة الشفرة المقابلة بالأعلى للتعلم.</p>
   <div className={styles.morseTapControls}><button type="button" onClick={()=>add('.')}>· نقطة</button><button type="button" onClick={()=>add('-')}>− شرطة</button>
    <button type="button" onClick={()=>add(' ')}>فاصل حرف</button>
    <button type="button" onClick={()=>add(' / ')}>فاصل كلمة</button>
    <button type="button" onClick={()=>setSignal(x=>x.slice(0,-1))}><Delete size={15}/> تراجع</button>
    <button type="button" onClick={()=>setSignal('')}>مسح</button></div>
   <p dir="ltr" className={styles.morseOutput}>{signal||'· −'}</p>
   <p>النص الناتج: <strong dir="ltr">{signal.trim()?decodeMorse(signal):'—'}</strong></p>
   {solved&&<p role="status" className={styles.labHint}><CheckCircle2 size={17}/> أحسنت! فككت شفرة الرسالة المطلوبة، ويمكنك الآن بدء الاختبار.</p>}
  </div>
 </div>;
}
