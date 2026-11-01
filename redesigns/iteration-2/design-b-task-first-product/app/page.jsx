import {Suspense} from 'react';
import Link from 'next/link';
import {ArrowLeft, ArrowUpLeft, ChartNoAxesCombined, Compass, Search} from 'lucide-react';
import TaskLauncher from '@/components/wayfinder/TaskLauncher';
import ContinueSlot from '@/components/wayfinder/ContinueSlot';
import Qamariya from '@/components/wayfinder/Qamariya';
import {AboutProjects, CompanyCard, CuriosityDoors, DebatePick, GamesBlock, IssuePick, KnowledgeBlock, LeadWork, NumberCard, ProfessionalCard, SchoolBlock, SectionHead, SmartStartGuest} from '@/components/wayfinder/HomeSections';
import SectionBoundary, {SectionUnavailable} from '@/components/ui/SectionBoundary';
import {dailyGameForDate, dailyGameUrl, utcDay} from '@/lib/dailyGame';
import {getFeaturedCompany, getFeaturedProfessional, getLatestIssues, getLatestWorks, getSiteSettings, getStatIndicators} from '@/lib/data';
import {getDebateCatalog} from '@/lib/debateServer';
import {selectHomeContent} from '@/lib/homeContent';
import {visibleHomeKnowledge} from '@/lib/homeKnowledge';
import {contentPagePath} from '@/lib/contentPages';
import {pageIsVisible, sectionIsVisible} from '@/lib/pageVisibility';
import {pageMetadata} from '@/lib/seo';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'967 | اليمن، أقرب إليك', description:'مساحة يمنية مفتوحة للمعرفة والإعلام والثقافة والبيانات والمشاركة المجتمعية.', path:'/'});

// Design B, iteration 2 — the full home, as a bento.
// Every section of the original home is here (see docs/redesign/design-b/README.md,
// content-parity checklist). Data sections stream in their own Suspense and
// error boundaries; one failed source never takes the page down.
const SUGGESTIONS = ['عدد السكان', 'مملكة سبأ', 'خط المسند', 'تعز', 'الجامعات'];
const LEAD_SIZES = '(max-width:700px) 92vw, (max-width:1100px) 60vw, 640px';

// Optional loaders never reject: a failed source becomes an explicit section state.
const settle = promise => promise.then(value => ({ok: true, value}), () => ({ok: false, value: null}));
const highlightsOf = indicators => indicators.filter(item => item.latestValue).sort((a, b) => Number(b.latestValue.year) - Number(a.latestValue.year)).slice(0, 3);

function SkeletonGrid({count = 4, className}) {
  return <div className={className} aria-hidden="true">{Array.from({length: count}, (_, index) => <div key={index} className={styles.skeleton}/>)}</div>;
}

async function FeaturedPicks({show}) {
  const [works, issues, catalog, indicators] = await Promise.all([
    show.works ? settle(getLatestWorks(4)) : {ok: true, value: []},
    show.magazine ? settle(getLatestIssues(1)) : {ok: true, value: []},
    show.debates ? settle(getDebateCatalog()) : {ok: true, value: {debates: []}},
    show.statistics ? settle(getStatIndicators()) : {ok: true, value: []},
  ]);
  const content = selectHomeContent({works: works.value || [], issues: issues.value || [], debates: catalog.value?.debates || [], indicators: indicators.value || []});
  const failed = [!works.ok && 'الأعمال الإعلامية', !issues.ok && 'أعداد المجلة', show.debates && (!catalog.ok || catalog.value?.available === false) && 'المناظرات', !indicators.ok && 'المؤشرات'].filter(Boolean);
  const population = highlightsOf(indicators.value || [])[0];
  // The lead follows the original editorial rule (video with an image first), the other kind follows.
  const lead = content.leadKind === 'debate' ? null : content.work;
  const debate = show.debates ? content.debate : null;
  const leadDebate = content.leadKind === 'debate' && debate;
  const secondWork = content.leadKind === 'debate' ? content.work : null;
  if (!lead && !debate && !content.issue && !population) return failed.length ? <SectionUnavailable title="المختارات" message={'تعذر تحميل: ' + failed.join('، ') + '. بقية الصفحة تعمل بشكل طبيعي.'}/> : <p className={styles.empty}>لا توجد مواد منشورة بعد. <Link href="/contribute?type=اقتراح%20موضوع">اقترح موضوعاً</Link></p>;
  return <>
    <div className={styles.picks}>
      {lead && show.works && <div className={styles.slotLead}><LeadWork work={lead} sizes={LEAD_SIZES}/></div>}
      {leadDebate && <div className={styles.slotLead}><DebatePick debate={debate}/></div>}
      {content.issue && show.magazine && <div className={styles.slotIssue}><IssuePick issue={content.issue}/></div>}
      {population && show.statistics && <div className={styles.slotNumber}><NumberCard indicator={population}/></div>}
      {debate && !leadDebate && <div className={styles.slotDebate}><DebatePick debate={debate}/></div>}
      {secondWork && show.works && <div className={styles.slotDebate}><LeadWork work={secondWork} sizes="(max-width:700px) 92vw, 420px"/></div>}
    </div>
    {failed.length > 0 && <p className={styles.partial} role="status">تعذر تحميل {failed.join('، ')} الآن؛ نعرض المتاح فقط.</p>}
  </>;
}

