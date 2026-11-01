import Link from 'next/link';
import {ArrowLeft, ArrowUpLeft, BarChart3, BookOpen, BrainCircuit, CalendarDays, ChartNoAxesCombined, Compass, Film, Flame, Gamepad2, GraduationCap, Handshake, Landmark, LogIn, MapPin, MapPinned, MessagesSquare, Package, PenTool, Play, ScrollText, ShieldCheck, Sparkles, Swords, Telescope, Trophy, UserRound, UsersRound, Zap} from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import SaveForLater from '@/components/reading/SaveForLater';
import Sparkline from './Sparkline';
import {workThumbnail} from '@/lib/media';
import {formatArabicDate, formatNumber, formatYear} from '@/lib/format';
import {DEBATE_STAGES, httpsUrl, publicRecordingAvailable, recordingOverdue} from '@/lib/debates';
import {valueStatusLabels} from '@/lib/yemenNumbers';
import {sourceLabel} from '@/lib/indicatorPresentation';
import {DAILY_GAME_TITLES} from '@/lib/dailyGame';
import s from './HomeSections.module.css';

// Every home section from the original page, in the Design B bento language.
// Server components; only SaveForLater and SafeImage hydrate.

export function SectionHead({kicker, title, id, text, action, tone}) {
  return <div className={s.head} data-tone={tone}>
    <div>{kicker && <p className={s.kicker}>{kicker}</p>}<h2 id={id}>{title}</h2>{text && <p className={s.headText}>{text}</p>}</div>
    {action}
  </div>;
}

/* ---------- 2. Smart start (guest state; members get a personalised swap) ---------- */
export function SmartStartGuest({showSchool, showGames, showContribute, knowledgeHref}) {
  const cards = [
    showSchool && {href: '/school', tone: 'learn', icon: GraduationCap, title: 'ابدأ بالتعلم', text: 'دروس تفاعلية من الكتابة إلى العلوم والتفكير'},
    {href: knowledgeHref, tone: 'explore', icon: Compass, title: 'اكتشف اليمن', text: 'تاريخ وشخصيات وخرائط وبيانات موثقة'},
    showGames ? {href: '/games', tone: 'play', icon: Gamepad2, title: 'جرّب ألعاب 967', text: 'تعلم بطريقة ممتعة، واستكشف التحديات اليومية'}
      : showContribute && {href: '/contribute', tone: 'join', icon: BookOpen, title: 'شارك في المبادرة', text: 'تعرف على فرص التواصل والمساهمة'},
  ].filter(Boolean);
  return <>
    <ul className={s.startGrid}>{cards.map(({href, tone, icon: Icon, title, text}) => <li key={href}>
      <Link href={href} className={s.startCard} data-tone={tone}>
        <span className={s.startIcon} aria-hidden="true"><Icon size={24} strokeWidth={1.8}/></span>
        <div className={s.startCopy}><h3 className={s.startTitle}>{title}</h3><small>{text}</small></div>
        <ArrowLeft className={s.nudge} size={20} aria-hidden="true"/>
      </Link>
    </li>)}</ul>
    <p className={s.signin}><span><LogIn size={16} aria-hidden="true"/> سجّل الدخول لتظهر لك متابعة التعلم ومحفوظات حسابك.</span><Link href="/login">تسجيل الدخول <ArrowLeft size={14} aria-hidden="true"/></Link></p>
  </>;
}

/* ---------- 3. Featured picks ---------- */
function Fallback({icon: Icon, label}) {
  return <span className={s.mediaFallback} aria-hidden="true"><Icon size={34} strokeWidth={1.4}/><span>{label}</span></span>;
}

export function LeadWork({work, sizes}) {
  const href = work.debate_slug ? '/debates/' + encodeURIComponent(work.debate_slug) : '/works/' + encodeURIComponent(work.slug);
  const thumb = workThumbnail(work);
  return <article className={`${s.pick} ${s.pickLead}`} data-tone="read">
    <div className={s.pickMedia}><Fallback icon={Film} label={work.category || 'من أعمال 967'}/>{thumb && <SafeImage src={thumb} fill quality={45} sizes={sizes} className={s.cover}/>}<span className={s.scrim} aria-hidden="true"/></div>
    <div className={s.pickOverlay}>
      <p className={s.chips}><span className={s.chipStrong}><Play size={13} fill="currentColor" aria-hidden="true"/>حكايات 967</span><span>{work.category}</span>{work.platform && <span>{work.platform}</span>}</p>
      <h3><Link href={href} className={s.stretch}>{work.title}</Link></h3>
      {work.summary && <p className={s.pickSummary}>{work.summary}</p>}
      <span className={s.verb} aria-hidden="true">اكتشف العمل <ArrowUpLeft size={16}/></span>
    </div>
    {work.slug && !work.debate_slug && <div className={s.save}><SaveForLater compact item={{kind: 'work', href, title: work.title}}/></div>}
  </article>;
}

