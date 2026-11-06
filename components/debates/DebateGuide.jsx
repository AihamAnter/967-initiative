'use client';
import {useRef} from 'react';
import {Clock3, ShieldCheck, X} from 'lucide-react';

const rules = [
 'حرية التعبير',
 'الاحترام المتبادل',
 'تكافؤ الفرص والوقت',
 'عدم المقاطعة',
 'الالتزام بالمحاور',
 'الأدلة والمعلومات',
 'حق الرد',
 'الالتزام بالوقت',
 'الامتثال لإدارة المناظرة',
];

const stages = [
 {title:'افتتاحية المقدم',minutes:'3',unit:'دقائق'},
 {title:'الكلمتان الافتتاحيتان',minutes:'4',unit:'دقائق',scope:'لكل طرف'},
 {title:'عرض الحجج',minutes:'10',unit:'دقائق',scope:'لكل طرف'},
 {title:'الرد الأول',minutes:'5',unit:'دقائق',scope:'لكل طرف'},
 {title:'التعقيب الثاني',minutes:'5',unit:'دقائق',scope:'لكل طرف'},
 {title:'النقاش المفتوح',minutes:'20',unit:'دقيقة',scope:'مشتركة'},
 {title:'أسئلة الجمهور',minutes:'10–15',unit:'دقيقة'},
 {title:'الكلمات الختامية',minutes:'3',unit:'دقائق',scope:'لكل طرف'},
 {title:'اختتام المقدم',minutes:'2',unit:'دقيقتان'},
];

// Two buttons; each opens its guide in a floating window that can be closed (Esc, the close button or a tap outside).
function GuideDialog({id,icon:Icon,title,lead,className,children,dialogRef}){
 return <dialog ref={dialogRef} id={id} className={'debate-guide-dialog '+className} aria-labelledby={id+'-title'} onClick={event=>{if(event.target===event.currentTarget)event.currentTarget.close();}}>
  <section className={'debate-guide-panel '+className}>
   <header><span className="debate-guide-icon"><Icon size={22} aria-hidden="true"/></span><div><h3 id={id+'-title'}>{title}</h3><p>{lead}</p></div>
    <button type="button" className="debate-guide-close" aria-label="إغلاق" onClick={()=>dialogRef.current?.close()}><X size={18} aria-hidden="true"/></button></header>
   {children}
  </section>
 </dialog>;
}

export default function DebateGuide() {
 const rulesRef=useRef(null),flowRef=useRef(null);
 return <div id="debate-guide" className="debate-guide-buttons">
  <button type="button" className="debate-guide-button" aria-haspopup="dialog" onClick={()=>rulesRef.current?.showModal()}><ShieldCheck size={16} aria-hidden="true"/> قواعد النقاش</button>
  <button type="button" className="debate-guide-button" aria-haspopup="dialog" onClick={()=>flowRef.current?.showModal()}><Clock3 size={16} aria-hidden="true"/> سير المناظرة</button>
  <GuideDialog id="debate-rules" icon={ShieldCheck} title="قواعد النقاش" lead="مساحة للتعبير، ومسؤولية مشتركة في الحوار." className="debate-guide-rules" dialogRef={rulesRef}>
   <ol role="list">{rules.map((rule,index)=><li key={rule}><span className="debate-guide-number" aria-hidden="true">{index+1}</span><span>{rule}</span></li>)}</ol>
  </GuideDialog>
  <GuideDialog id="debate-flow" icon={Clock3} title="سير المناظرة" lead="من الافتتاح إلى الختام، وقت واضح لكل مرحلة." className="debate-guide-flow" dialogRef={flowRef}>
   <ol role="list">{stages.map((stage,index)=><li key={stage.title}><span className="debate-guide-number" aria-hidden="true">{index+1}</span><h4>{stage.title}</h4><div className="debate-guide-duration"><strong>{stage.minutes==='2'?stage.unit:<><bdi>{stage.minutes}</bdi> {stage.unit}</>}</strong>{stage.scope&&<small>{stage.scope}</small>}</div></li>)}</ol>
   <footer className="debate-guide-total"><span><Clock3 size={19} aria-hidden="true"/>المدة الإجمالية</span><strong><bdi>89–94</bdi> دقيقة</strong></footer>
  </GuideDialog>
 </div>;
}