async function NumbersPair() {
  const result = await settle(getStatIndicators());
  if (!result.ok) return <SectionUnavailable title="المؤشرات" message="تعذر تحميل المؤشرات الوطنية الآن. لم تُعرض أي قيمة غير موثقة بدلاً منها."/>;
  const remaining = highlightsOf(result.value).slice(1);
  if (!remaining.length) return <Link href="/yemen-in-numbers" className={styles.invite}><ChartNoAxesCombined size={34} aria-hidden="true"/><strong>ابدأ بسؤال، واكتشف المؤشرات.</strong><span>المجالات والمصادر وسنوات القياس</span></Link>;
  return <div className={styles.numberCards}>{remaining.map(indicator => <NumberCard key={indicator.id} indicator={indicator} variant="dark"/>)}</div>;
}

async function Community({showProducts, showProfessionals}) {
  const [company, professional] = await Promise.all([
    showProducts ? settle(getFeaturedCompany()) : {ok: true, value: null},
    showProfessionals ? settle(getFeaturedProfessional()) : {ok: true, value: null},
  ]);
  if ((showProducts && !company.ok) && (!showProfessionals || !professional.ok)) return <SectionUnavailable title="الأدلة" message="تعذر تحميل دليل المنتجات الآن. يمكنك فتح الدليل مباشرة."/>;
  return <div className={styles.communityGrid} data-single={!showProfessionals || undefined}>
    {showProducts && <CompanyCard item={company.value}/>}
    {showProfessionals && <ProfessionalCard item={professional.value}/>}
  </div>;
}

