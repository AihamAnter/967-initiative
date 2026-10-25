import NextLink from 'next/link';
import {ArrowUpLeft, ArrowLeft, BookOpen, ChartNoAxesCombined, ChevronDown, Compass, Film, Handshake, MapPin, MessagesSquare, Package, UsersRound} from 'lucide-react';
import SearchForm from '@/components/SearchForm';
import YemeniMotif from '@/components/design/YemeniMotif';
import {HomeStoryCard, HomeIssueCard, HomeIndicatorCard, HomeDirectoryCard} from '@/components/home/HomeCards';
import {getIssues, getWorks, getStatIndicators, getYemeniCompanies, getProfessionals, getSiteSettings} from '@/lib/data';
import {getDebateCatalog} from '@/lib/debateServer';
import {selectHomeContent,homeProjections} from '@/lib/homeContent';
import {pageIsVisible,sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'967 | اليمن، أقرب إليك', description:'مساحة يمنية مفتوحة للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.', path:'/'});

const destinations = [
  {href:'/works', title:'شاهد حكاية', text:'الأعمال الإعلامية', icon:Film, tone:'coral'},
  {href:'/magazine', title:'خذ وقتك للقراءة', text:'مجلة 967', icon:BookOpen, tone:'violet'},
  {href:'/yemen-in-numbers', title:'افهم الصورة', text:'اليمن بالأرقام', icon:ChartNoAxesCombined, tone:'cobalt'},
  {href:'/yemen-map', title:'اكتشف مكانًا', text:'أطلس اليمن', icon:Compass, tone:'leaf'},
  {href:'/yemeni-products', title:'صُنع في اليمن', text:'دليل المنتجات', icon:Package, tone:'sun'},
  {href:'/professionals', title:'اعثر على مهارة', text:'دليل المهنيين', icon:UsersRound, tone:'brand'},
];