export function IssuePick({issue}) {
  const href = '/magazine/' + encodeURIComponent(issue.slug);
  return <article className={`${s.pick} ${s.pickIssue}`} data-tone="play">
    <div className={s.issueCover}><Fallback icon={BookOpen} label="مجلة 967"/>{issue.cover_url && <SafeImage src={issue.cover_url} alt={'غلاف ' + issue.title} fill quality={55} sizes="(max-width:700px) 140px, 200px" className={s.cover}/>}</div>
    <div className={s.issueBody}>
      <p className={s.chips}><span className={s.chipStrong}>مجلة 967</span>{issue.number != null && <span>العدد <span className="ui-ltr">{formatNumber(issue.number)}</span></span>}</p>
      <h3><Link href={href} className={s.stretch}>{issue.title}</Link></h3>
      {issue.issue_date && <p className={s.date}><CalendarDays size={14} aria-hidden="true"/><time dateTime={issue.issue_date}>{formatArabicDate(issue.issue_date)}</time></p>}
      <span className={s.verb} aria-hidden="true">اقرأ العدد <ArrowUpLeft size={16}/></span>
    </div>
    <div className={s.save}><SaveForLater compact item={{kind: 'issue', href, title: issue.title}}/></div>
  </article>;
}

export function DebatePick({debate}) {
  const href = '/debates/' + encodeURIComponent(debate.slug);
  const cover = httpsUrl(debate.cover_url);
  const status = recordingOverdue(debate) ? 'بانتظار التسجيل' : DEBATE_STAGES[debate.stage];
  return <article className={`${s.pick} ${s.pickDebate}`} data-tone="explore">
    <div className={s.pickMedia}><Fallback icon={MessagesSquare} label="نختلف لنفهم."/>{cover && <SafeImage src={cover} alt="" fill quality={60} referrerPolicy="no-referrer" sizes="(max-width:700px) 92vw, 420px" className={s.cover}/>}<span className={s.scrim} aria-hidden="true"/></div>
    <div className={s.pickOverlay}>
      <p className={s.chips}><span className={s.chipStrong}><MessagesSquare size={13} aria-hidden="true"/>نختلف لنفهم.</span><span>مساحة للحوار</span>{status && <span>{status}</span>}</p>
      <h3><Link href={href} className={s.stretch}>{debate.title}</Link></h3>
      {debate.participants?.length > 0 && <p className={s.pickSummary}>{debate.participants.slice(0, 2).map(person => person.speaker?.name).filter(Boolean).join(' · ')}</p>}
      <span className={s.verb} aria-hidden="true">{publicRecordingAvailable(debate) ? 'شاهد المناظرة' : 'تفاصيل المناظرة'} <ArrowUpLeft size={16}/></span>
    </div>
    <div className={s.save}><SaveForLater compact item={{kind: 'debate', href, title: debate.title}}/></div>
  </article>;
}

