import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ChevronLeft,ExternalLink,GraduationCap,ScrollText} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import {MUSNAD_SOURCE} from '@/lib/schoolMusnad';
import SchoolJourney from '@/components/school/SchoolJourney';
import styles from '../../school.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'خط المسند | مدرسة 967',description:'رحلة تعليمية تفاعلية لتعرّف حروف خط المسند وقراءتها وكتابتها عبر مراحل مع تقييم وحفظ التقدم.',path:'/school/writing/musnad'});
export default async function MusnadPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 return <main className={styles.root}>
  <section className={styles.innerHero}><div className="container">
   <div className={styles.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/><Link href="/school/writing">الكتابة والأدب</Link><ChevronLeft size={14}/> خط المسند</div>
   <span className={styles.eyebrow}><ScrollText size={17}/> مسار تعليمي · الكتابة والأدب</span>
   <h1>رحلة <em>فكّ النقش.</em></h1>
   <p>ابدأ بأربعة حروف، ثم وسّع معرفتك، ثم اكتب تسلسلات بسيطة. لكل محطة اختبار من 6 تمارين، ولا تفتح المحطة التالية إلا بعد إتقان السابقة.</p>
   <div className={styles.heroPills}><span>3 مراحل متاحة</span><span>نجاح بدرجة 5 من 6</span><span>محاولات جديدة بأسئلة متنوعة</span></div>
  </div></section>
  <SchoolJourney/>
  <section className={styles.reference}><div className="container"><div><h2>نقرأ التاريخ بدقة</h2><p>خط المسند نظام كتابة استخدمته لغات قديمة في جنوب الجزيرة العربية. التدريب الأول على قراءة الحروف، وليس على ترجمة السبئية أو تحويل العربية المعاصرة إلى لغة قديمة.</p></div><a href={MUSNAD_SOURCE} target="_blank" rel="noopener noreferrer">مرجع يونيكود لخط جنوب الجزيرة العربية القديم <ExternalLink size={16}/></a></div></section>
 </main>;
}