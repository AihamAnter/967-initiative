import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft,ArrowUpLeft,BookOpenCheck,CalendarDays,Clock3,Gamepad2,MapPinned,Play,ScrollText,Shuffle,ShieldCheck,Sparkles,Trophy,Zap} from 'lucide-react';
import ArcadeIntro from '@/components/games/ArcadeIntro';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from './games.module.css';

export const metadata=pageMetadata({title:'ألعاب 967',description:'ألعاب معرفية تفاعلية عن تاريخ اليمن وجغرافيته وتراثه، مع أسئلة موثقة وتحديات يومية ونقاط.',path:'/games'});
const games=[
 {id:'quiz',number:'01',title:'اختبر معرفتك باليمن',subtitle:'KNOWLEDGE QUEST',description:'10 أسئلة في كل جولة. إجابات سريعة، نقاط مكتسبة، ومعلومات جديدة تكتشفها مع كل سؤال.',href:'/games/quiz',icon:BookOpenCheck,active:true},
 {id:'place',number:'02',title:'خمن المكان',subtitle:'GUESS THE PLACE',description:'هل تتعرف على المدينة أو المعلم من صورة وتلميحات؟',icon:MapPinned,active:false},
 {id:'timeline',number:'03',title:'رتب التاريخ',subtitle:'TIME ATTACK',description:'ضع محطات تاريخ اليمن بالترتيب الصحيح.',icon:ScrollText,active:false},
 {id:'map',number:'04',title:'أين تقع؟',subtitle:'MAP CHALLENGE',description:'تحدَّ ذاكرتك الجغرافية على خريطة اليمن.',icon:Shuffle,active:false},
];
export default async function GamesPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 const [featured,...upcoming]=games;
 const FeaturedIcon=featured.icon;
 return <main className={styles.root}>
  <ArcadeIntro description="التاريخ والجغرافيا والثقافة، ولكن بروح المنافسة. اختر تحديك، اجمع النقاط واكتشف اليمن بطريقة لم تجربها من قبل.">
   <Link className={styles.heroPrimary} href="/games/quiz"><Play size={19} fill="currentColor" aria-hidden="true"/> ابدأ اللعب الآن <ArrowLeft size={18} aria-hidden="true"/></Link>
   <Link className={styles.heroSecondary} href="/games/quiz?mode=daily"><CalendarDays size={19} aria-hidden="true"/> تحدي اليوم</Link>
  </ArcadeIntro>
  <section className={styles.gameSection} id="choose-your-game" aria-labelledby="games-heading">
   <div className="container">
    <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}><span/> GAME SELECT / 01</span><h2 id="games-heading">اختر ساحة التحدي</h2><p>مغامرتك الأولى جاهزة. ألعاب أخرى في الطريق.</p></div><span className={styles.availableCount}><span/> لعبة واحدة متاحة الآن</span></div>
    <div className={styles.gameGrid}>
     <Link href={featured.href} className={[styles.gameCard,styles.featuredCard].join(' ')}>
      <div className={styles.gameCardHalo} aria-hidden="true"/>
      <div className={styles.cardTop}><span className={styles.serial}>{featured.number} <span>/ 04</span></span><span className={styles.liveState}><Zap size={14} fill="currentColor" aria-hidden="true"/> متاحة الآن</span></div>
      <div className={styles.featureVisual} aria-hidden="true"><span className={styles.featureVisualRing}/><FeaturedIcon size={85} strokeWidth={1.25}/><span className={styles.featureXP}>+100 XP</span></div>
      <div className={styles.cardDetails}><span className={styles.cardEnglish}>{featured.subtitle}</span><h3>{featured.title}</h3><p>{featured.description}</p></div>
      <span className={styles.playNow}>العب الآن <ArrowUpLeft size={20} aria-hidden="true"/></span>
     </Link>
     {upcoming.map(game=>{
      const Icon=game.icon;
      return <article className={[styles.gameCard,styles.upcomingCard,styles['game_'+game.id]].join(' ')} key={game.id}>
       <div className={styles.cardTop}><span className={styles.serial}>{game.number} <span>/ 04</span></span><span className={styles.lockedState}><Clock3 size={13} aria-hidden="true"/> قريباً</span></div>
       <div className={styles.miniVisual} aria-hidden="true"><div className={styles.miniOrb}/><Icon size={59} strokeWidth={1.3}/></div>
       <div className={styles.cardDetails}><span className={styles.cardEnglish}>{game.subtitle}</span><h3>{game.title}</h3><p>{game.description}</p></div>
       <span className={styles.cardComing}>قيد التطوير <span aria-hidden="true">···</span></span>
      </article>;
     })}
    </div>
    <Link href="/games/quiz?mode=daily" className={styles.dailyStrip}>
     <span className={styles.dailyEmblem}><Trophy size={31} strokeWidth={1.7} aria-hidden="true"/></span>
     <span className={styles.dailyText}><span className={styles.dailyEyebrow}>DAILY CHALLENGE / كل يوم فرصة جديدة</span><strong>هل تستطيع التفوق على نتيجتك أمس؟</strong><small>10 أسئلة ثابتة للجميع كل يوم بتوقيت UTC · تحدَّ نفسك وشارك النتيجة.</small></span>
     <span className={styles.dailyAction}>العب تحدي اليوم <ArrowUpLeft size={20} aria-hidden="true"/></span>
    </Link>
    <div className={styles.infoRow}>
     <span><Gamepad2 size={19} aria-hidden="true"/> بدون تسجيل</span>
     <span><ShieldCheck size={19} aria-hidden="true"/> النتائج محفوظة في متصفحك</span>
     <span><Sparkles size={19} aria-hidden="true"/> تعلم شيئاً جديداً بعد كل إجابة</span>
    </div>
   </div>
  </section>
 </main>;
}
