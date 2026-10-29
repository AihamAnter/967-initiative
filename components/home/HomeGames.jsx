import Link from 'next/link';
import {ArrowLeft,ArrowUpLeft,CalendarDays,Flame,Gamepad2,MapPinned,ScrollText,ShieldCheck,Sparkles,Swords,Trophy,UsersRound,Zap} from 'lucide-react';
import {dailyGameForDate,dailyGameUrl,DAILY_GAME_TITLES,utcDay} from '@/lib/dailyGame';
import styles from './HomeGames.module.css';

const previews=[
 {href:'/games/map',title:'أين تقع؟',eyebrow:'MAP QUEST',description:'اختبر معرفتك بمحافظات اليمن على الخريطة.',icon:MapPinned,number:'01'},
 {href:'/games/timeline',title:'رتّب التاريخ',eyebrow:'TIME ORDER',description:'ضع المحطات والأحداث في ترتيبها الصحيح.',icon:ScrollText,number:'02'},
 {href:'/games/who',title:'من أنا؟',eyebrow:'WHO AM I?',description:'اكتشف الشخصية اليمنية من التلميحات.',icon:UsersRound,number:'03'}
];

export default function HomeGames(){
 // The site homepage already renders dynamically. Resolve the official
 // challenge on the server from UTC rather than guessing from the browser.
 const today=utcDay();
 const dailyGame=dailyGameForDate(today);
 const dailyHref=dailyGameUrl(today);

 return <section id="home-games" className={styles.section} aria-labelledby="home-games-title">
  <div className="container">
   <div className={styles.sectionHead}>
    <div>
     <span className={styles.sectionKicker}><Gamepad2 size={17} aria-hidden="true"/> مساحة للعب والاكتشاف</span>
     <h2 id="home-games-title">المعرفة، هذه المرة <span>على هيئة تحدٍّ.</span></h2>
     <p>تعلّم اليمن بطريقة مختلفة، وتنافس مع الآخرين، أو ابدأ مواجهة خاصة مع صديقك.</p>
    </div>
    <Link className={styles.headLink} href="/games">اكتشف الألعاب التسع <ArrowUpLeft size={17} aria-hidden="true"/></Link>
   </div>

   <div className={styles.showcase}>
    <div className={styles.hero}>
     <div className={styles.heroAmbient} aria-hidden="true"><span/><span/><span/></div>
     <div className={styles.heroTop}>
      <span className={styles.status}><span aria-hidden="true"/> 967 ARCADE <span className={styles.statusDivider}>/</span> تحديات معرفية</span>
      <span className={styles.heroMark} aria-hidden="true"><Gamepad2 size={28} strokeWidth={1.5}/></span>
     </div>
     <div className={styles.heroContent}>
      <span className={styles.heroEyebrow}><Zap size={15} aria-hidden="true"/> العب، اكتشف، وتقدّم</span>
      <h3>إلى أي مدى <em>تعرف اليمن؟</em></h3>
      <p>تسع ألعاب في التاريخ والجغرافيا والشخصيات والتراث، مع تحدٍّ رسمي يتجدّد يوميًا وإنجازات تُكتسب بالمشاركة.</p>
      <div className={styles.stats} aria-label="مميزات ألعاب 967">
       <div><strong>٩</strong><span>ألعاب متنوعة</span></div>
       <div><strong>١٤</strong><span>شارة وإنجازًا</span></div>
       <div><strong>٧</strong><span>ثوانٍ لكل سؤال يومي</span></div>
      </div>
      <div className={styles.heroActions}>
       <Link className={styles.primary} href={dailyHref}><Flame size={19} aria-hidden="true"/> العب تحدي اليوم <ArrowUpLeft size={18} aria-hidden="true"/></Link>
       <Link className={styles.secondary} href="/games">تصفح جميع الألعاب <ArrowLeft size={17} aria-hidden="true"/></Link>
      </div>
     </div>
     <div className={styles.heroFoot}><ShieldCheck size={16} aria-hidden="true"/> التحدي الرسمي بمحاولة يومية واحدة ونقاط موثقة؛ الجولات الحرة متاحة للجميع.</div>
    </div>
    <div className={styles.preview}>
     <div className={styles.previewHead}><span><Sparkles size={17} aria-hidden="true"/> اختر نقطة البداية</span><span dir="ltr">03 / 09</span></div>
     <div className={styles.previewList}>
      {previews.map(({href,title,eyebrow,description,icon:Icon,number})=><Link className={styles.previewItem} href={href} key={href}>
       <span className={styles.previewIcon}><Icon size={23} strokeWidth={1.7} aria-hidden="true"/></span>
       <span className={styles.previewCopy}><span className={styles.previewEyebrow} dir="ltr">{eyebrow}</span><strong>{title}</strong><small>{description}</small></span>
       <span className={styles.previewEnd}><span dir="ltr">{number}</span><ArrowUpLeft size={18} aria-hidden="true"/></span>
      </Link>)}
     </div>
     <div className={styles.duel}>
      <span className={styles.duelIcon}><Swords size={25} strokeWidth={1.65} aria-hidden="true"/></span>
      <div><strong>تحدَّ صديقك</strong><p>الأسئلة نفسها، والنتيجة تحسم المنافسة. اختر لعبة وأنشئ رابط المواجهة من داخلها.</p></div>
      <Link href="/games" className={styles.duelLink}>اختر اللعبة <ArrowUpLeft size={17} aria-hidden="true"/></Link>
     </div>
    </div>
   </div>
   <div className={styles.bottomBar}>
    <span><CalendarDays size={17} aria-hidden="true"/> تحدي اليوم: <strong>{DAILY_GAME_TITLES[dailyGame]}</strong></span>
    <span><Trophy size={17} aria-hidden="true"/> منافسة أسبوعية ومهمات متجددة</span>
    <Link href="/games/leaderboard">لوحة المتصدرين <ArrowLeft size={16} aria-hidden="true"/></Link>
   </div>
  </div>
 </section>;
}