export function NumberCard({indicator, variant = 'pick', headingLevel = 3}) {
  const latest = indicator.latestValue;
  const href = '/yemen-in-numbers/indicator/' + encodeURIComponent(indicator.slug);
  const H = 'h' + headingLevel;
  const text = formatNumber(latest.value, {maximumFractionDigits: 2});
  return <article className={`${s.pick} ${s.number}`} data-variant={variant} data-tone="explore">
    <p className={s.chips}><span className={s.chipStrong}>{indicator.domain?.name || 'اليمن بالأرقام'}</span><span>سنة القياس <span className="ui-ltr">{formatYear(latest.year)}</span></span><span>{valueStatusLabels[latest.value_status] || 'نوع القيمة غير محدد'}</span></p>
    <H className={s.numberTitle}><Link href={href} className={s.stretch}>{indicator.name}</Link></H>
    <p className={s.bigNumber}><strong className="ui-ltr" style={{'--len': text.length}}>{text}</strong><span>{indicator.unit}</span></p>
    <div className={s.numberFoot}>
      <Sparkline values={indicator.values} className={s.spark}/>
      <span className={s.source}>المصدر: {sourceLabel(latest.source || indicator.adopted_source, indicator.name)}</span>
    </div>
    <span className={s.verb} aria-hidden="true">تفاصيل المؤشر <ArrowUpLeft size={16}/></span>
    <div className={s.save}><SaveForLater compact item={{kind: 'indicator', href, title: indicator.name}}/></div>
  </article>;
}

/* ---------- 4. School ---------- */
const schoolTracks = [
  {href: '/school/writing', title: 'الكتابة والأدب', description: 'خط المسند والخط العربي والعروض', icon: PenTool, count: 36},
  {href: '/school/nature', title: 'الفلك والطبيعة', description: 'الفضاء والطقس والأرض من الداخل', icon: Telescope, count: 48},
  {href: '/school/logic', title: 'المنطق والتفكير', description: 'الاستدلال والمغالطات ومورس والبوابات', icon: BrainCircuit, count: 48},
  {href: '/school/civic', title: 'السياسة والاقتصاد', description: 'الحكم والاقتصاد والمال واتخاذ القرار', icon: Landmark, count: 48},
];
export function SchoolBlock() {
  return <section id="home-school" className={`${s.block} ${s.school} ui-reveal`} aria-labelledby="home-school-title" data-tone="learn">
    <div className={s.schoolIntro}>
      <span className={s.worldBadge} aria-hidden="true"><GraduationCap size={28} strokeWidth={1.6}/></span>
      <p className={s.kicker}>تعلم بالتجربة، لا بالحفظ وحده</p>
      <h2 id="home-school-title">مدرسة 967</h2>
      <p className={s.schoolText}><span className={s.stat}><b className="ui-ltr">15</b> مسارًا</span><span className={s.stat}><b className="ui-ltr">180</b> محطة تفاعلية</span></p>
      <p className={s.headText}>من الكتابة والتفكير إلى العلوم والسياسة والاقتصاد. اختر مجالًا، جرّب ما تعلّمته، وتابع تقدمك خطوة بخطوة.</p>
      <Link href="/school" className={s.lightBtn}>جميع المسارات <ArrowUpLeft size={18} aria-hidden="true"/></Link>
    </div>
    <ul className={s.tracks} aria-label="أقسام مدرسة 967">
      {schoolTracks.map(({href, title, description, icon: Icon, count}) => <li key={href}><Link href={href} className={s.track}>
        <span className={s.trackIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.7}/></span>
        <strong>{title}</strong><small>{description}</small>
        <span className={s.trackCount}><b className="ui-ltr">{count}</b> محطة</span>
        <span className={s.progress} aria-hidden="true"><i style={{'--p': count / 48}}/></span>
      </Link></li>)}
    </ul>
  </section>;
}

