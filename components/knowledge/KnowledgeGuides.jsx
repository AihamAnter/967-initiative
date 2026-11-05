import Link from '@/components/SiteLink';
import {ArrowUpLeft,BookOpenText,ExternalLink,Globe2,MapPinned,ScrollText} from 'lucide-react';
import styles from './KnowledgeGuides.module.css';

const heritage=[
 {title:'مدينة شبام القديمة',place:'حضرموت',region:'YE19',year:'1982',kind:'تراث ثقافي',text:'مبانٍ برجية من الطوب الطيني ونظام عمران رأسي داخل سور تاريخي؛ تشتهر عمارتها المرتبطة بوادي حضرموت.',url:'https://whc.unesco.org/en/list/192/'},
 {title:'مدينة صنعاء القديمة',place:'أمانة العاصمة',region:'YE13',year:'1986',kind:'تراث ثقافي',text:'نسيج عمراني من المنازل البرجية المزخرفة بالطوب والجص، مع الأسواق والممرات والمساجد والحدائق التاريخية.',url:'https://whc.unesco.org/en/list/385/'},
 {title:'مدينة زبيد التاريخية',place:'الحديدة',region:'YE18',year:'1993',kind:'تراث ثقافي',text:'مدينة ارتبطت بالعلم والعمارة في تهامة، وبشبكة من المساجد والمدارس والأسواق والمباني التاريخية.',url:'https://whc.unesco.org/en/list/611/'},
 {title:'أرخبيل سقطرى',place:'سقطرى',region:'YE32',year:'2008',kind:'تراث طبيعي',text:'يضم تنوعًا حيويًا غنيًا، مع أنواع نباتية وحيوانية محلية لا توجد طبيعيًا في أماكن أخرى.',url:'https://whc.unesco.org/en/list/1263/'},
 {title:'معالم مملكة سبأ في مأرب',place:'مأرب',region:'YE26',year:'2023',kind:'تراث ثقافي',text:'سبعة مواقع أثرية مرتبطة بمملكة سبأ؛ تشمل شواهد حضرية ودينية ومنظومات ري قديمة.',url:'https://whc.unesco.org/en/list/1700/'},
];
const guides={
 history:{
  eyebrow:'دليل قراءة التاريخ',title:'من الأثر إلى الحكاية',description:'ابدأ بالسؤال عن الدليل والمكان والفترة. يساعد هذا على فهم اختلاف الروايات دون تحويل التقديرات إلى حقائق قطعية.',
  cards:[
   {number:'01',title:'التاريخ ليس خط حكم واحدًا',text:'قد تتزامن ممالك وحكومات في أماكن مختلفة. قارن الفترة والموقع قبل ترتيب الدول في سلسلة متتابعة.',href:'/yemen-history?type=state#eras',action:'تصفّح الممالك والدول'},
   {number:'02',title:'النقش شاهد على زمانه',text:'توضح النقوش والمباني وشبكات الري أجزاء من الماضي. ويجب التمييز بين تاريخ الموقع وتاريخ تفسيره أو اكتشافه.',href:'/yemen-history?type=heritage#eras',action:'الآثار والوثائق'},
   {number:'03',title:'المكان المعاصر ليس حدودًا قديمة',text:'روابط المحافظات وسيلة للعثور على موقع الدراسة اليوم، وليست خرائط لسيادة الدول في القرون السابقة.',href:'/yemen-map#map',action:'افتح الأطلس'},
  ],
 },
 figures:{
  eyebrow:'دليل قراءة السيرة',title:'ما الذي يجعل السيرة مفيدة؟',description:'كل اسم بداية لأسئلة عن السياق والمصادر والأثر، وليس حكمًا على الشخصية أو مكانتها.',
  cards:[
   {number:'01',title:'المجال وليس الشهرة وحدها',text:'صنّف الشخصيات بحسب الأدب والعلم والفن والسياسة وغيرها، ثم اقرأ أثر كل تجربة في سياقها.'},
   {number:'02',title:'المصدر أولًا',text:'ابحث عن مراجع السيرة وصور الوثائق، وتحقق من نسبة الصورة وصحة التاريخ قبل الاقتباس.'},
   {number:'03',title:'افصل الارتباط بالمكان عن الميلاد',text:'المحافظة المرتبطة بالشخصية قد تعكس الدراسة أو النشاط أو الأثر؛ ولا تعني بالضرورة مكان الميلاد.'},
  ],
 },
 statistics:{
  eyebrow:'محو الأمية الإحصائية',title:'أربع أسئلة قبل الاستشهاد برقم',description:'الأرقام المنشورة تصبح أكثر فائدة عندما نعرف تعريف المؤشر وسنة القياس ووحدته ومصدره.',
  cards:[
   {number:'01',title:'ما وحدة القياس؟',text:'تختلف النسبة المئوية عن العدد المطلق، كما يختلف نصيب الفرد عن الإجمالي. لا تقارن وحدات مختلفة.'},
   {number:'02',title:'متى قيس الرقم؟',text:'أحدث قيمة متاحة لا تعني أنها قِيست هذا العام. اعرض سنة القياس إلى جانب القيمة.'},
   {number:'03',title:'هل تغيّر تعريف المؤشر؟',text:'قد تؤدي تغييرات المسح أو التعريف أو النطاق إلى اختلاف السلاسل؛ راجع منهجية المصدر قبل الاستنتاج.'},
  ],
 },
 ranking:{
  eyebrow:'اقرأ المقارنة بشكل صحيح',title:'ليس كل ترتيب حكمًا شاملًا',description:'الترتيب يعكس مؤشرًا وسنة ومجموعة دول محددة؛ ولا يصح تحويله إلى تقييم عام لدولة كاملة.',
  cards:[
   {number:'01',title:'اختر مجموعة المقارنة',text:'يتغير موضع اليمن عند مقارنة جميع الدول بدل دول المنطقة؛ اقرأ نطاق المقارنة قبل الاستنتاج.'},
   {number:'02',title:'راجع اتجاه المؤشر',text:'ارتفاع القيمة قد يكون جيدًا في بعض المؤشرات وسيئًا في أخرى، مثل الوفيات أو معدلات الفقر.'},
   {number:'03',title:'انتبه إلى البيانات المفقودة',text:'لا تفسر غياب دولة أو سنة على أنه صفر. تختلف التغطية والمنهجية من مؤشر لآخر.'},
  ],
 },
};
export function HeritageTrail({context='atlas'}){
 return <section className={styles.section+' '+styles.heritage} aria-labelledby={'heritage-'+context}>
  <header className={styles.heading}>
   <div><span className={styles.eyebrow}><Globe2 size={16}/> من سجل اليونسكو</span><h2 id={'heritage-'+context}>خمسة مواقع يمنية على قائمة التراث العالمي</h2><p>تعرّف على تاريخ الإدراج وما يميز كل موقع، ثم انتقل إلى المحافظة في أطلس 967. تاريخ الإدراج ليس تاريخ تأسيس الموقع.</p></div>
   <span className={styles.counter}><strong>5</strong> مواقع مدرجة</span>
  </header>
  <div className={styles.heritageGrid}>{heritage.map((item,index)=><article key={item.region} className={styles.heritageCard}>
   <div className={styles.cardTop}><span className={styles.index}>0{index+1}</span><span className={styles.kind}>{item.kind}</span></div>
   <strong className={styles.year}>{item.year}<small>سنة الإدراج</small></strong>
   <h3>{item.title}</h3><span className={styles.place}><MapPinned size={15}/>{item.place}</span>
   <p>{item.text}</p>
   <div className={styles.actions}><Link href={'/yemen-map?region='+item.region+'#map'}>على الخريطة <ArrowUpLeft size={15}/></Link><a href={item.url} target="_blank" rel="noopener noreferrer">مصدر اليونسكو <ExternalLink size={14}/></a></div>
  </article>)}</div>
  <p className={styles.footnote}>الروابط الجغرافية تشير إلى المحافظات الحالية، لا إلى الحدود التاريخية أو موقع الأثر الدقيق. إدراج الموقع لا يؤكد حالته أو إمكانية زيارته اليوم. <a href="https://whc.unesco.org/en/statesparties/ye/" target="_blank" rel="noopener noreferrer">قائمة اليونسكو الرسمية <ExternalLink size={13}/></a></p>
 </section>;
}
export function KnowledgeReadingGuide({kind}){
 const data=guides[kind];
 if(!data)return null;
 return <section className={styles.section+' '+styles.reading} aria-labelledby={'knowledge-guide-'+kind}>
   <header className={styles.heading}><div><span className={styles.eyebrow}><ScrollText size={16}/>{data.eyebrow}</span><h2 id={'knowledge-guide-'+kind}>{data.title}</h2><p>{data.description}</p></div></header>
   <div className={styles.guideGrid}>{data.cards.map(card=><article className={styles.guideCard} key={card.number}><span className={styles.index}>{card.number}</span><h3>{card.title}</h3><p>{card.text}</p>{card.href&&<Link href={card.href}>{card.action}<ArrowUpLeft size={16}/></Link>}</article>)}</div>
   {kind==='statistics'||kind==='ranking'?<p className={styles.footnote}><BookOpenText size={15}/> للمزيد عن اختلاف التعريفات وطرق جمع البيانات: <a href="https://datahelpdesk.worldbank.org/knowledgebase/articles/906531-methodologies" target="_blank" rel="noopener noreferrer">منهجيات بيانات البنك الدولي <ExternalLink size={13}/></a></p>:null}
 </section>;
}
