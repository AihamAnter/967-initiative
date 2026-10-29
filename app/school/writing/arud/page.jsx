import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ChevronLeft,ExternalLink,Feather} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import {ARUD_STAGES,ARUD_SOURCE} from '@/lib/schoolArud';
import ArudJourney from '@/components/school/ArudJourney';
import school from '../../school.module.css';
import styles from './arud.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'علم العروض | مدرسة 967',description:'ابدأ تعلم الوزن الشعري من الأصوات إلى التفعيلات في 6 محطات تفاعلية مع حفظ التقدم وتصحيح الإجابات.',path:'/school/writing/arud'});
export default async function ArudPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 return <main className={school.root}>
  <header className={styles.hero}><div className="container">
   <div className={school.breadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/><Link href="/school/writing">الكتابة والأدب</Link><ChevronLeft size={14}/>علم العروض</div>
   <div className={styles.heroInterior}>
    <div><span className={styles.overline}><Feather size={18}/> مدرسة 967 · الكتابة والأدب</span>
     <h1>الكلمة لها <em>إيقاع.</em></h1>
     <p>تعلم كيف تسمع وزن الشعر وتراه. من قواعد النطق والحركة والسكون إلى تقطيع أشطر شعرية حقيقية والتعرف على البحور، في رحلة تفاعلية تختبر فهمك لا حفظ الإجابات.</p>
     <div className={styles.heroFacts}><span>{ARUD_STAGES.length} محطات متدرجة</span><span>6 تمارين لكل محطة</span><span>النجاح من 5 / 6</span></div>
     <a className={styles.heroAction} href="#arud-stages">ابدأ الرحلة <ChevronLeft size={17}/></a>
    </div>
    <div className={styles.heroArtwork} aria-hidden="true"><div className={styles.artworkLabel}>الميزان / 967</div><div className={styles.pulseLine}>ᴗ — —</div><div className={styles.tafila}>فَعُولُنْ</div><div className={styles.artworkFooter}>من الصوت إلى الوزن</div></div>
   </div>
  </div></header>
  <ArudJourney/>
  <section className={styles.reference}><div className="container"><div><h2>التدرّب قبل الحفظ</h2><p>المحطات الأربع الأولى تأسيسية؛ ثم تطبّق التفعيلات على أشطر شعرية موثّقة وتتعرف على أربعة بحور. هذا مدخل تعليمي لا يشمل بعد الزحافات والعلل والبحور الستة عشر.</p></div><a href={ARUD_SOURCE} target="_blank" rel="noopener noreferrer">مرجع في علم العروض والقافية <ExternalLink size={17}/></a></div></section>
 </main>;
}
