import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,BookOpen,ChevronLeft,Feather,GraduationCap,PenTool} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from '../school.module.css';
import {serverDb} from '@/lib/supabase-server';
import {publishedSchoolCatalog} from '@/lib/schoolContentServer';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'الكتابة والأدب | مدرسة 967',description:'خط المسند وعلم العروض والخط العربي ضمن المدرسة التفاعلية.',path:'/school/writing'});
export default async function WritingPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 const db=serverDb();
 const published=db?await publishedSchoolCatalog(db):[];
 const authored=published.filter(c=>c.category==='الكتابة والأدب'&&!['musnad','arud'].includes(c.slug));
 const musnad=published.find(c=>c.slug==='musnad'),arud=published.find(c=>c.slug==='arud');
 return <main className={styles.root}><section className={styles.innerHero}><div className="container">
  <div className={styles.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/> الكتابة والأدب</div>
  <span className={styles.eyebrow}><PenTool size={17}/> الكتابة والأدب</span>
  <h1>من شكل الحرف، <em>إلى فن التعبير.</em></h1>
  <p>مسارات تساعدك على إتقان الكتابة والنظم خطوة بخطوة. تعلم خط المسند والعروض والخطوط العربية عبر 36 محطة تفاعلية، وتابع رحلتك من مكان واحد.</p><Link className={styles.primaryLink} href="/school/dashboard">عرض رحلتي التعليمية <ArrowLeft size={18}/></Link>
  </div></section>
  <section className={styles.catalogSection}><div className="container">
   <div className={styles.sectionTitle}><div><span>مسارات هذا القسم</span><h2>رحلتك تبدأ من هنا</h2></div></div>
   <div className={styles.courseGrid}>
    <Link href="/school/writing/musnad" className={styles.courseLive}><div className={styles.courseVisual} aria-hidden="true">𐩣𐩡</div><span className={styles.courseTag}>متاح الآن · 12 مرحلة تعليمية</span><h3>{musnad?.title||'خط المسند'}</h3><p>{musnad?.description||'تعرّف على الحروف، ميّز رموزها، ثم كوّن تسلسلات منها عبر 12 محطة متدرجة.'}</p><span className={styles.cardAction}>ابدأ مسار المسند <ArrowLeft size={18}/></span></Link>
    <Link href="/school/writing/arud" className={`${styles.courseLive} ${styles.courseArud}`}><Feather size={32} aria-hidden="true"/><span className={styles.courseTag}>متاح الآن · 12 محطة تعليمية</span><h3>{arud?.title||'علم العروض'}</h3><p>{arud?.description||'من التفعيلات إلى تقطيع الأبيات والزحافات والعلل، ثم أوزان البحور الستة عشر.'}</p><span className={styles.cardAction}>ابدأ تعلم العروض <ArrowLeft size={18}/></span></Link>
    {authored.map(course=><Link key={course.slug} href={'/school/courses/'+course.slug} className={styles.courseLive}>
      <BookOpen size={32} aria-hidden="true"/><span className={styles.courseTag}>مسار منشور</span>
      <h3>{course.title}</h3><p>{course.description}</p><span className={styles.cardAction}>ابدأ التعلم <ArrowLeft size={18}/></span>
    </Link>)}
    
   </div>
  </div></section>
 </main>;
}