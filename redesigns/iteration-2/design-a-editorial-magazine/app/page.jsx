import NextLink from 'next/link';
import {ChevronDown, Compass, Handshake, MapPin, MessagesSquare, Search} from 'lucide-react';
import SearchForm from '@/components/SearchForm';
import HomeSmartStart from '@/components/home/HomeSmartStart';
import Resilient from '@/components/front/Resilient';
import {LeadTile, IssueTile, DebateTile, NumberTile, Invitation, SchoolBlock, KnowledgeBento, GamesArcade, DiscoverRail, DataCard, CompanyCard, ProfessionalCard} from '@/components/front/FrontSections';
import {utcDay, dailyGameUrl, dailyGameForDate, DAILY_GAME_TITLES} from '@/lib/dailyGame';
import {getLatestWorks, getLatestIssues, getRecentIndicators, getRecentCompanies, getRecentProfessionals, getSiteSettings} from '@/lib/data';
import {getDebateCatalog} from '@/lib/debateServer';
import {selectHomeContent, homeProjections} from '@/lib/homeContent';
import {visibleHomeKnowledge} from '@/lib/homeKnowledge';
import {pageIsVisible, sectionIsVisible} from '@/lib/pageVisibility';
import {formatArabicDate} from '@/lib/format';
import {pageMetadata} from '@/lib/seo';
import '@/app/foundation/editorial.css';
import styles from './front.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'967 | اليمن، أقرب إليك', description:'مساحة يمنية مفتوحة للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.', path:'/'});

// Every source is bounded (a handful of rows) and settles on its own:
// one failed dataset empties one slot, never the page.
const settle = promise => promise.then(data => ({data, failed:false}), () => ({data:null, failed:true}));