export default async function Home() {
  const [works, issues, indicators, companies, professionals, settings, debateCatalog] = await Promise.all([
    getWorks(homeProjections.works), getIssues(homeProjections.issues), getStatIndicators(), getYemeniCompanies(homeProjections.companies), getProfessionals(homeProjections.professionals), getSiteSettings(), getDebateCatalog(),
  ]);
  const content = selectHomeContent({works, issues, indicators, companies, professionals, debates:debateCatalog.debates});
  const visible=id=>sectionIsVisible(id,settings.pageVisibility);
  const Link=({href,...props})=>pageIsVisible(href,settings.pageVisibility,settings.contentPages||[])?<NextLink href={href} {...props}/>:null;
  const showStories=visible('works')||visible('debates');
  const showLead=visible(content.leadKind==='debate'?'debates':'works');
  const lead = content.leadKind === 'debate' ? content.debate : content.work;
  const secondaryKind = content.leadKind === 'debate' ? 'video' : 'debate';
  const secondary = secondaryKind === 'video' ? content.work : content.debate;
  const remainingIndicators = content.highlights.slice(1);
  const moreContent = content.moreWorks.length > 0 || content.moreIssues.length > 0;

  return <div className={`home-page ${styles.page}`}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className="container">
        <div className={styles.intro}>
          <div className={styles.titleBlock}><span className={styles.kicker}><span aria-hidden="true"/>{settings.heroEyebrow}</span><h1 id="home-title">{settings.heroTitle} {settings.heroHighlight && <span>{settings.heroHighlight}</span>}</h1></div>
          <div className={styles.introCopy}><p>{settings.heroDescription}</p><SearchForm placeholder={settings.searchPlaceholder}/></div>
        </div>
        {settings.pageVisibilityUnavailable&&<p className="stat-warning" role="status">تعذر تحميل أقسام المنصة مؤقتًا. أعد تحديث الصفحة للمحاولة.</p>}
        {(showStories||visible('magazine')||visible('statistics'))&&<><div className={styles.curatedHeading}><span>من 967، إليك.</span><span>حكاية، قراءة، ورقم يفتح سؤالًا جديدًا.</span></div>
        <div className={styles.mosaic} data-flexible={!(showLead&&visible('magazine')&&visible('statistics'))||undefined} aria-label="مختارات من محتوى المنصة">
          {showLead&&<div className={styles.leadSlot}><HomeStoryCard kind={content.leadKind} item={lead} featured/></div>}
          {visible('magazine')&&<div className={styles.issueSlot}><HomeIssueCard issue={content.issue}/></div>}
          {(visible(secondaryKind==='video'?'works':'debates')||visible('statistics'))&&<div className={styles.sideStack}>{visible(secondaryKind==='video'?'works':'debates')&&<HomeStoryCard kind={secondaryKind} item={secondary}/>} {visible('statistics')&&<HomeIndicatorCard indicator={content.highlights[0]} compact/>}</div>}
        </div></>}
      </div>
    </section>

    <section className={styles.discovery} aria-labelledby="explore-title"><div className="container">
      <div className={styles.smallHeading}><h2 id="explore-title">فضولك، يحدد البداية.</h2><Link href="/search">ابحث في كل المنصة <ArrowLeft size={16} aria-hidden="true"/></Link></div>
      <div className={styles.destinations}>{destinations.map(({href,title,text,icon:Icon,tone}) => <Link key={href} href={href} className={styles.destination} data-tone={tone}><Icon size={25} strokeWidth={1.6} aria-hidden="true"/><div><h3>{title}</h3><span>{text}</span></div><ArrowUpLeft className={styles.destinationArrow} size={15} aria-hidden="true"/></Link>)}</div>
    </div></section>

    {moreContent && <section className={styles.moreContent} aria-labelledby="latest-title"><div className="container">
      <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>من المكتبة</span><h2 id="latest-title">حكايات أخرى، تستحق وقتك.</h2></div><Link href="/works" className={styles.sectionLink}>تصفح الأعمال <ArrowLeft size={17} aria-hidden="true"/></Link></div>
      <div className={styles.moreGrid}>{content.moreWorks.map(work => <HomeStoryCard kind="video" item={work} featured key={'work-'+work.id}/>)}{content.moreIssues.map(issue => <HomeIssueCard issue={issue} compact key={'issue-'+issue.id}/>)}</div>
    </div></section>}

    {visible('statistics')&&<section className={styles.numbers} aria-labelledby="numbers-title"><div className={`container ${styles.numbersGrid}`}>
      <div className={styles.numbersIntro}><span className={styles.sectionKicker}>اليمن بالأرقام</span><h2 id="numbers-title">لنفهم الواقع،<br/>نقترب من أرقامه.</h2><p>مؤشرات وطنية، مع سنة القياس والمصدر. وراء كل رقم، مساحة للفهم.</p><Link href="/yemen-in-numbers" className={styles.lightLink}>استكشف المؤشرات <ArrowLeft size={17} aria-hidden="true"/></Link><Link href="/yemen-ranking" className={styles.rankingLink}>أين يقف اليمن عالميًا؟ <ArrowUpLeft size={17} aria-hidden="true"/></Link></div>
      <div className={styles.numberCards}>{remainingIndicators.length ? remainingIndicators.map(indicator => <HomeIndicatorCard indicator={indicator} key={indicator.id}/>) : <Link href="/yemen-in-numbers" className={styles.numberInvitation}><ChartNoAxesCombined size={36} aria-hidden="true"/><h3>ابدأ بسؤال، واكتشف المؤشرات.</h3><span>المجالات والمصادر وسنوات القياس <ArrowUpLeft size={18} aria-hidden="true"/></span></Link>}</div>
    </div></section>}

    {(visible('products')||visible('professionals')||visible('atlas'))&&<section className={styles.community} aria-labelledby="community-title"><div className="container">
      <div className={styles.sectionHeading}><div><span className={styles.sectionKicker}>من الناس، ومن البلد</span><h2 id="community-title">أشياء تُصنع. ومهارات تُنجز.</h2></div><span className={styles.sectionNote}>اكتشف الأدلة، واقترب ممن حولك.</span></div>
      <div className={styles.communityGrid}>{visible('products')&&<HomeDirectoryCard kind="product" item={content.company}/>} {visible('professionals')&&<HomeDirectoryCard kind="profile" item={content.professional}/>}</div>
      <Link href="/yemen-map" className={styles.atlasLink}><Compass size={21} aria-hidden="true"/><span>وكل مكان، له حكاية.<strong>استكشف محافظات اليمن وأماكنه وشخصياته.</strong></span><ArrowUpLeft size={20} aria-hidden="true"/></Link>
    </div></section>}

    {visible('contribute')&&<section className={styles.participate} id="contact"><div className={`container ${styles.participateInner}`}><div><span>{settings.participationEyebrow}</span><h2>{settings.participationTitle}</h2></div><Link href="/contribute">{settings.participationButtonLabel}<ArrowUpLeft size={20} aria-hidden="true"/></Link><YemeniMotif className={styles.participationMotif}/></div></section>}

    <section className={styles.about} aria-label="عن المبادرة ومشاريعها"><div className={`container ${styles.aboutGrid}`}>
      <details id="about" className={styles.disclosure}><summary><div><span>تعرّف على 967</span><h2>مساحة تتسع لنا جميعًا.</h2></div><ChevronDown size={21} aria-hidden="true"/></summary><div className={styles.disclosureBody}><h3>{settings.aboutTitle}</h3><p>{settings.aboutDescription}</p><div className={styles.aboutTags}>{settings.aboutTags.map((tag,index) => <span key={index}>{tag}</span>)}</div><h3>رؤيتنا ورسالتنا</h3><p>{settings.aboutVision}</p><h3>مجالات عملنا</h3><p>{settings.aboutFields}</p><Link href="/about" className={styles.sectionLink}>المزيد عن المبادرة <ArrowUpLeft size={16} aria-hidden="true"/></Link></div></details>
      <details id="projects" className={styles.disclosure}><summary><div><span>من الفكرة إلى الأثر</span><h2>مسارات نعمل على تطويرها.</h2></div><ChevronDown size={21} aria-hidden="true"/></summary><div className={styles.disclosureBody}>{[
        {icon:MapPin,title:'967 في الشارع',status:'مخطط له',text:'لقاءات واستطلاعات ميدانية للاستماع إلى تجارب الناس وأسئلتهم.'},
        {icon:MessagesSquare,title:'مناظرات 967',status:settings.debatesProjectStatus,href:'/debates',text:'حوارات منظمة تتيح للرؤى المختلفة مساحة للفهم والنقاش.'},
        {icon:Handshake,title:'مشاريع مجتمعية',status:'مخطط لها',text:'مبادرات في المعرفة والخدمات والمشاركة تُعلن عند إطلاقها.'},
      ].filter(item=>!item.href||pageIsVisible(item.href,settings.pageVisibility)).map(({icon:Icon,title,status,text,href}) => <article className={styles.project} key={title}><Icon size={22} aria-hidden="true"/><div><h3>{href ? <Link href={href}>{title}</Link> : title}</h3><p>{text}</p><span>{status}</span></div></article>)}</div></details>
    </div></section>
  </div>;
}
