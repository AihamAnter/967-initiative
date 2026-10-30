'use client';
import {useRef,useState} from 'react';
import {Download,Eraser,Undo2,PenLine} from 'lucide-react';
import styles from '@/app/school/studio/studio.module.css';
import CalligraphyExample from './CalligraphyExample';

// Freehand practice is intentionally NOT graded: a canvas stroke cannot validate
// the historical proportions or aesthetic quality of a particular calligraphic hand.
export default function CalligraphyPracticePad({practice,script='naskh',stageKey}){
 const ref=useRef(null),strokes=useRef([]),active=useRef(null);
 const [lines,setLines]=useState(0);
 const redraw=()=>{
  const ctx=ref.current?.getContext('2d');if(!ctx)return;
  ctx.clearRect(0,0,840,290);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#204d3c';
  for(const points of strokes.current){
   if(!points.length)continue;
   ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
   if(points.length===1)ctx.lineTo(points[0].x+.1,points[0].y+.1);
   for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
   ctx.stroke();
  }
 };
 const coords=e=>{
  const rect=ref.current.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*840/rect.width,y:(e.clientY-rect.top)*290/rect.height};
 };
 const start=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  active.current=[coords(e)];strokes.current.push(active.current);
  redraw();
 };
 const move=e=>{
  if(!active.current)return;
  active.current.push(coords(e));redraw();
 };
 const stop=()=>{if(active.current){active.current=null;setLines(strokes.current.length);}};
 const undo=()=>{strokes.current.pop();setLines(strokes.current.length);redraw();};
 const clear=()=>{strokes.current=[];active.current=null;setLines(0);redraw();};
 const exportImage=()=>{
  const canvas=ref.current;if(!canvas)return;
  const output=document.createElement('canvas');output.width=840;output.height=340;
  const ctx=output.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,840,340);
  ctx.strokeStyle='#d0dcd4';ctx.lineWidth=1.5;
  for(const y of [85,182,280]){ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(816,y);ctx.stroke();}
  ctx.drawImage(canvas,0,25);
  const a=document.createElement('a');a.download='967-calligraphy-'+stageKey+'.png';
  a.href=output.toDataURL('image/png');a.click();
 };
 return <section className={styles.calligraphyPractice} aria-labelledby="calligraphy-practice-heading">
  <div className={styles.practiceEyebrow}><PenLine size={19}/> ورشة الخط · تمرين عملي</div>
  <h2 id="calligraphy-practice-heading">{practice.focus}</h2>
  <p>{practice.instructions}</p>
  <div className={styles.practiceSample} dir="rtl"><CalligraphyExample text={practice.model} script={practice.script||script} label="النص المطلوب كتابته"/></div>
  <p className={styles.practiceNote}>المساحة أدناه للكتابة باللمس أو القلم أو الفأرة. تُعرض نماذج موثقة للخطوط التاريخية حيث لا تتوفر خطوط ويب مطابقة؛ قد يختلف نص النموذج الأصلي عن عبارة التدريب. لا تُحتسب جودة الرسم ضمن درجة الاختبار.</p>
  <div className={styles.practiceCanvas}>
   <canvas ref={ref} width={840} height={290} aria-label="لوحة كتابة حرة على أسطر إرشادية"
    onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}/>
  </div>
  <div className={styles.practiceTools}>
   <button type="button" disabled={!lines} onClick={undo}><Undo2 size={16}/> تراجع</button>
   <button type="button" disabled={!lines} onClick={clear}><Eraser size={16}/> مسح اللوحة</button>
   <button type="button" disabled={!lines} onClick={exportImage}><Download size={16}/> حفظ رسمك كصورة</button>
  </div>
 </section>;
}