/* ---------- 5. Knowledge ---------- */
const knowledgeIcons = {history: ScrollText, atlas: Compass, figures: UsersRound, statistics: ChartNoAxesCombined, ranking: BarChart3};
export function KnowledgeBlock({items}) {
  if (!items.length) return null;
  const featured = items.find(item => item.id === 'history') || items[0];
  const others = items.filter(item => item.id !== featured.id);
  const FeatureIcon = knowledgeIcons[featured.id] || ScrollText;
  return <section className={`${s.block} ui-reveal`} id="explore-knowledge" aria-labelledby="home-knowledge-title">
    <SectionHead tone="explore" kicker="المعرفة / موسوعة 967" title="استكشف المعرفة" id="home-knowledge-title" text="تاريخٌ نفهمه، وأماكن نكتشفها، وشخصيات نتعرّف إليها، وأرقام تضع اليمن في سياقه." action={<Link className="ui-link" href="/search">ابحث في المعرفة <ArrowLeft size={18} aria-hidden="true"/></Link>}/>
    <div className={s.knowledge}>
      <Link className={s.kFeature} href={featured.href} data-knowledge-id={featured.id}>
        <span className={s.kGlyph} aria-hidden="true" dir="ltr">967</span>
        <span className={s.kIcon} aria-hidden="true"><FeatureIcon size={28} strokeWidth={1.6}/></span>
        <span className={s.kEyebrow}>{featured.eyebrow}</span>
        <h3 className={s.kTitle}>{featured.title}</h3>
        <span className={s.kText}>{featured.description}</span>
        {featured.id === 'history' && <span className={s.eras} aria-hidden="true"><span>البدايات الأولى</span><i/><span>الممالك والدول</span><i/><span>اليمن المعاصر</span></span>}
        <span className={s.kCall}>ابدأ الاستكشاف <ArrowUpLeft size={18} aria-hidden="true"/></span>
      </Link>
      {others.map(item => {
        const Icon = knowledgeIcons[item.id] || Compass;
        return <Link className={s.kTile} href={item.href} key={item.id} data-knowledge-id={item.id}>
          <span className={s.kTileIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.7}/></span>
          <span className={s.kEyebrow}>{item.eyebrow}</span>
          <h3 className={s.kTileTitle}>{item.title}</h3>
          <span className={s.kText}>{item.description}</span>
          <span className={s.kCta}>تصفّح القسم <ArrowLeft size={16} aria-hidden="true"/></span>
        </Link>;
      })}
    </div>
  </section>;
}

/* ---------- 6. Games ---------- */
const previews = [
  {href: '/games/map', title: 'أين تقع؟', eyebrow: 'MAP QUEST', description: 'اختبر معرفتك بمحافظات اليمن على الخريطة.', icon: MapPinned, number: '01'},
  {href: '/games/timeline', title: 'رتّب التاريخ', eyebrow: 'TIME ORDER', description: 'ضع المحطات والأحداث في ترتيبها الصحيح.', icon: ScrollText, number: '02'},
  {href: '/games/who', title: 'من أنا؟', eyebrow: 'WHO AM I?', description: 'اكتشف الشخصية اليمنية من التلميحات.', icon: UsersRound, number: '03'},
];
export function GamesBlock({dailyGame, dailyHref}) {
  return <section id="home-games" className={`${s.block} ${s.games} ui-reveal`} aria-labelledby="home-games-title" data-tone="play">
    <div className={s.gamesTop}>
      <div>
        <p className={s.kicker}><Gamepad2 size={16} aria-hidden="true"/> قسم مستقل للعب والمنافسة</p>
        <h2 id="home-games-title">ألعاب <span className="ui-ltr">967</span></h2>
        <p className={s.headText}>المعرفة، هذه المرة على هيئة تحدٍّ. العب، نافس، واكتشف اليمن بطريقة مختلفة مع الآخرين أو مع صديقك.</p>
      </div>
      <Link className={s.glassLink} href="/games">اكتشف الألعاب التسع <ArrowUpLeft size={17} aria-hidden="true"/></Link>
    </div>
    <div className={s.arcade}>
      <div className={s.arcadeHero}>
        <p className={s.arcadeStatus}><i aria-hidden="true"/><span dir="ltr">967 ARCADE</span> / تحديات معرفية</p>
        <p className={s.arcadeEyebrow}><Zap size={15} aria-hidden="true"/> العب، اكتشف، وتقدّم</p>
        <h3>إلى أي مدى <em>تعرف اليمن؟</em></h3>
        <p className={s.arcadeText}>تسع ألعاب في التاريخ والجغرافيا والشخصيات والتراث، مع تحدٍّ رسمي يتجدّد يوميًا وإنجازات تُكتسب بالمشاركة.</p>
        <dl className={s.arcadeStats} aria-label="مميزات ألعاب 967">
          <div><dt>ألعاب متنوعة</dt><dd className="ui-ltr">9</dd></div>
          <div><dt>شارة وإنجازًا</dt><dd className="ui-ltr">14</dd></div>
          <div><dt>ثوانٍ لكل سؤال يومي</dt><dd className="ui-ltr">7</dd></div>
        </dl>
        <div className={s.arcadeActions}>
          <Link className={s.glowBtn} href={dailyHref}><Flame size={19} aria-hidden="true"/> العب تحدي اليوم <ArrowUpLeft size={18} aria-hidden="true"/></Link>
          <Link className={s.glassLink} href="/games">تصفح جميع الألعاب <ArrowLeft size={17} aria-hidden="true"/></Link>
        </div>
        <p className={s.arcadeNote}><ShieldCheck size={16} aria-hidden="true"/> التحدي الرسمي بمحاولة يومية واحدة ونقاط موثقة؛ الجولات الحرة متاحة للجميع.</p>
      </div>
      <div className={s.arcadeSide}>
        <p className={s.previewHead}><span><Sparkles size={16} aria-hidden="true"/> اختر نقطة البداية</span><span dir="ltr">03 / 09</span></p>
        <ul className={s.previews}>{previews.map(({href, title, eyebrow, description, icon: Icon, number}) => <li key={href}><Link className={s.preview} href={href}>
          <span className={s.previewIcon} aria-hidden="true"><Icon size={22} strokeWidth={1.7}/></span>
          <span className={s.previewCopy}><span dir="ltr" className={s.previewEyebrow}>{eyebrow}</span><strong>{title}</strong><small>{description}</small></span>
          <span dir="ltr" className={s.previewNum} aria-hidden="true">{number}</span>
        </Link></li>)}</ul>
        <div className={s.duel}>
          <span className={s.duelIcon} aria-hidden="true"><Swords size={22} strokeWidth={1.7}/></span>
          <div><strong>تحدَّ صديقك</strong><p>الأسئلة نفسها، والنتيجة تحسم المنافسة. اختر لعبة وأنشئ رابط المواجهة من داخلها.</p></div>
          <Link href="/games" className={s.duelLink}>اختر اللعبة <ArrowUpLeft size={16} aria-hidden="true"/></Link>
        </div>
      </div>
    </div>
    <div className={s.gamesBar}>
      <span><CalendarDays size={17} aria-hidden="true"/> تحدي اليوم: <strong>{DAILY_GAME_TITLES[dailyGame]}</strong></span>
      <span><Trophy size={17} aria-hidden="true"/> منافسة أسبوعية ومهمات متجددة</span>
      <Link href="/games/leaderboard">لوحة المتصدرين <ArrowLeft size={16} aria-hidden="true"/></Link>
    </div>
  </section>;
}

