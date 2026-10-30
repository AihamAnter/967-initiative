import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,BookOpen,ChevronLeft,BrainCircuit,GraduationCap,Layers,LockKeyhole,PenTool,Sparkles,Star,Telescope} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from './school.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'مدرسة 967',description:'مدرسة 967: الكتابة والأدب والمنطق والتفكير، سبعة مسارات و84 محطة تفاعلية',path:'/school'});
export default async function SchoolPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 return <main className={styles.root}>
  <div className={styles.schoolHero}><div className="container">
   <div className={styles.breadcrumb}><Link href="/">الرئيسية</Link><ChevronLeft size={14}/> مدرسة 967</div>
   <div className={styles.heroGrid}><div>
    <span className={styles.eyebrow}><GraduationCap size={18}/> مدرسة 967 / LEARNING STUDIO</span>
    <h1>كل مهارة، <em>رحلة جديدة.</em></h1>
    <p>هنا لا تكتفي بقراءة معلومة؛ تتعلّمها، تطبّقها، وتتقدم خطوة بخطوة. تنجح فتفتح المحطة التالية، وتتعثر فتتدرّب وتحاول من جديد.</p>
    <div className={styles.heroActions}><Link className={styles.primaryLink} href="/school/logic">استكشف المسارات <ArrowLeft size={18}/></Link><Link className={styles.myLearningLink} href="/school/dashboard">رحلتي التعليمية <GraduationCap size={18}/></Link></div>
    <div className={styles.heroPills}><span><Layers size={16}/> مراحل متدرجة</span><span><Sparkles size={16}/> تمارين تتجدد</span><span><Star size={16}/> إتقان قبل الانتقال</span></div>
   </div><div className={styles.heroArtifact} aria-hidden="true"><div className={styles.artifactRing}/><span className={styles.artifactGlyph}>𐩣</span><span className={styles.artifactTag}>967 / MUSNAD</span></div></div>
  </div></div>
  <section className={styles.catalogSection}><div className="container">
   <div className={styles.sectionTitle}><div><span>المجالات التعليمية</span><h2>اختر ما تريد إتقانه</h2></div><p>تعلّم عبر 7 مسارات و84 محطة تفاعلية، وتابع تقدمك من لوحة واحدة.</p></div>
   <div className={styles.catalogGrid}>
    <Link className={styles.categoryLive} href="/school/writing"><span className={styles.categoryIcon}><PenTool size={30}/></span><small>القسم الأول / متاح الآن</small><h3>الكتابة والأدب</h3><p>خط المسند والعروض والخطوط العربية، عبر 36 محطة متدرجة.</p><span className={styles.cardAction}>استكشف القسم <ArrowLeft size={18}/></span><span className={styles.categoryGlyph} aria-hidden="true">𐩣</span></Link>
    <article className={styles.categoryLater}><span className={styles.categoryIcon}><Telescope size={29}/></span><small><LockKeyhole size={14}/> قيد الإعداد</small><h3>الفلك والطبيعة</h3><p>التعرّف على النجوم والملاحة والظواهر الطبيعية بطريقة تطبيقية.</p></article>
    <Link className={styles.categoryLive} href="/school/logic"><span className={styles.categoryIcon}><BrainCircuit size={29}/></span><small>القسم الثالث / متاح الآن</small><h3>المنطق والتفكير</h3><p>فن التفكير المنطقي، المغالطات، شفرة مورس والبوابات المنطقية عبر 48 محطة تفاعلية ومختبرات حية.</p><span className={styles.cardAction}>استكشف القسم <ArrowLeft size={18}/></span><span className={styles.categoryGlyph} aria-hidden="true">∧∨¬</span></Link>
    <article className={styles.categoryLater}><span className={styles.categoryIcon}><BookOpen size={29}/></span><small><LockKeyhole size={14}/> قيد الإعداد</small><h3>الفنون والمهارات</h3><p>الرسم والزخرفة والمهارات اليدوية ومشاريع التعلم العملي.</p></article>
   </div>
  </div></section>
 </main>;
}