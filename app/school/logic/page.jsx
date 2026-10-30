import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,BookOpen,ChevronLeft,BrainCircuit,CircuitBoard,Radio,Scale} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import {serverDb} from '@/lib/supabase-server';
import {publishedSchoolCatalog,publishedSchoolStages} from '@/lib/schoolContentServer';
import styles from '../school.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'المنطق والتفكير | مدرسة 967',description:'تعلم الاستدلال والمغالطات ومورس والبوابات المنطقية في 48 محطة عملية.',path:'/school/logic'});
const TRACKS=[
 {slug:'logical-thinking',icon:BrainCircuit,visual:'∴'},
 {slug:'logical-fallacies',icon:Scale,visual:'?!'},
 {slug:'morse-code',icon:Radio,visual:'· − ·'},
 {slug:'logic-gates',icon:CircuitBoard,visual:'∧ ∨'}
];
export default async function SchoolLogicPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 const db=serverDb(),courses=db?await publishedSchoolCatalog(db):[];
 const tracks=await Promise.all(TRACKS.map(async track=>{
  const course=courses.find(c=>c.slug===track.slug);
  if(!course||course.category!=='المنطق والتفكير')return null;
  const stages=await publishedSchoolStages(db,track.slug);
  return {...track,course,stageCount:stages.length};
 }));
 return <main className={styles.root}>
  <section className={styles.innerHero}><div className="container">
   <div className={styles.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/> المنطق والتفكير</div>
   <span className={styles.eyebrow}><BrainCircuit size={18}/> القسم الثالث / مدرسة 967</span>
   <h1>لا تحفظ الإجابة، <em>تعلّم كيف تصل إليها.</em></h1>
   <p>أربع رحلات في الاستدلال والمغالطات ومورس والدوائر الرقمية. الشرح والأمثلة أولًا، ثم مختبرات وتمارين واختبار لفتح كل محطة.</p>
   <Link className={styles.primaryLink} href="/school/dashboard">رحلتي التعليمية <ArrowLeft size={17}/></Link>
  </div></section>
  <section className={styles.catalogSection}><div className="container">
   <div className={styles.sectionTitle}><div><span>المسارات الأربعة</span><h2>اختر مهارة تفكير جديدة</h2></div>
    <p>12 محطة متدرجة في كل مسار. اجتز خمس إجابات من ست في اختبار المحطة لفتح التالية. المختبرات للتعلّم وليست نقاطًا إضافية.</p></div>
   <div className={styles.logicCourseGrid}>
    {tracks.filter(Boolean).map(({slug,icon:Icon,visual,course,stageCount})=>
     <Link key={slug} href={'/school/courses/'+slug} className={styles.logicCourseCard}>
      <div className={styles.logicCardTop}><Icon size={29} aria-hidden="true"/><span>{stageCount} محطة</span></div>
      <div className={styles.logicCardVisual} aria-hidden="true" dir="ltr">{visual}</div>
      <h3>{course.title}</h3><p>{course.description}</p>
      <span className={styles.cardAction}>ابدأ المسار <ArrowLeft size={18}/></span>
     </Link>)}
   </div>
   {tracks.every(c=>c===null)&&<p className={styles.logicEmpty}>لا توجد مسارات منشورة في هذا القسم حاليًا.</p>}
   <div className={styles.logicBottomNote}><BookOpen size={18}/> يمكنك التنقل بين المسارات الأربعة بحرية، لكن المحطات داخل كل مسار تُفتح بالترتيب.</div>
  </div></section>
 </main>;
}
