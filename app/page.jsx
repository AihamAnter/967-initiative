import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import Image from 'next/image';
import {ArrowUpLeft, ArrowLeft, BookOpen, ChartNoAxesCombined, Compass, Film, Handshake, MapPin, MessagesSquare, Package, PenLine, UsersRound} from 'lucide-react';
import SearchForm from '@/components/SearchForm';
import HomeDebates from '@/components/debates/HomeDebates';
import SectionHeading from '@/components/SectionHeading';
import WorkCard from '@/components/WorkCard';
import IndicatorCard from '@/components/IndicatorCard';
import {getIssues, getWorks, getStatIndicators, getYemeniCompanies, getProfessionals, getSiteSettings} from '@/lib/data';
import {formatArabicDate} from '@/lib/format';
import {canOptimizeImage} from '@/lib/media';
import styles from './home.module.css';
import SaveForLater from '@/components/reading/SaveForLater';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'967 | اليمن، أقرب إليك', description:'مساحة يمنية مفتوحة للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.', path:'/'});
const destinations = [
  {href: '/magazine', title: 'مجلة 967', text: 'مساحة للقراءة والتأمل', icon: BookOpen, tone: 'plum'},
  {href: '/works', title: 'الأعمال الإعلامية', text: 'حكايات من زوايا مختلفة', icon: Film, tone: 'clay'},
  {href: '/yemen-in-numbers', title: 'اليمن بالأرقام', text: 'بيانات تضعك في الصورة', icon: ChartNoAxesCombined, tone: 'blue'},
  {href: '/yemen-map', title: 'اكتشف اليمن', text: 'أماكن وقصص وشخصيات', icon: Compass, tone: 'green'},
  {href: '/yemeni-products', title: 'منتجات يمنية', text: 'اعرف ما يُصنع في بلدك', icon: Package, tone: 'gold'},
  {href: '/professionals', title: 'المهنيون', text: 'مهارات أقرب إلى احتياجك', icon: UsersRound, tone: 'primary'},
];
export default async function Home() {
  const [works, issues, indicators, companies, professionals, settings] = await Promise.all([getWorks(), getIssues(), getStatIndicators(), getYemeniCompanies(), getProfessionals(), getSiteSettings()]);
  const latest = issues[0];
  const highlights = indicators.filter(item => item.latestValue).sort((a, b) => Number(b.latestValue.year) - Number(a.latestValue.year)).slice(0, 3);
  const additions = [...companies.filter(x => !x.isDemo).slice(0, 1).map(x => ({title: x.name, description: x.summary, href: '/yemeni-products/' + x.id, type: 'من دليل المنتجات'})), ...professionals.filter(x => !x.isDemo).slice(0, 1).map(x => ({title: x.fullName, description: x.professionTitle, href: '/professionals/' + x.id, type: 'من دليل المهنيين'}))];
  return <div className="home-page">
    <section className="home-hero"><div className="container home-hero-grid">
      <div className="home-hero-copy"><span className="eyebrow">{settings.heroEyebrow}</span><h1>{settings.heroTitle} {settings.heroHighlight&&<span>{settings.heroHighlight}</span>}</h1><p>{settings.heroDescription}</p><SearchForm placeholder={settings.searchPlaceholder}/><div className="hero-suggestions"><span>ابدأ من هنا</span><Link href="/yemen-map">اكتشف مكاناً</Link><Link href="/magazine">اقرأ حكاية</Link><Link href="/yemen-in-numbers">تحقّق من رقم</Link></div></div>
      <Link href="/yemen-map" className="home-map-visual" aria-label="استكشف محافظات اليمن ومديرياتها في الأطلس التفاعلي"><span className="map-caption"><span/> أرض واحدة، حكايات كثيرة</span><Image src="/images/yemen-preview.svg" width={1343} height={760} priority alt="خريطة اليمن ومحافظاتها وجزرها" className="home-map-image" sizes="(max-width: 760px) 90vw, (max-width: 1440px) 45vw, 600px"/><span className="map-discover"><span><strong>تعرّف على اليمن، مكاناً بمكان.</strong><span>المحافظات والمديريات في أطلس تفاعلي</span></span><ArrowUpLeft size={22}/></span></Link>
    </div></section>
    <section className="section home-discovery" aria-label="أدوات استكشاف اليمن"><div className="container"><SectionHeading kicker="أقسام المنصة" title="اختر ما تود اكتشافه." copy="قراءة، معرفة، أو مهارة تحتاجها. كل أقسام 967 أمامك."/><div className="quick-grid">{destinations.map(({href, title, text, icon: Icon, tone}) => <Link href={href} className="quick-link" data-tone={tone} key={href}><Icon size={25} strokeWidth={1.5}/><h2>{title}</h2><span>{text}</span><ArrowUpLeft size={17} className="quick-arrow"/></Link>)}</div></div></section>
    <HomeDebates/>
    <section className="section home-latest"><div className="container"><SectionHeading kicker="من المنصة" title="مساحة للاكتشاف، كل يوم." copy="أحدث ما نُشر من أعمال وإصدارات وإضافات إلى أدلة 967." href="/works" linkLabel="المكتبة الإعلامية"/>
      <div className={works.length===1&&latest?styles.featurePair:undefined}>
      {works.length > 0 && <div className={`work-grid home-work-grid${works.length === 1 ? ' home-work-single' : ''}`}>{works.slice(0, 3).map((work, index) => <WorkCard work={work} index={index} key={work.id}/>)}</div>}
      {latest && <article className="home-issue"><Link href={'/magazine/' + latest.slug} className="home-issue-cover">{latest.cover_url ? <Image src={latest.cover_url} alt={'غلاف ' + latest.title} width={450} height={600} sizes="(max-width: 600px) 210px, 240px" unoptimized={!canOptimizeImage(latest.cover_url)}/> : <BookOpen size={56} aria-hidden="true"/>}</Link><div><span className="eyebrow">أحدث إصدار · العدد {latest.number}</span><h3><Link href={'/magazine/' + latest.slug}>{latest.title}</Link></h3><p>{latest.summary}</p><time dateTime={latest.issue_date}>{formatArabicDate(latest.issue_date)}</time><div className="spotlight-actions"><Link href={'/magazine/' + latest.slug} className="btn btn-primary">اقرأ العدد <ArrowLeft size={17}/></Link>{!latest.is_demo&&<SaveForLater item={{kind:'issue',href:'/magazine/'+encodeURIComponent(latest.slug),title:latest.title}}/>}</div></div></article>}
      </div>
      {additions.length > 0 && <div className="latest-additions">{additions.map(item => <Link href={item.href} key={item.href}><span className="eyebrow">{item.type}</span><h3>{item.title}</h3><p>{item.description}</p><ArrowUpLeft size={18}/></Link>)}</div>}
      {!works.length && !latest && !additions.length && <div className="quiet-empty"><BookOpen size={28}/><div><h3>المحتوى يبدأ من هنا.</h3><p>لا يوجد محتوى منشور في المكتبة بعد. استكشف الأقسام أو اقترح موضوعاً نعمل عليه معاً.</p></div><Link href="/contribute?type=اقتراح%20موضوع" className="btn btn-outline">اقترح موضوعاً <PenLine size={17}/></Link></div>}
    </div></section>
    <section className="section home-numbers"><div className="container"><SectionHeading kicker="اليمن بالأرقام" title="وراء كل رقم، صورة أوضح." copy="مؤشرات وطنية مع سنة القياس والمصدر. المعرفة تبدأ برقم يمكن التحقّق منه." href="/yemen-in-numbers" linkLabel="استكشف جميع المؤشرات"/>{highlights.length ? <div className="stat-indicator-grid">{highlights.map(item => <IndicatorCard key={item.id} indicator={item}/>)}</div> : <div className="numbers-empty"><ChartNoAxesCombined size={35}/><p>المؤشرات ذات القيم الموثقة ستظهر هنا عند نشرها.</p><Link className="text-link" href="/yemen-in-numbers">تصفح مجالات المرصد <ArrowLeft size={16}/></Link></div>}</div></section>
    <section className="participate-banner" id="contact"><div className="container"><div><span>{settings.participationEyebrow}</span><h2>{settings.participationTitle}</h2></div><Link href="/contribute" className="btn btn-white">{settings.participationButtonLabel} <ArrowUpLeft size={19}/></Link></div></section>
    <details className={styles.aboutDisclosure}><summary className="container">عن المبادرة ومشاريع 967 <span>تعرّف على رؤيتنا ومسارات العمل</span></summary>
    <section className="section home-about" id="about"><div className="container about-platform"><div><span className="eyebrow">عن المبادرة</span><h2>{settings.aboutTitle}</h2><div className="about-words">{settings.aboutTags.map((word, index) => <span key={index}>{word}</span>)}</div></div><div><p className="lead">{settings.aboutDescription}</p><details open><summary>رؤيتنا ورسالتنا</summary><p>{settings.aboutVision}</p></details><details><summary>مجالات عملنا</summary><p>{settings.aboutFields}</p></details></div></div></section>
    <section className="section home-projects" id="projects"><div className="container"><SectionHeading kicker="من الفكرة إلى الأثر" title="مسارات نعمل على تطويرها." copy="نعرض حالة كل مشروع بوضوح، ونعلن تفاصيل الأنشطة عند إطلاقها."/><div className="project-list">{[{icon: MapPin, title: '967 في الشارع', status: 'مخطط له', text: 'لقاءات واستطلاعات ميدانية للاستماع إلى تجارب الناس وأسئلتهم.'}, {icon: MessagesSquare, title: 'مناظرات 967', status: settings.debatesProjectStatus, href:'/debates', text: 'حوارات منظمة تتيح للرؤى المختلفة مساحة للفهم والنقاش.'}, {icon: Handshake, title: 'مشاريع مجتمعية', status: 'مخطط لها', text: 'مبادرات في المعرفة والخدمات والمشاركة تُعلن عند إطلاقها.'}].map(({icon: Icon, title, status, text, href}) => <article key={title}><Icon size={24}/><div><h3>{href?<Link href={href}>{title} <ArrowUpLeft size={16}/></Link>:title}</h3><p>{text}</p></div><span className="status-badge">{status}</span></article>)}</div></div></section>
    </details>
  </div>;
}
