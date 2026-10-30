import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ChevronLeft,Landmark,Scale,ChartNoAxesCombined,Wallet,Banknote} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import {serverDb} from '@/lib/supabase-server';
import {publishedSchoolCatalog,publishedSchoolStages} from '@/lib/schoolContentServer';
import school from '../school.module.css';
import styles from './civic.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'السياسة والاقتصاد | مدرسة 967',description:'تعلّم الدولة وأنظمة الحكم والاقتصاد والبنوك عبر محطات ومحاكاة قرارات حيادية.',path:'/school/civic'});
const TRACKS=[
 {slug:'how-state-works',icon:Landmark,area:'السياسة'},
 {slug:'political-systems',icon:Scale,area:'السياسة'},
 {slug:'economics-basics',icon:ChartNoAxesCombined,area:'الاقتصاد'},
 {slug:'money-banks-inflation',icon:Banknote,area:'الاقتصاد'}
];
export default async function SchoolCivicPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 const db=serverDb(),courses=db?await publishedSchoolCatalog(db):[];
 const tracks=await Promise.all(TRACKS.map(async t=>{
  const course=courses.find(c=>c.slug===t.slug&&c.category==='السياسة والاقتصاد');
  return course?{...t,course,count:(await publishedSchoolStages(db,t.slug)).length}:null;
 }));
 return <main className={school.root}>
  <header className={styles.hero}><div className="container">
   <div className={styles.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/> السياسة والاقتصاد</div>
   <span className={styles.eyebrow}><Landmark size={18}/> القسم الخامس / مدرسة 967</span>
   <h1>افهم القرار، <em>واختبر نتائجه.</em></h1>
   <p>ابدأ بأساسيات الدولة والحكم والاقتصاد والمال. كل محطة تجمع بين الشرح والمثال والمحاكاة والاختبار، دون تقييم الآراء السياسية.</p>
   <Link className={school.primaryLink} href="/school/dashboard">رحلتي التعليمية <ArrowLeft size={17}/></Link>
  </div></header>
  <section className={school.catalogSection}><div className="container">
   <div className={school.sectionTitle}><div><span>المرحلة الأولى</span><h2>أربعة مسارات، 48 محطة</h2></div><p>12 محطة في كل مسار؛ النجاح في 5 من 6 أسئلة يفتح التالية. محاكاة القرارات للتجربة والتعلم، ولا تمنح درجة سياسية.</p></div>
   <div className={styles.cards}>
    {tracks.filter(Boolean).map(({slug,icon:Icon,area,course,count})=>
     <Link key={slug} className={styles.card} href={'/school/courses/'+slug}>
      <div className={styles.cardTop}><Icon size={30}/><span>{area} · {count} محطة</span></div>
      <h3>{course.title}</h3><p>{course.description}</p>
      <span className={styles.cardAction}>ابدأ المسار <ArrowLeft size={18}/></span>
     </Link>)}
   </div>
   {!tracks.some(Boolean)&&<p className={styles.note}>لم تُنشر مسارات السياسة والاقتصاد بعد.</p>}
   <div className={styles.note}><Wallet size={17} style={{verticalAlign:'middle'}}/> تستخدم المختبرات دولًا وأسواقًا افتراضية ونماذج حسابية محددة. النتائج التعليمية لا تصنّف الأنظمة السياسية ولا تتنبأ بالأحداث أو الأسعار.</div>
  </div></section>
 </main>;
}