/* ---------- 7. Curiosity doors ---------- */
const doors = [
  {href: '/works', title: 'شاهد حكاية', text: 'الأعمال الإعلامية', icon: Film, tone: 'read'},
  {href: '/magazine', title: 'خذ وقتك للقراءة', text: 'مجلة 967', icon: BookOpen, tone: 'play'},
  {href: '/yemen-in-numbers', title: 'افهم الصورة', text: 'اليمن بالأرقام', icon: ChartNoAxesCombined, tone: 'explore'},
  {href: '/yemen-map', title: 'خريطة اليمن', text: 'المحافظات والمديريات', icon: Compass, tone: 'learn'},
  {href: '/yemeni-products', title: 'صُنع في اليمن', text: 'دليل المنتجات', icon: Package, tone: 'find'},
];
export function CuriosityDoors({isVisible}) {
  const visible = doors.filter(door => isVisible(door.href));
  if (!visible.length) return null;
  return <section className={`${s.block} ui-reveal`} aria-labelledby="explore-title">
    <SectionHead title="فضولك، يحدد البداية." id="explore-title" action={isVisible('/search') && <Link className="ui-link" href="/search">ابحث في كل المنصة <ArrowLeft size={16} aria-hidden="true"/></Link>}/>
    <ul className={s.doors}>{visible.map(({href, title, text, icon: Icon, tone}) => <li key={href}><Link href={href} className={s.door} data-tone={tone}>
      <span className={s.doorIcon} aria-hidden="true"><Icon size={26} strokeWidth={1.6}/></span>
      <h3 className={s.doorTitle}>{title}</h3><span>{text}</span>
      <ArrowUpLeft className={s.doorArrow} size={18} aria-hidden="true"/>
    </Link></li>)}</ul>
  </section>;
}

