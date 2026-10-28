import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowUpLeft,BookOpenCheck,CalendarDays,Clock3,Gamepad2,MapPinned,Medal,Shuffle,ScrollText} from 'lucide-react';
import KnowledgePageIntro from '@/components/knowledge/KnowledgePageIntro';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from './games.module.css';

export const metadata=pageMetadata({title:'ألعاب 967',description:'ألعاب معرفية تفاعلية عن تاريخ اليمن وجغرافيته وتراثه، مع أسئلة موثقة وتحديات يومية ونقاط.',path:'/games'});
const games=[
 {id:'quiz',title:'اختبر معرفتك باليمن',subtitle:'أسئلة ثقافية وتاريخية',description:'عشرة أسئلة، أربع اختيارات، وتفسير موثق بعد كل إجابة.',href:'/games/quiz',icon:BookOpenCheck,active:true},
 {id:'place',title:'خمن المكان',subtitle:'صور وتلميحات',description:'تعرّف إلى المدن والمعالم اليمنية من الصور والتلميحات.',icon:MapPinned,active:false},
 {id:'timeline',title:'رتب التاريخ',subtitle:'أحداث عبر الزمن',description:'رتّب الأحداث والممالك اليمنية وفق تسلسلها الزمني.',icon:ScrollText,active:false},
 {id:'map',title:'أين تقع؟',subtitle:'تحدي جغرافي',description:'حدد المواقع والمحافظات على خريطة اليمن.',icon:Shuffle,active:false},
];
export default async function GamesPage(){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 return <main className={styles.root}>
  <KnowledgePageIntro title="ألعاب 967" category="تعلّم باللعب" description="استكشف اليمن بطريقة مختلفة: العب، اختبر معلوماتك، وتعرّف على القصة وراء كل إجابة.">
   <div className="directory-summary"><Link href="/games/quiz">ابدأ اختبار المعرفة <ArrowUpLeft size={16}/></Link><Link href="/games/quiz?mode=daily">تحدي اليوم <CalendarDays size={16}/></Link></div>
  </KnowledgePageIntro>
  <section className={styles.main}><div className="container">
   <div className={styles.feature}>
    <div><span className={styles.kicker}><Medal size={18}/> تحدي اليوم</span><h2>عشر محطات. كم تعرف عن اليمن؟</h2><p>اختبار جديد يومياً بالأسئلة نفسها لكل المشاركين في اليوم المحدد. إجاباتك تفتح معلومات ومراجع للتعمق في المعرفة.</p><Link href="/games/quiz?mode=daily" className={styles.featureButton}>ابدأ تحدي اليوم <ArrowUpLeft size={18}/></Link></div>
    <div className={styles.featureSymbol} aria-hidden="true"><Gamepad2 size={130} strokeWidth={1}/></div>
   </div>
   <header className={styles.sectionHeading}><div><span className={styles.eyebrow}>الألعاب المعرفية</span><h2>اختر لعبتك</h2><p>نبدأ بلعبة قابلة للعب الآن، وتُنشر بقية الألعاب تباعاً.</p></div></header>
   <div className={styles.grid}>{games.map(({id,title,subtitle,description,href,icon:Icon,active})=><article className={styles.card} key={id}>
    <span className={styles.cardIcon}><Icon size={27} strokeWidth={1.7}/></span>
    <span className={styles.cardStatus}>{active?'متاحة الآن':'قريباً'}</span>
    <span className={styles.cardSubtitle}>{subtitle}</span><h3>{title}</h3><p>{description}</p>
    {active?<Link href={href} className={styles.cardLink}>ابدأ اللعب <ArrowUpLeft size={17}/></Link>:<span className={styles.coming}>قيد التطوير <Clock3 size={15}/></span>}
   </article>)}</div>
   <div className={styles.notice}><BookOpenCheck size={24}/><div><h2>ليست مجرد أسئلة</h2><p>كل إجابة تحتوي شرحاً ومصدراً للقراءة. يمكنك اللعب دون حساب، وتُحفظ نتائجك محلياً في متصفحك فقط. لا توجد حتى الآن لوحة ترتيب عامة أو مزامنة للنتائج مع الحساب.</p></div></div>
  </div></section>
 </main>;
}
