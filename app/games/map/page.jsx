import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import ArcadeIntro from '@/components/games/ArcadeIntro';
import ArcadeChallenge from '@/components/games/ArcadeChallenge';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from '../games.module.css';

export const metadata=pageMetadata({title:'أين تقع؟ | ألعاب 967',description:'لعبة أين تقع؟ عن اليمن مع عشر مهام ونظام نقاط ومؤقت اختياري وتحدٍ يومي موحد.',path:'/games/map'});
export default async function GamePage({searchParams}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 const params=await searchParams;
 const date=new Date().toISOString().slice(0,10);
 return <main className={styles.root}>
  <ArcadeIntro compact title="أين تقع؟" description="اختبر معرفتك باليمن في تحدٍ سريع. أمامك 10 أو 15 أو 20 أو 30 ثانية لكل مهمة، أو 7 ثوانٍ ثابتة في تحدي اليوم.">
   <Link href="/games" className={styles.heroSecondary}><ArrowRight size={17}/> جميع الألعاب</Link>
   <span className={styles.roundChip}>10 مهام <span aria-hidden="true">·</span> تحدي زمني</span>
  </ArcadeIntro>
  <ArcadeChallenge game="map" date={date} initialMode={params?.mode==='daily'?'daily':'practice'}/>
 </main>;
}
