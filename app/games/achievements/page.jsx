import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight,Medal,ShieldCheck} from 'lucide-react';
import ArcadeIntro from '@/components/games/ArcadeIntro';
import GameAchievementGallery from '@/components/games/GameAchievementGallery';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from '../games.module.css';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'الإنجازات والشارات | ألعاب 967',
 description:'شارات الإنجازات الرسمية في ألعاب 967: تحديات موثقة، إتقان الجغرافيا والتاريخ والاستمرارية.',path:'/games/achievements'});
export default async function GamesAchievementsPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 return <main className={styles.root}>
  <ArcadeIntro compact title="إنجازات 967" description="كل تحدٍّ جديد يقربك من شارة تفتخر بها. اكتشف الأوسمة، تابع تقدمك، واجمعها من خلال المنافسة اليومية.">
   <Link href="/games" className={styles.heroSecondary}><ArrowRight size={17}/> جميع الألعاب</Link>
   <span className={styles.roundChip}><Medal size={16}/> شارات موثقة <ShieldCheck size={15}/></span>
  </ArcadeIntro>
  <div className="container" style={{paddingBlock:'26px 68px'}}>
   <GameAchievementGallery/>
  </div>
 </main>;
}
