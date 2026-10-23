import {Clock3, ShieldCheck} from 'lucide-react';

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

export default function DebateGuide() {
 return <section id="debate-guide" className="debate-guide" aria-labelledby="debate-guide-title">
  <div className="debate-section-heading"><div><span className="eyebrow">حوار منظم، وفرصة متكافئة</span><h2 id="debate-guide-title">قواعد النقاش وسير المناظرة</h2></div></div>
  <div className="debate-guide-grid">
   <section className="debate-guide-panel debate-guide-rules" aria-labelledby="debate-rules-title">
    <header><span className="debate-guide-icon"><ShieldCheck size={24} aria-hidden="true"/></span><div><h3 id="debate-rules-title">قواعد النقاش</h3><p>مساحة للتعبير، ومسؤولية مشتركة في الحوار.</p></div></header>
    <ol role="list">{rules.map((rule,index)=><li key={rule}><span className="debate-guide-number" aria-hidden="true">{index+1}</span><span>{rule}</span></li>)}</ol>
   </section>
   <section className="debate-guide-panel debate-guide-flow" aria-labelledby="debate-flow-title">
    <header><span className="debate-guide-icon"><Clock3 size={24} aria-hidden="true"/></span><div><h3 id="debate-flow-title">سير المناظرة</h3><p>من الافتتاح إلى الختام، وقت واضح لكل مرحلة.</p></div></header>
    <ol role="list">{stages.map((stage,index)=><li key={stage.title}><span className="debate-guide-number" aria-hidden="true">{index+1}</span><h4>{stage.title}</h4><div className="debate-guide-duration"><strong>{stage.minutes==='2'?stage.unit:<><bdi>{stage.minutes}</bdi> {stage.unit}</>}</strong>{stage.scope&&<small>{stage.scope}</small>}</div></li>)}</ol>
    <footer className="debate-guide-total"><span><Clock3 size={19} aria-hidden="true"/>المدة الإجمالية</span><strong><bdi>89–94</bdi> دقيقة</strong></footer>
   </section>
  </div>
 </section>;
}