export default async function Home() {
  const settings = await getSiteSettings();
  const visible = id => sectionIsVisible(id, settings.pageVisibility);
  const isVisible = href => pageIsVisible(href.split('?')[0], settings.pageVisibility, settings.contentPages || []);
  const contentLinks = (settings.contentPages || []).filter(page => isVisible(contentPagePath(page))).map(page => ({slug: page.slug, title: page.title, href: contentPagePath(page)}));
  const knowledgeLinks = visibleHomeKnowledge(settings.pageVisibility, settings.contentPages || []);
  const show = {works: visible('works'), debates: visible('debates'), magazine: visible('magazine'), statistics: visible('statistics')};
  const showPicks = show.works || show.debates || show.magazine || show.statistics;
  const today = utcDay();
  const hasDirectories = visible('products') || visible('professionals');

  return <div className={`ui-page ${styles.page}`}>
    <div className="ui-wrap">
      {/* 1. Hero */}
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.tagline}><span aria-hidden="true"/>{settings.heroEyebrow}</p>
          <h1 id="home-title">{settings.heroTitle}{settings.heroHighlight && <> <span>{settings.heroHighlight}</span></>}</h1>
          <p className={styles.intro}>{settings.heroDescription}</p>
          <form action="/search" role="search" className={styles.search}>
            <label htmlFor="platform-search" className="sr-only">ابحث في منصة 967</label>
            <Search size={22} aria-hidden="true"/>
            <input id="platform-search" name="q" type="search" maxLength={150} placeholder={settings.searchPlaceholder || 'ما الذي تريد معرفته عن اليمن؟'} autoComplete="off"/>
            <button type="submit">ابحث <ArrowLeft size={18} aria-hidden="true"/></button>
          </form>
          <ul className={styles.suggest} aria-label="عمليات بحث مقترحة">
            {SUGGESTIONS.map(query => <li key={query}><Link href={'/search?q=' + encodeURIComponent(query)}>{query}</Link></li>)}
          </ul>
          {settings.pageVisibilityUnavailable && <p className={styles.warning} role="status">تعذر تحميل أقسام المنصة مؤقتًا. أعد تحديث الصفحة للمحاولة.</p>}
        </div>
        <div className={styles.heroArt} aria-hidden="true"><Qamariya className={styles.qamariya}/></div>
      </section>

      {/* Six-verb dock (Design B signature) */}
      <TaskLauncher isVisible={isVisible} contentLinks={contentLinks}/>

      {/* 2. Smart start */}
      <section className={`${styles.block} ui-reveal`} aria-labelledby="home-start-title">
        <SectionHead kicker="مساحتك في 967" title="من أين تحب أن تبدأ؟" id="home-start-title" text="تعلّم شيئًا جديدًا، واستكشف اليمن، أو جرّب تحديًا قصيرًا."/>
        <ContinueSlot initialDate={today} knowledgeHref={knowledgeLinks[0]?.href || '/search'}>
          <SmartStartGuest showSchool={visible('school')} showGames={visible('games')} showContribute={visible('contribute')} knowledgeHref={knowledgeLinks[0]?.href || '/search'}/>
        </ContinueSlot>
      </section>

      {/* 3. Featured picks */}
      {showPicks && <section className={`${styles.block} ui-reveal`} aria-labelledby="picks-title">
        <SectionHead kicker="مختارات" title="من 967، إليك." id="picks-title" text="حكاية، قراءة، ورقم يفتح سؤالًا جديدًا."/>
        <SectionBoundary name="home-picks" title="المختارات"><Suspense fallback={<SkeletonGrid count={4} className={styles.picks}/>}><FeaturedPicks show={show}/></Suspense></SectionBoundary>
      </section>}

      {/* 4. School */}
      {visible('school') && <SchoolBlock/>}

      {/* 5. Knowledge */}
      <KnowledgeBlock items={knowledgeLinks}/>

      {/* 6. Games */}
      {visible('games') && <GamesBlock dailyGame={dailyGameForDate(today)} dailyHref={dailyGameUrl(today)}/>}

      {/* 7. Curiosity doors */}
      <CuriosityDoors isVisible={isVisible}/>

      {/* 8. Numbers */}
      {visible('statistics') && <section className={`${styles.block} ${styles.numbers} ui-reveal`} aria-labelledby="numbers-title">
        <div className={styles.numbersIntro}>
          <p className={styles.kickerLight}>اليمن بالأرقام</p>
          <h2 id="numbers-title">لنفهم الواقع،<br/>نقترب من أرقامه.</h2>
          <p>مؤشرات وطنية، مع سنة القياس والمصدر. وراء كل رقم، مساحة للفهم.</p>
          <div className={styles.numbersLinks}>
            <Link href="/yemen-in-numbers" className={styles.lightBtn}>استكشف المؤشرات <ArrowLeft size={17} aria-hidden="true"/></Link>
            {isVisible('/yemen-ranking') && <Link href="/yemen-ranking" className={styles.ghostBtn}>أين يقف اليمن عالميًا؟ <ArrowUpLeft size={17} aria-hidden="true"/></Link>}
          </div>
        </div>
        <SectionBoundary name="home-numbers" title="المؤشرات"><Suspense fallback={<SkeletonGrid count={2} className={styles.numberCards}/>}><NumbersPair/></Suspense></SectionBoundary>
      </section>}

      {/* 9. Community and products */}
      {(hasDirectories || visible('atlas')) && <section className={`${styles.block} ui-reveal`} aria-labelledby="community-title">
        <SectionHead kicker="من الناس، ومن البلد" title={hasDirectories ? 'أشياء تُصنع. ومهارات تُنجز.' : 'كل مكان في اليمن، له حكاية.'} id="community-title" text={hasDirectories ? 'اكتشف الأدلة، واقترب ممن حولك.' : 'تعرّف على المحافظات والأماكن والشخصيات.'}/>
        <div className={styles.community}>
          {hasDirectories && <SectionBoundary name="home-community" title="الأدلة"><Suspense fallback={<SkeletonGrid count={1} className={styles.communityGrid}/>}><Community showProducts={visible('products')} showProfessionals={visible('professionals')}/></Suspense></SectionBoundary>}
          {visible('atlas') && <Link href="/yemen-map" className={styles.atlas}><span className={styles.atlasIcon} aria-hidden="true"><Compass size={26}/></span><span><small>وكل مكان، له حكاية.</small><strong>استكشف محافظات اليمن وأماكنه وشخصياته.</strong></span><ArrowUpLeft size={22} aria-hidden="true"/></Link>}
        </div>
      </section>}

      {/* 10. Contribute */}
      {visible('contribute') && <section className={`${styles.join} ui-reveal`} id="contact" aria-labelledby="join-title">
        <div><p className={styles.kickerLight}>{settings.participationEyebrow}</p><h2 id="join-title">{settings.participationTitle}</h2></div>
        <Link href="/contribute" className={styles.joinBtn}>{settings.participationButtonLabel}<ArrowUpLeft size={20} aria-hidden="true"/></Link>
      </section>}

      {/* 11. About & projects */}
      <AboutProjects settings={settings} isVisible={isVisible}/>
    </div>
  </div>;
}
