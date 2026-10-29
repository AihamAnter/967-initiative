import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,BookOpen,ChevronLeft,Feather,GraduationCap,LockKeyhole,PenTool} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from '../school.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'الكتابة والأدب | مدرسة 967',description:'خط المسند وعلم العروض والخط العربي ضمن المدرسة التفاعلية.',path:'/school/writing'});
export default async function WritingPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 return <main className={styles.root}><section className={styles.innerHero}><div className="container">
  <div className={styles.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/> الكتابة والأدب</div>
  <span className={styles.eyebrow}><PenTool size={17}/> الكتابة والأدب</span>
  <h1>من شكل الحرف، <em>إلى فن التعبير.</em></h1>
  <p>مسارات تساعدك على إتقان الكتابة والنظم والخط خطوة بخطوة. يمكنك الآن تعلم خط المسند وعلم العروض عبر محطات تفاعلية متدرجة.</p>
  </div></section>
  <section className={styles.catalogSection}><div className="container">
   <div className={styles.sectionTitle}><div><span>مسارات هذا القسم</span><h2>رحلتك تبدأ من هنا</h2></div></div>
   <div className={styles.courseGrid}>
    <Link href="/school/writing/musnad" className={styles.courseLive}><div className={styles.courseVisual} aria-hidden="true">𐩣𐩡</div><span className={styles.courseTag}>متاح الآن · 12 مرحلة تعليمية</span><h3>خط المسند</h3><p>تعرّف على الحروف، ميّز رموزها، ثم كوّن تسلسلات منها عبر 12 محطة متدرجة.</p><span className={styles.cardAction}>ابدأ مسار المسند <ArrowLeft size={18}/></span></Link>
    <Link href="/school/writing/arud" className={`${styles.courseLive} ${styles.courseArud}`}><Feather size={32} aria-hidden="true"/><span className={styles.courseTag}>متاح الآن · 4 محطات تأسيسية</span><h3>علم العروض</h3><p>من النطق والحركة والسكون إلى المقاطع والتفعيلات: اكتشف وزن الشعر وتدرّب عليه.</p><span className={styles.cardAction}>ابدأ تعلم العروض <ArrowLeft size={18}/></span></Link>
    <article className={styles.coursePending}><BookOpen size={32}/><span className={styles.courseTag}>قريبًا</span><h3>الخطوط العربية</h3><p>النسخ والرقعة والكوفي وغيرها، مع تمارين تشكيل الحروف.</p><span><LockKeyhole size={15}/> قيد الإعداد</span></article>
   </div>
  </div></section>
 </main>;
}