export default async function Home() {
  const settings = await getSiteSettings();
  const [works, issues, indicators, debates, companies, professionals] = await Promise.all([
    settle(getLatestWorks(homeProjections.works, 4)),
    settle(getLatestIssues(homeProjections.issues, 1)),
    settle(getRecentIndicators(4)),
    getDebateCatalog().then(result => ({data:result.debates, failed:!result.available}), () => ({data:null, failed:true})),
    settle(getRecentCompanies(homeProjections.companies, 6)),
    settle(getRecentProfessionals(homeProjections.professionals, 6)),
  ]);
  const content = selectHomeContent({works:works.data||[], issues:issues.data||[], indicators:indicators.data||[], debates:debates.data||[], companies:companies.data||[], professionals:professionals.data||[]});
  const visible = id => sectionIsVisible(id, settings.pageVisibility);
  const Link = ({href, ...props}) => pageIsVisible(href, settings.pageVisibility, settings.contentPages||[]) ? <NextLink href={href} {...props}/> : null;
  const knowledgeLinks = visibleHomeKnowledge(settings.pageVisibility, settings.contentPages||[]);
  const today = utcDay();
  // Same lead selection as before: the work when it has a picture, otherwise the debate.
  const leadIsDebate = content.leadKind === 'debate';
  const highlightList = visible('statistics') ? (indicators.data || []) : [];
  const [featuredNumber, ...moreNumbers] = highlightList;
  const hasVisibleDirectories = visible('products') || visible('professionals');
  const showFeatured = visible('works') || visible('debates') || visible('magazine') || visible('statistics');

  return <div className={`ed-page ${styles.front}`}>
    {/* 1 · Hero */}
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroMesh} aria-hidden="true"><span/><span/><span/></div>
      <div className={styles.heroMark} aria-hidden="true">967</div>
      <div className={`ed-wrap ${styles.heroInner}`}>
        <p className={styles.heroTop}><span className="ed-pill"><span className={styles.liveDot}/>{settings.heroEyebrow}</span><time className={styles.heroDate} dateTime={today}>{formatArabicDate(new Date(), {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</time></p>
        <h1 id="home-title" className={styles.heroTitle}>{settings.heroTitle}{settings.heroHighlight && <> <span className={styles.heroHighlight}>{settings.heroHighlight}</span></>}</h1>
        <p className={styles.heroText}>{settings.heroDescription}</p>
        <div className={styles.heroSearch}><SearchForm placeholder={settings.searchPlaceholder}/></div>
        {settings.pageVisibilityUnavailable && <p className="ed-unavailable" role="status">تعذر تحميل أقسام المنصة مؤقتًا. أعد تحديث الصفحة للمحاولة.</p>}
      </div>
    </section>

    {/* 2 · من أين تحب أن تبدأ؟ (guest cards + sign-in hint, or the member's resume state) */}
    <div className={`ed-wrap ${styles.start}`}><HomeSmartStart initialDate={utcDay()} knowledgeHref={knowledgeLinks[0]?.href||'/search'}/></div>

    {/* 3 · من 967، إليك. */}
    {showFeatured && <section className={`${styles.section} ed-reveal`} aria-labelledby="featured-title"><div className="ed-wrap">
      <div className="ed-section-head"><div><span className="ed-kicker">مختارات من محتوى المنصة</span><h2 id="featured-title">من 967، إليك.</h2><p>حكاية، قراءة، ورقم يفتح سؤالًا جديدًا.</p></div></div>
      <div className={styles.bento}>
        {visible(leadIsDebate ? 'debates' : 'works') && <div className={styles.slotLead}><Resilient name="home-lead" label="تعذّر عرض القصة الرئيسية الآن.">{leadIsDebate ? (content.debate ? <DebateTile item={content.debate}/> : <Invitation kind="debate" failed={debates.failed}/>) : (content.work ? <LeadTile item={content.work}/> : <Invitation kind="video" failed={works.failed}/>)}</Resilient></div>}
        {visible('magazine') && <div className={styles.slotIssue}><Resilient name="home-issue" quiet>{content.issue ? <IssueTile issue={content.issue}/> : <Invitation kind="issue" failed={issues.failed}/>}</Resilient></div>}
        {visible('statistics') && <div className={styles.slotNumber}><Resilient name="home-number" quiet>{featuredNumber ? <NumberTile indicator={featuredNumber}/> : <Invitation kind="indicator" failed={indicators.failed}/>}</Resilient></div>}
        {visible(leadIsDebate ? 'works' : 'debates') && <div className={styles.slotSecond}><Resilient name="home-second" quiet>{leadIsDebate ? (content.work ? <LeadTile item={content.work}/> : <Invitation kind="video" failed={works.failed}/>) : (content.debate ? <DebateTile item={content.debate}/> : <Invitation kind="debate" failed={debates.failed}/>)}</Resilient></div>}
      </div>
    </div></section>}

    {/* 4 · مدرسة 967 */}
    {visible('school')&&<section id="home-school" className={`${styles.section} ed-reveal`} aria-labelledby="home-school-title"><div className="ed-wrap"><SchoolBlock/></div></section>}

    {/* 5 · استكشف المعرفة */}
    {knowledgeLinks.length > 0 && <section id="explore-knowledge" className={`${styles.section} ed-reveal`} aria-labelledby="home-knowledge-title"><div className="ed-wrap">
      <div className="ed-section-head"><div><span className="ed-kicker">المعرفة / موسوعة 967</span><h2 id="home-knowledge-title">استكشف المعرفة</h2><p>تاريخٌ نفهمه، وأماكن نكتشفها، وشخصيات نتعرّف إليها، وأرقام تضع اليمن في سياقه.</p></div><Link href="/search" className="ed-link">ابحث في المعرفة</Link></div>
      <KnowledgeBento items={knowledgeLinks}/>
    </div></section>}

    {/* 6 · ألعاب 967 */}
    {visible('games')&&<section id="home-games" className={`${styles.section} ed-reveal`} aria-labelledby="home-games-title"><div className="ed-wrap"><GamesArcade dailyHref={dailyGameUrl(today)} dailyTitle={DAILY_GAME_TITLES[dailyGameForDate(today)]}/></div></section>}

    {/* 7 · فضولك، يحدد البداية. */}
    <section className={`${styles.section} ed-reveal`} aria-labelledby="explore-title"><div className="ed-wrap">
      <div className="ed-section-head"><div><span className="ed-kicker">ابدأ من فضولك</span><h2 id="explore-title">فضولك، يحدد البداية.</h2></div><Link href="/search" className="ed-link"><Search size={16} aria-hidden="true"/> ابحث في كل المنصة</Link></div>
      <DiscoverRail Link={Link}/>
    </div></section>

    {/* 8 · لنفهم الواقع، نقترب من أرقامه. */}
    {visible('statistics')&&<section className={`${styles.section} ed-reveal`} aria-labelledby="numbers-title"><div className="ed-wrap"><div className={styles.data}>
      <div className={styles.dataIntro}>
        <p className={styles.dataKicker}>اليمن بالأرقام</p>
        <h2 id="numbers-title" className={styles.blockTitle}>لنفهم الواقع،<br/>نقترب من أرقامه.</h2>
        <p className={styles.dataText}>مؤشرات وطنية، مع سنة القياس والمصدر. وراء كل رقم، مساحة للفهم.</p>
        <div className={styles.dataLinks}><Link href="/yemen-in-numbers" className={styles.dataPrimary}>استكشف المؤشرات <span aria-hidden="true">←</span></Link><Link href="/yemen-ranking" className={styles.dataGhost}>أين يقف اليمن عالميًا؟ <span aria-hidden="true">←</span></Link></div>
      </div>
      <div className={styles.dataCards}>{moreNumbers.length ? moreNumbers.map(indicator => <Resilient key={indicator.id} name="home-data" quiet><DataCard indicator={indicator}/></Resilient>) : <Link href="/yemen-in-numbers" className={styles.dataEmpty}><Compass size={32} aria-hidden="true"/><strong>{indicators.failed ? 'تعذّر تحميل المؤشرات الآن.' : 'ابدأ بسؤال، واكتشف المؤشرات.'}</strong><span>المجالات والمصادر وسنوات القياس</span></Link>}</div>
    </div></div></section>}

    {/* 9 · أشياء تُصنع. ومهارات تُنجز. */}
    {(visible('products')||visible('professionals')||visible('atlas'))&&<section className={`${styles.section} ed-reveal`} aria-labelledby="community-title"><div className="ed-wrap">
      <div className="ed-section-head"><div><span className="ed-kicker">من الناس، ومن البلد</span><h2 id="community-title">{hasVisibleDirectories?'أشياء تُصنع. ومهارات تُنجز.':'كل مكان في اليمن، له حكاية.'}</h2><p>{hasVisibleDirectories?'اكتشف الأدلة، واقترب ممن حولك.':'تعرّف على المحافظات والأماكن والشخصيات.'}</p></div></div>
      <div className={styles.community}>
        {visible('products')&&<Resilient name="home-company" quiet><CompanyCard item={content.company}/></Resilient>}
        {visible('professionals')&&<Resilient name="home-professional" quiet><ProfessionalCard item={content.professional}/></Resilient>}
        {visible('atlas')&&<Link href="/yemen-map" className={styles.atlas}><span className={styles.atlasMap} aria-hidden="true"><MapPin size={22}/></span><span className={styles.atlasText}>وكل مكان، له حكاية.<strong>استكشف محافظات اليمن وأماكنه وشخصياته.</strong></span><span aria-hidden="true">←</span></Link>}
      </div>
    </div></section>}

    {/* 10 · لديك حكاية، معلومة، أو فكرة؟ نسمعك. */}
    {visible('contribute')&&<section className={`${styles.section} ed-reveal`} id="contact" aria-labelledby="contact-title"><div className="ed-wrap"><div className={styles.invite}>
      <div className={styles.inviteMark} aria-hidden="true">967</div>
      <p className={styles.inviteKick}>{settings.participationEyebrow}</p>
      <h2 id="contact-title" className={styles.inviteTitle}>{settings.participationTitle}</h2>
      <Link href="/contribute" className="ed-button" data-variant="light">{settings.participationButtonLabel} <span aria-hidden="true">←</span></Link>
    </div></div></section>}

    {/* 11 · عن المبادرة ومشاريعها */}
    <section className={`${styles.section} ed-reveal`} aria-label="عن المبادرة ومشاريعها"><div className={`ed-wrap ${styles.about}`}>
      <details id="about" className={styles.fold}><summary><span><span className="ed-kicker">تعرّف على 967</span><h2>مساحة تتسع لنا جميعًا.</h2></span><ChevronDown size={22} aria-hidden="true"/></summary><div className={styles.foldBody}>
        <h3>{settings.aboutTitle}</h3><p>{settings.aboutDescription}</p>
        {settings.aboutTags?.length > 0 && <ul className={styles.tags}>{settings.aboutTags.map((tag, index) => <li key={index}>{tag}</li>)}</ul>}
        <h3>رؤيتنا ورسالتنا</h3><p>{settings.aboutVision}</p><h3>مجالات عملنا</h3><p>{settings.aboutFields}</p>
        <Link href="/about" className="ed-link">المزيد عن المبادرة</Link>
      </div></details>
      <details id="projects" className={styles.fold}><summary><span><span className="ed-kicker">من الفكرة إلى الأثر</span><h2>مسارات نعمل على تطويرها.</h2></span><ChevronDown size={22} aria-hidden="true"/></summary><div className={styles.foldBody}>
        <ul className={styles.projects}>{[
          {icon:MapPin, title:'967 في الشارع', status:'مخطط له', text:'لقاءات واستطلاعات ميدانية للاستماع إلى تجارب الناس وأسئلتهم.'},
          {icon:MessagesSquare, title:'مناظرات 967', status:settings.debatesProjectStatus, href:'/debates', text:'حوارات منظمة تتيح للرؤى المختلفة مساحة للفهم والنقاش.'},
          {icon:Handshake, title:'مشاريع مجتمعية', status:'مخطط لها', text:'مبادرات في المعرفة والخدمات والمشاركة تُعلن عند إطلاقها.'},
        ].filter(item => !item.href || pageIsVisible(item.href, settings.pageVisibility)).map(({icon:Icon, title, status, text, href}) => <li key={title}><span className={styles.projectIcon}><Icon size={20} aria-hidden="true"/></span><div><h3>{href ? <Link href={href}>{title}</Link> : title}</h3><p>{text}</p>{status && <span className="ed-status" data-tone="neutral">{status}</span>}</div></li>)}</ul>
      </div></details>
    </div></section>
  </div>;
}
