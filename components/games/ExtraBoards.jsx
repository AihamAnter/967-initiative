'use client';
import {useState} from 'react';
import {ArrowLeft,RotateCcw,Link2,Lightbulb,CheckCircle2,ImageOff} from 'lucide-react';
import styles from './ExtraArcade.module.css';

const markers=['أ','ب','ج','د'];
function Choices({task,locked,onAnswer}){
 return <div className={styles.choices} role="group" aria-label="اختر إجابة واحدة">
  {task.options.map((option,i)=><button key={i} type="button" disabled={locked}
   className={locked&&i===task.correct?styles.right:''} onClick={()=>onAnswer(i)}>
   <span className={styles.letter}>{markers[i]}</span>
   <span>{typeof option==='string'?option:option.name}</span>
   {locked&&i===task.correct&&<CheckCircle2 size={18}/>}
  </button>)}
 </div>;
}
export function WhoBoard({task,locked,onAnswer,remaining,duration}){
 const visible=locked?3:remaining<=duration*350?3:remaining<=duration*700?2:1;
 return <div>
  <div className={styles.clueHead}><Lightbulb size={19}/> تلميحات تكشف تدريجيًا · {visible}/3</div>
  <div className={styles.clues}>{task.hints.map((clue,i)=><div key={i} className={i<visible?styles.revealed:styles.hidden}>
   <span className={styles.clueNumber}>{i+1}</span><p>{i<visible?clue:'يظهر تلميح آخر مع استمرار العد التنازلي'}</p>
  </div>)}</div>
  <p className={styles.help}>الشخصيات مختارة من أسماء يمنية معروفة، وليس مطلوبًا معرفة أسماء مجهولة.</p>
  <Choices task={task} locked={locked} onAnswer={onAnswer}/>
 </div>;
}
export function BiggerBoard({task,locked,onAnswer}){
 return <div>
  <div className={styles.topic}>{task.topic} <span>·</span> {task.unit}</div>
  <p className={styles.help}>اختر الاسم الذي تتوقع أن رقمه أكبر. تظهر الأرقام والمصدر بعد الإجابة.</p>
  <div className={styles.comparison}>
   {task.options.map((item,i)=><button type="button" key={i} disabled={locked} onClick={()=>onAnswer(i)} className={locked&&i===task.correct?styles.winner:''}>
    <span className={styles.side}>الخيار {markers[i]}</span>
    <strong>{item.name}</strong>
    {locked&&<small>{item.value.toLocaleString('ar')} {task.unit}</small>}
   </button>)}
   <span className={styles.versus}>VS</span>
  </div>
 </div>;
}
export function ConnectBoard({task,locked,onAnswer}){
 const [active,setActive]=useState(null),[links,setLinks]=useState({});
 const used=new Set(Object.values(links));
 function connect(right){
  if(locked||!active||used.has(right))return;
  const next={...links,[active]:right};
  setLinks(next);setActive(null);
  if(Object.keys(next).length===task.pairs.length)onAnswer(task.pairs.map(p=>next[p.id]));
 }
 return <div>
  <p className={styles.help}>اختر عنصرًا من العمود الأيمن، ثم معلوماته من العمود الأيسر. أكمل ثلاث وصلات؛ تُقيّم المحاولة بعد الوصلة الأخيرة.</p>
  <div className={styles.matchGrid}>
   <div className={styles.matchColumn}><span className={styles.columnHead}>العناصر</span>
    {task.leftOrder.map(id=>{
     const pair=task.pairs.find(p=>p.id===id),chosen=Object.hasOwn(links,id);
     return <button key={id} type="button" disabled={locked||chosen}
      aria-pressed={active===id} className={[active===id?styles.selected:'',chosen?styles.paired:''].join(' ')}
      onClick={()=>setActive(active===id?null:id)}>
      <Link2 size={15}/>{pair.left}{chosen&&<small>✓</small>}
     </button>;
    })}
   </div>
   <div className={styles.matchColumn}><span className={styles.columnHead}>المعلومات</span>
    {task.rightOrder.map(right=><button type="button" key={right} disabled={locked||used.has(right)||!active}
     className={used.has(right)?styles.paired:''} onClick={()=>connect(right)}>
     <ArrowLeft size={14}/>{right}{used.has(right)&&<small>✓</small>}
    </button>)}
   </div>
  </div>
  <div className={styles.matchStatus}>تم ربط {Object.keys(links).length} من {task.pairs.length}</div>
  {locked&&<div className={styles.reviewPairs}>{task.pairs.map(p=><span key={p.id}>{p.left} ← {p.right}</span>)}</div>}
 </div>;
}
export function YemenWordBoard({task,locked,onAnswer}){
 const [selected,setSelected]=useState([]);
 const current=selected.map(i=>task.letters[i]?.letter||'').join('');
 function add(i){
  if(locked||selected.includes(i))return;
  const next=[...selected,i];setSelected(next);
  if(next.length===task.letters.length)onAnswer(next.map(j=>task.letters[j].letter).join(''));
 }
 return <div>
  <div className={styles.topic}>{task.category}</div>
  <p className={styles.wordClue}>{task.question}</p>
  <div className={styles.wordSlots} aria-label="الحروف المختارة">
   {Array.from({length:task.letters.length},(_,i)=><span key={i} className={selected[i]!==undefined?styles.slotFilled:''}>{selected[i]!==undefined?task.letters[selected[i]].letter:'_'}</span>)}
  </div>
  <p className={styles.help}>اضغط على الحروف بالترتيب لتكوين الإجابة.</p>
  <div className={styles.letterTiles}>
   {task.letters.map((tile,i)=><button type="button" key={tile.id} disabled={locked||selected.includes(i)}
    aria-label={'الحرف '+tile.letter} onClick={()=>add(i)}>{tile.letter}</button>)}
  </div>
  {!locked&&selected.length>0&&<button type="button" className={styles.undo} onClick={()=>setSelected(p=>p.slice(0,-1))}><RotateCcw size={15}/> تراجع عن آخر حرف</button>}
  {locked&&<div className={styles.reviewPairs}>الإجابة: {task.answer}</div>}
 </div>;
}
export function ObjectBoard({task,locked,onAnswer,onReady}){
 const [failed,setFailed]=useState(false);
 return <div>
  <figure className={styles.objectImage}>
   {!failed?<img src={task.photo.url} alt="صورة لشيء يمني، اختر اسمه من الاختيارات" loading="eager"
    onLoad={()=>onReady(true)} onError={()=>{setFailed(true);onReady(true);}}/>:
    <div className={styles.imageError}><ImageOff size={32}/><p>تعذر تحميل الصورة. يمكنك الاعتماد على هذا الوصف بدلاً منها:</p><strong>{task.hint}</strong></div>}
   <figcaption>صورة حقيقية من ويكيميديا كومنز · اكتشف ما تمثله</figcaption>
  </figure>
  <Choices task={task} locked={locked} onAnswer={onAnswer}/>
  {locked&&<p className={styles.photoCredit}>الصورة: {task.photo.credit} · {task.photo.license} — <a href={task.photo.page} target="_blank" rel="noopener noreferrer">الترخيص والمصدر</a></p>}
 </div>;
}
export function ExtraBoard(props){
 switch(props.game){
  case 'who':return <WhoBoard {...props}/>;
  case 'bigger':return <BiggerBoard {...props}/>;
  case 'connect':return <ConnectBoard {...props}/>;
  case 'yemenword':return <YemenWordBoard {...props}/>;
  case 'object':return <ObjectBoard {...props}/>;
  default:return null;
 }
}
