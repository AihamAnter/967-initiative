'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ClipboardCheck,Flame,Medal,RotateCcw,Share2,Target,XCircle} from 'lucide-react';
import {buildQuizRound,dailySeed,scoreRound,gameLevels,quizCategories,difficultyLabels} from '@/lib/gameEngine';
import styles from './QuizGame.module.css';

const STORAGE_KEY='967-games-progress-v1';
const emptyStats={plays:0,correct:0,points:0,best:0,dailyDate:'',dailyBest:0};
function readStats(){
 try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!x||typeof x!=='object')return emptyStats;
  return Object.fromEntries(Object.keys(emptyStats).map(key=>[key,typeof x[key]===typeof emptyStats[key]?x[key]:emptyStats[key]]));
 }catch{return emptyStats;}
}
export default function QuizGame({questions,date,initialMode='practice'}){
 const [mode,setMode]=useState(initialMode);
 const [category,setCategory]=useState('all'),[difficulty,setDifficulty]=useState('all');
 const [round,setRound]=useState([]),[step,setStep]=useState(0),[picked,setPicked]=useState(null),[answers,setAnswers]=useState([]),[result,setResult]=useState(null);
 const [stats,setStats]=useState(emptyStats),[shareNote,setShareNote]=useState('');
 useEffect(()=>{setStats(readStats());},[]);
 const filtered=questions.filter(q=>(category==='all'||q.category===category)&&(difficulty==='all'||q.difficulty===Number(difficulty)));
 const canStart=mode==='daily'?questions.length>=1:filtered.length>=1;
 const current=round[step];
 function start(){
  const seed=mode==='daily'?dailySeed(date):'practice-'+Date.now()+'-'+Math.random();
  const list=buildQuizRound(questions,{mode,category:mode==='daily'?'all':category,difficulty:mode==='daily'?'all':difficulty,seed});
  if(!list.length)return;
  setRound(list);setStep(0);setPicked(null);setAnswers([]);setResult(null);setShareNote('');
 }
 function choose(index){
  if(picked!==null||!current)return;
  setPicked(index);setAnswers(previous=>[...previous,index]);
 }
 function next(){
  if(picked===null)return;
  if(step+1<round.length){setStep(v=>v+1);setPicked(null);return;}
  const summary=scoreRound(round,answers);
  setResult(summary);
  const before=readStats();
  const after={
   plays:before.plays+1,correct:before.correct+summary.correct,points:before.points+summary.total,
   best:Math.max(before.best,summary.total),dailyDate:mode==='daily'?date:before.dailyDate,
   dailyBest:mode==='daily'?Math.max(before.dailyDate===date?before.dailyBest:0,summary.total):before.dailyBest,
  };
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(after));}catch{/* Browser storage is optional. */}
  setStats(after);
 }
 function switchMode(nextMode){setMode(nextMode);setRound([]);setResult(null);setPicked(null);setAnswers([]);setShareNote('');}
 async function share(){
  const title='تحدي ألعاب 967';
  const shareText='حققت '+result.correct+' من '+round.length+' في اختبار معرفتي باليمن! هل تتفوق على نتيجتي؟';
  const url=location.origin+'/games/quiz'+(mode==='daily'?'?mode=daily':'');
  try{
   if(navigator.share){await navigator.share({title,text:shareText,url});setShareNote('تم فتح خيارات المشاركة.');}
   else if(navigator.clipboard){await navigator.clipboard.writeText(shareText+' '+url);setShareNote('نُسخ رابط التحدي ونتيجتك.');}
   else setShareNote('شارك هذا الرابط: '+url);
  }catch(error){if(error?.name!=='AbortError')setShareNote('انسخ الرابط يدوياً: '+url);}
 }
 const answerNumber=(result?.correct||0);
 return <section className={styles.wrapper} aria-label="لعبة اختبر معرفتك باليمن">
  <div className="container">
   {!round.length&&<div className={styles.setup}>
    <div className={styles.setupMain}>
     <span className={styles.kicker}><Target size={16}/> قبل أن تبدأ</span>
     <h2>جاهز للتحدي؟</h2>
     <p>اختر نوع الجولة، وستحصل على عشرة أسئلة أو أقل إذا كان التصنيف يضم عدداً أقل. لا يوجد حد زمني؛ الأهم أن تتعلم شيئاً جديداً.</p>
     <div className={styles.modes} role="group" aria-label="نوع التحدي">
      <button type="button" aria-pressed={mode==='practice'} className={mode==='practice'?styles.active:''} onClick={()=>switchMode('practice')}><BookOpen size={17}/> جولة حرة</button>
      <button type="button" aria-pressed={mode==='daily'} className={mode==='daily'?styles.active:''} onClick={()=>switchMode('daily')}><Flame size={17}/> تحدي اليوم</button>
     </div>
     {mode==='practice'?<div className={styles.filters}>
      <label>المجال<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">جميع المجالات</option>{Object.entries(quizCategories).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
      <label>الصعوبة<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">جميع المستويات</option>{Object.entries(difficultyLabels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
     </div>:<p className={styles.dailyNote}>تحدي {date} (بالتوقيت العالمي): الأسئلة وترتيبها ثابتة لجميع من يفتح تحدي اليوم.</p>}
     <button type="button" className={styles.primary} onClick={start} disabled={!canStart}>{canStart?'ابدأ الجولة':'لا توجد أسئلة منشورة لهذا الاختيار'} <ArrowLeft size={18}/></button>
     <p className={styles.privacy}>بدون تسجيل دخول. تحفظ النتائج محلياً على هذا الجهاز فقط.</p>
    </div>
    <aside className={styles.profile}>
     <span className={styles.profileIcon}><Medal size={32}/></span>
     <h3>{gameLevels(stats.correct)}</h3>
     <div className={styles.stats}><div><strong>{stats.plays}</strong><span>جولة مكتملة</span></div><div><strong>{stats.correct}</strong><span>إجابة صحيحة</span></div><div><strong>{stats.best}</strong><span>أفضل نقاط</span></div></div>
     <p>تظهر الإحصاءات على هذا المتصفح فقط، ولا تتم مزامنتها مع حسابك.</p>
     {stats.dailyDate===date&&<span className={styles.dailyBest}>أفضل نتيجة في تحدي اليوم: {stats.dailyBest} نقطة</span>}
    </aside>
   </div>}
   {!!round.length&&!result&&<div className={styles.play}>
    <div className={styles.playHeader}><span>{mode==='daily'?'تحدي اليوم':'اختبر معرفتك باليمن'}</span><strong>السؤال {step+1} من {round.length}</strong></div>
    <div className={styles.progress} role="progressbar" aria-label="التقدم في الأسئلة" aria-valuemin={0} aria-valuemax={round.length} aria-valuenow={step+1}><span style={{width:((step+1)/round.length*100)+'%'}}/></div>
    <div className={styles.questionMeta}><span>{quizCategories[current.category]}</span><span>المستوى: {difficultyLabels[current.difficulty]}</span></div>
    <h2>{current.question}</h2>
    <div className={styles.options} role="group" aria-label="خيارات الإجابة">
     {current.options.map((option,index)=>{
      const selected=picked===index,right=picked!==null&&current.correct===index,wrong=selected&&picked!==current.correct;
      return <button type="button" key={index} disabled={picked!==null} aria-pressed={selected} className={[styles.option,right?styles.right:'',wrong?styles.wrong:''].join(' ')} onClick={()=>choose(index)}>
       <span className={styles.optionLetter}>{['أ','ب','ج','د'][index]}</span><span>{option}</span>{right&&<CheckCircle2 size={20}/>} {wrong&&<XCircle size={20}/>}
      </button>;
     })}
    </div>
    {picked!==null&&<div className={styles.explanation} role="status">
     <strong>{picked===current.correct?'إجابة صحيحة!':'إجابة غير صحيحة'}{picked===current.correct?' أحسنت.':''}</strong>
     {picked!==current.correct&&<p>الإجابة الصحيحة: <b>{current.options[current.correct]}</b></p>}
     <p>{current.explanation}</p>
     <a href={current.source.url} target="_blank" rel="noopener noreferrer">المصدر: {current.source.title} <ArrowLeft size={14}/></a>
    </div>}
    <div className={styles.playActions}><button type="button" className={styles.secondary} onClick={()=>{setRound([]);setPicked(null);setAnswers([]);}}><ArrowRight size={16}/> إنهاء الجولة</button><button type="button" className={styles.primary} onClick={next} disabled={picked===null}>{step===round.length-1?'عرض النتيجة':'السؤال التالي'} <ArrowLeft size={18}/></button></div>
   </div>}
   {result&&<div className={styles.finish} role="status">
    <span className={styles.finishIcon}><ClipboardCheck size={44}/></span>
    <span className={styles.kicker}>اكتملت الجولة</span>
    <h2>{result.correct===round.length?'أحسنت! جميع الإجابات صحيحة.':result.correct>=round.length/2?'جولة جيدة! واصل الاستكشاف.':'كل جولة فرصة لتعرف اليمن أكثر.'}</h2>
    <div className={styles.resultGrid}><div><strong>{answerNumber} / {round.length}</strong><span>إجابات صحيحة</span></div><div><strong>{result.total}</strong><span>نقطة في هذه الجولة</span></div><div><strong>{stats.best}</strong><span>أفضل نتيجة على الجهاز</span></div></div>
    <p>يمكنك العودة للأسئلة أو بدء جولة أخرى. النتيجة محفوظة في متصفحك ما دامت بياناته محفوظة.</p>
    <div className={styles.finishActions}><button type="button" className={styles.primary} onClick={()=>{setRound([]);setResult(null);setPicked(null);setAnswers([]);}}>ابدأ جولة أخرى <RotateCcw size={18}/></button><button type="button" className={styles.secondary} onClick={share}>شارك التحدي <Share2 size={17}/></button><Link href="/games" className={styles.secondary}>جميع الألعاب <ArrowRight size={17}/></Link></div>
    {shareNote&&<p className={styles.shareNote} role="status">{shareNote}</p>}
   </div>}
  </div>
 </section>;
}