/* ---------- 9. Community ---------- */
export function CompanyCard({item}) {
  const href = item ? '/yemeni-products/' + encodeURIComponent(item.id) : '/yemeni-products';
  return <article className={s.company} data-tone="find">
    <div className={s.companyMedia}><Fallback icon={Package} label="صُنع في اليمن"/>{item?.imageUrl && <SafeImage src={item.imageUrl} alt="" fill quality={60} sizes="(max-width:700px) 92vw, 560px" className={s.cover}/>}<span className={s.scrim} aria-hidden="true"/></div>
    <div className={s.pickOverlay}>
      <p className={s.chips}><span className={s.chipStrong}><Package size={13} aria-hidden="true"/>منتجات يمنية</span>{item?.location && <span><MapPin size={12} aria-hidden="true"/> {item.location}</span>}</p>
      <h3><Link href={href} className={s.stretch}>{item ? item.name : 'تعرّف على ما يُصنع في اليمن.'}</Link></h3>
      <p className={s.pickSummary}>{item ? item.category : 'منتجات وعلامات وشركات يمنية.'}</p>
      <span className={s.verb} aria-hidden="true">{item ? 'تفاصيل الشركة' : 'دليل المنتجات'} <ArrowUpLeft size={16}/></span>
    </div>
  </article>;
}
export function ProfessionalCard({item}) {
  const href = item ? '/professionals/' + encodeURIComponent(item.id) : '/professionals';
  return <Link href={href} className={s.pro} data-tone="join">
    <span className={s.proAvatar} aria-hidden="true"><UserRound size={26} strokeWidth={1.6}/></span>
    <span className={s.chipStrong}>دليل المهنيين</span>
    <strong>{item ? item.fullName : 'مهارات أقرب إلى احتياجك.'}</strong>
    <span className={s.kText}>{item ? item.professionTitle : 'أصحاب مهن وخدمات من مختلف المحافظات.'}</span>
    <span className={s.kText}>{item?.location || 'دليل المهنيين'}</span>
  </Link>;
}

/* ---------- 11. About & projects ---------- */
export function AboutProjects({settings, isVisible}) {
  const projects = [
    {icon: MapPin, title: '967 في الشارع', status: 'مخطط له', text: 'لقاءات واستطلاعات ميدانية للاستماع إلى تجارب الناس وأسئلتهم.'},
    {icon: MessagesSquare, title: 'مناظرات 967', status: settings.debatesProjectStatus, href: '/debates', text: 'حوارات منظمة تتيح للرؤى المختلفة مساحة للفهم والنقاش.'},
    {icon: Handshake, title: 'مشاريع مجتمعية', status: 'مخطط لها', text: 'مبادرات في المعرفة والخدمات والمشاركة تُعلن عند إطلاقها.'},
  ].filter(item => !item.href || isVisible(item.href));
  return <section className={`${s.about} ui-reveal`} aria-label="عن المبادرة ومشاريعها">
    <details id="about" className={s.disclosure}>
      <summary><div className={s.sumText}><small>تعرّف على 967</small><h2 className={s.sumTitle}>مساحة تتسع لنا جميعًا.</h2></div><span className={s.plus} aria-hidden="true"/></summary>
      <div className={s.disclosureBody}>
        <h3>{settings.aboutTitle}</h3><p>{settings.aboutDescription}</p>
        {settings.aboutTags?.length > 0 && <ul className={s.tags}>{settings.aboutTags.map((tag, index) => <li key={index}>{tag}</li>)}</ul>}
        <h3>رؤيتنا ورسالتنا</h3><p>{settings.aboutVision}</p>
        <h3>مجالات عملنا</h3><p>{settings.aboutFields}</p>
        {isVisible('/about') && <Link href="/about" className="ui-link">المزيد عن المبادرة <ArrowUpLeft size={16} aria-hidden="true"/></Link>}
      </div>
    </details>
    <details id="projects" className={s.disclosure}>
      <summary><div className={s.sumText}><small>من الفكرة إلى الأثر</small><h2 className={s.sumTitle}>مسارات نعمل على تطويرها.</h2></div><span className={s.plus} aria-hidden="true"/></summary>
      <div className={s.disclosureBody}>
        <ul className={s.projects}>{projects.map(({icon: Icon, title, status, text, href}) => <li key={title}>
          <span className={s.projectIcon} aria-hidden="true"><Icon size={20}/></span>
          <div><h3>{href ? <Link href={href}>{title}</Link> : title}</h3><p>{text}</p>{status && <span className={s.status}>الحالة: {status}</span>}</div>
        </li>)}</ul>
      </div>
    </details>
  </section>;
}
