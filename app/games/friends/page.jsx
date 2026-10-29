import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight,Swords} from 'lucide-react';
import ArcadeIntro from '@/components/games/ArcadeIntro';
import FriendChallengeCreate from '@/components/games/FriendChallengeCreate';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from '../games.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'تحدَّ صديقك | ألعاب 967',description:'أنشئ تحديًا خاصًا من ألعاب 967، وأرسل رابطًا لصديقك ليتنافس معك في الأسئلة نفسها.',path:'/games/friends'});
export default async function Page(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 return <main className={styles.root} dir="rtl">
  <ArcadeIntro compact title="تحدَّ صديقك" description="واجه صديقك في عشر مهام متطابقة، وراقبا النتيجة النهائية. تحدٍ خاص من دون التأثير على المنافسة الرسمية.">
   <Link href="/games" className={styles.heroSecondary}><ArrowRight size={18}/> جميع الألعاب</Link>
   <span className={styles.roundChip}><Swords size={16}/> لاعب ضد لاعب</span>
  </ArcadeIntro>
  <section className={styles.gameSection}><div className="container" style={{paddingBlock:'24px 70px'}}><FriendChallengeCreate/></div></section>
 </main>;
}
