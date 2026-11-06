import NextLink from 'next/link';
import {BarChart3, BookOpen, BrainCircuit, CalendarDays, ChartNoAxesCombined, Compass, Film, Flame, Gamepad2, GraduationCap, Handshake, Landmark, MapPin, MapPinned, MessagesSquare, Package, PenTool, Play, ScrollText, ShieldCheck, Sparkles, Swords, Telescope, Trophy, UsersRound, Zap} from 'lucide-react';
import SafeImage from './SafeImage';
import Resilient from './Resilient';
import SaveForLater from '@/components/reading/SaveForLater';
import Sparkline from '@/components/numbers/Sparkline';
import {figureOf} from '@/components/numbers/FigureLedger';
import {DEBATE_STAGES, publicRecordingAvailable, recordingOverdue} from '@/lib/debates';
import {workThumbnail} from '@/lib/media';
import {formatArabicDate, formatNumber} from '@/lib/format';
import styles from '@/app/front.module.css';

// Decorative direction mark as text, not an inline SVG: it repeats on every card,
// and each SVG would be serialized twice (HTML + RSC payload).
const Arrow = () => <span aria-hidden="true" className={styles.arrow}>←</span>;

/* ---------- 3. من 967، إليك. ---------- */
function storyHref(kind, item) {
  if (kind === 'debate') return '/debates/' + encodeURIComponent(item.slug);
  if (item.is_demo || item.isDemo) return '/works';
  return item.debate_slug ? '/debates/' + encodeURIComponent(item.debate_slug) : '/works/' + encodeURIComponent(item.slug);
}

export function LeadTile({item}) {
  const href = storyHref('video', item);
  const demo = item.is_demo || item.isDemo;
  return <article className={`${styles.tile} ${styles.lead}`} style={{'--hue': 'var(--c-ember)'}}>
    <div className={styles.leadMedia} aria-hidden="true">
      <span className={styles.mediaFallback}><Film size={44} strokeWidth={1.3}/></span>
      <Resilient name="home-lead-image" quiet><SafeImage src={workThumbnail(item)} sizes="(max-width: 760px) 100vw, (max-width: 1180px) 92vw, 760px" className={styles.cover}/></Resilient>
    </div>
    <div className={styles.leadScrim} aria-hidden="true"/>
    <div className={styles.leadBody}>
      <p className={styles.tag}><Play size={13} fill="currentColor" aria-hidden="true"/> حكايات 967 · {item.category || 'من الأعمال الإعلامية'}</p>
      <h3 className={styles.leadTitle}><NextLink href={href} className={styles.stretch}>{item.title}</NextLink></h3>
      {item.summary && <p className={styles.leadDek}>{item.summary}</p>}
      <div className={styles.leadFoot}>
        <span className={styles.glassChip}>{item.platform || 'عمل إعلامي'}</span>
        {item.published_at && <time className={styles.glassChip} dateTime={item.published_at}>{formatArabicDate(item.published_at)}</time>}
        {demo && <span className={styles.glassChip}>نموذج توضيحي</span>}
        <span className={styles.leadCta}>اكتشف العمل <Arrow/></span>
        {!demo && item.slug && <span className={styles.save}><SaveForLater compact item={{kind: item.debate_slug ? 'debate' : 'work', href, title: item.title}}/></span>}
      </div>
    </div>
  </article>;
}

export function IssueTile({issue}) {
  const href = '/magazine/' + encodeURIComponent(issue.slug);
  return <article className={`${styles.tile} ${styles.issue}`} style={{'--hue': 'var(--c-violet)'}}>
    <div className={styles.issueCover}>
      <span className={styles.mediaFallback}><BookOpen size={36} strokeWidth={1.3} aria-hidden="true"/></span>
      <Resilient name="home-issue-cover" quiet><SafeImage src={issue.cover_url} alt={'غلاف ' + issue.title} sizes="(max-width: 760px) 40vw, 200px" className={styles.cover}/></Resilient>
    </div>
    <div className={styles.issueBody}>
      <p className={styles.kick}>مجلة 967 · العدد <bdi>{formatNumber(issue.number)}</bdi></p>
      <h3 className={styles.tileTitle}><NextLink href={href} className={styles.stretch}>{issue.title}</NextLink></h3>
      {issue.issue_date && <p className={styles.small}><CalendarDays size={14} aria-hidden="true"/> <time dateTime={issue.issue_date}>{formatArabicDate(issue.issue_date)}</time></p>}
      {issue.is_demo && <span className="ed-status" data-tone="caution">نموذج توضيحي</span>}
      <div className={styles.tileFoot}><span className={styles.cta}>اقرأ العدد <Arrow/></span>{!issue.is_demo && <span className={styles.save}><SaveForLater compact item={{kind: 'issue', href, title: issue.title}}/></span>}</div>
    </div>
  </article>;
}

export function DebateTile({item}) {
  const href = storyHref('debate', item);
  const status = recordingOverdue(item) ? 'بانتظار التسجيل' : DEBATE_STAGES[item.stage];
  const verb = publicRecordingAvailable(item) ? 'شاهد المناظرة' : 'تفاصيل المناظرة';
  return <article className={`${styles.tile} ${styles.debate}`} style={{'--hue': 'var(--c-indigo)'}}>
    <div className={styles.debateMedia} aria-hidden="true">
      <span className={styles.mediaFallback}><MessagesSquare size={40} strokeWidth={1.3}/></span>
      <Resilient name="home-debate-image" quiet><SafeImage src={item.cover_url} sizes="(max-width: 760px) 100vw, 520px" className={styles.cover}/></Resilient>
    </div>
    <div className={styles.debateBody}>
      <p className={styles.kick}>في الاختلاف رحمة. · مساحة للحوار</p>
      <h3 className={styles.tileTitle}><NextLink href={href} className={styles.stretch}>{item.title}</NextLink></h3>
      {item.participants?.length > 1 && <p className={styles.versus}>{item.participants.slice(0, 2).map(person => person.speaker?.name).filter(Boolean).map((name, index) => <span key={name + index}>{name}</span>)}</p>}
      <div className={styles.tileFoot}>{status && <span className="ed-status" data-tone={publicRecordingAvailable(item) ? 'positive' : 'neutral'}>{status}</span>}<span className={styles.cta}>{verb} <Arrow/></span><span className={styles.save}><SaveForLater compact item={{kind: 'debate', href, title: item.title}}/></span></div>
    </div>
  </article>;
}

export function NumberTile({indicator}) {
  const f = figureOf(indicator);
  return <article className={`${styles.tile} ${styles.number}`} style={{'--hue': 'var(--c-teal)'}}>
    <p className={styles.kick}>{indicator.domain?.name || 'اليمن بالأرقام'} · <bdi>{f.year}</bdi></p>
    <h3 className={styles.numberName}><NextLink href={f.href} className={styles.stretch}>{indicator.name}</NextLink></h3>
    <p className="ed-figure" data-len={f.number.length > 10 ? 'long' : undefined}><bdi dir="ltr">{f.number}</bdi> <span>{indicator.unit}</span></p>
    <Sparkline points={indicator.spark} label={'اتجاه ' + indicator.name}/>
    <div className={styles.tileFoot}><span className="ed-chip-data"><span>المصدر: {f.source}</span></span><span className="ed-status" data-tone={f.estimated ? 'caution' : 'neutral'}>{f.kind}</span><span className={styles.save}><SaveForLater compact item={{kind: 'indicator', href: f.href, title: indicator.name}}/></span></div>
  </article>;
}

export function Invitation({kind, failed}) {
  const options = {
    video: {href: '/works', title: 'حكايات من زوايا مختلفة.', label: 'استكشف الأعمال', icon: Film, hue: 'var(--c-ember)'},
    debate: {href: '/debates', title: 'لكل سؤال، أكثر من زاوية.', label: 'استكشف المناظرات', icon: MessagesSquare, hue: 'var(--c-indigo)'},
    issue: {href: '/magazine', title: 'مساحة للقراءة والتأمل.', label: 'استكشف المجلة', icon: BookOpen, hue: 'var(--c-violet)'},
    indicator: {href: '/yemen-in-numbers', title: 'المعرفة تبدأ بسؤال.', label: 'استكشف المؤشرات', icon: Compass, hue: 'var(--c-teal)'},
  };
  const {href, title, label, icon: Icon, hue} = options[kind];
  return <article className={`${styles.tile} ${styles.invitation} ${styles['slot_' + kind]}`} style={{'--hue': hue}}>
    <Icon size={30} strokeWidth={1.5} aria-hidden="true"/>
    <h3 className={styles.tileTitle}>{failed ? 'تعذّر تحميل هذا الجزء الآن.' : title}</h3>
    <NextLink href={href} className="ed-link">{label}</NextLink>
  </article>;
}

/* ---------- 4. مدرسة 967 ---------- */
const schoolTracks = [
  {href: '/school/writing', title: 'الكتابة والأدب', description: 'خط المسند والخط العربي والعروض', icon: PenTool, stations: 36},
  {href: '/school/nature', title: 'الفلك والطبيعة', description: 'الفضاء والطقس والأرض من الداخل', icon: Telescope, stations: 48},
  {href: '/school/logic', title: 'المنطق والتفكير', description: 'الاستدلال والمغالطات ومورس والبوابات', icon: BrainCircuit, stations: 48},
  {href: '/school/civic', title: 'السياسة والاقتصاد', description: 'الحكم والاقتصاد والمال واتخاذ القرار', icon: Landmark, stations: 48},
];
export function SchoolBlock() {
  return <div className={styles.school}>
    <div className={styles.schoolIntro}>
      <span className={styles.schoolBadge}><GraduationCap size={30} strokeWidth={1.5} aria-hidden="true"/></span>
      <p className={styles.kick}>تعلم بالتجربة، لا بالحفظ وحده</p>
      <h2 id="home-school-title" className={styles.blockTitle}>مدرسة 967</h2>
      <p className={styles.blockText}>15 مسارًا و180 محطة تفاعلية، من الكتابة والتفكير إلى العلوم والسياسة والاقتصاد. اختر مجالًا، جرّب ما تعلّمته، وتابع تقدمك خطوة بخطوة.</p>
      <div className={styles.schoolStats} aria-label="مدرسة 967 بالأرقام"><div><strong>15</strong><span>مسارًا</span></div><div><strong>180</strong><span>محطة تفاعلية</span></div><div><strong>4</strong><span>مجالات</span></div></div>
      <NextLink href="/school" className="ed-button">جميع المسارات <Arrow/></NextLink>
    </div>
    <ul className={styles.schoolTracks} aria-label="أقسام مدرسة 967">
      {schoolTracks.map(({href, title, description, icon: Icon, stations}) => <li key={href}><NextLink href={href} className={styles.track}>
        <span className={styles.trackIcon}><Icon size={22} strokeWidth={1.6} aria-hidden="true"/></span>
        <strong>{title}</strong><small>{description}</small>
        <span className={styles.trackMeter} aria-hidden="true"><i style={{width: Math.round(stations / 48 * 100) + '%'}}/></span>
        <span className={styles.trackCount}><bdi>{stations}</bdi> محطة</span>
      </NextLink></li>)}
    </ul>
  </div>;
}

/* ---------- 5. استكشف المعرفة ---------- */
const knowledgeIcons = {history: ScrollText, atlas: Compass, figures: UsersRound, statistics: ChartNoAxesCombined, ranking: BarChart3};
const knowledgeHues = {history: 'var(--c-ember)', atlas: 'var(--c-leaf)', figures: 'var(--c-violet)', statistics: 'var(--c-teal)', ranking: 'var(--c-indigo)'};
export function KnowledgeBento({items}) {
  const featured = items.find(item => item.id === 'history') || items[0];
  const others = items.filter(item => item.id !== featured.id);
  const FeatureIcon = knowledgeIcons[featured.id] || ScrollText;
  return <div className={styles.knowledgeGrid}>
    <NextLink href={featured.href} className={`${styles.kFeature}`} data-knowledge-id={featured.id} style={{'--hue': knowledgeHues[featured.id]}}>
      <span className={styles.kGlyph} aria-hidden="true">967</span>
      <span className={styles.kIcon}><FeatureIcon size={28} strokeWidth={1.5} aria-hidden="true"/></span>
      <span className={styles.kick}>967 / المعرفة · {featured.eyebrow}</span>
      <h3 className={styles.kTitle}>{featured.title}</h3>
      <p className={styles.kText}>{featured.description}</p>
      {featured.id === 'history' && <span className={styles.eras} aria-hidden="true"><span>البدايات الأولى</span><i/><span>الممالك والدول</span><i/><span>اليمن المعاصر</span></span>}
      <span className={styles.kCta}>ابدأ الاستكشاف <Arrow/></span>
    </NextLink>
    {others.map(item => {
      const Icon = knowledgeIcons[item.id] || Compass;
      return <NextLink href={item.href} key={item.id} className={styles.kTile} data-knowledge-id={item.id} style={{'--hue': knowledgeHues[item.id]}}>
        <span className={styles.kIcon}><Icon size={22} strokeWidth={1.6} aria-hidden="true"/></span>
        <span className={styles.kick}>{item.eyebrow}</span>
        <h3 className={styles.kTileTitle}>{item.title}</h3>
        <p className={styles.kText}>{item.description}</p>
        <span className={styles.kCta}>تصفّح القسم <Arrow/></span>
      </NextLink>;
    })}
  </div>;
}

/* ---------- 6. ألعاب 967 ---------- */
const previews = [
  {href: '/games/map', title: 'أين تقع؟', eyebrow: 'MAP QUEST', description: 'اختبر معرفتك بمحافظات اليمن على الخريطة.', icon: MapPinned, number: '01'},
  {href: '/games/timeline', title: 'رتّب التاريخ', eyebrow: 'TIME ORDER', description: 'ضع المحطات والأحداث في ترتيبها الصحيح.', icon: ScrollText, number: '02'},
  {href: '/games/who', title: 'من أنا؟', eyebrow: 'WHO AM I?', description: 'اكتشف الشخصية اليمنية من التلميحات.', icon: UsersRound, number: '03'},
];
export function GamesArcade({dailyHref, dailyTitle}) {
  return <div className={styles.arcade}>
    <div className={styles.arcadeGlow} aria-hidden="true"/>
    <div className={styles.arcadeHead}>
      <div>
        <p className={styles.arcadeKick}><Gamepad2 size={16} aria-hidden="true"/> قسم مستقل للعب والمنافسة</p>
        <h2 id="home-games-title" className={styles.blockTitle}>ألعاب <span className={styles.gradText}>967</span></h2>
        <p className={styles.arcadeText}>المعرفة، هذه المرة على هيئة تحدٍّ. العب، نافس، واكتشف اليمن بطريقة مختلفة مع الآخرين أو مع صديقك.</p>
      </div>
      <NextLink className={styles.arcadeLink} href="/games">اكتشف الألعاب التسع <Arrow/></NextLink>
    </div>
    <div className={styles.arcadeGrid}>
      <div className={styles.arcadeHero}>
        <p className={styles.status}><span aria-hidden="true"/> <bdi dir="ltr">967 ARCADE</bdi> / تحديات معرفية</p>
        <p className={styles.arcadeEyebrow}><Zap size={15} aria-hidden="true"/> العب، اكتشف، وتقدّم</p>
        <h3 className={styles.arcadeTitle}>إلى أي مدى <em>تعرف اليمن؟</em></h3>
        <p className={styles.arcadeText}>تسع ألعاب في التاريخ والجغرافيا والشخصيات والتراث، مع تحدٍّ رسمي يتجدّد يوميًا وإنجازات تُكتسب بالمشاركة.</p>
        <div className={styles.arcadeStats} aria-label="مميزات ألعاب 967"><div><strong>9</strong><span>ألعاب متنوعة</span></div><div><strong>14</strong><span>شارة وإنجازًا</span></div><div><strong>7</strong><span>ثوانٍ لكل سؤال يومي</span></div></div>
        <div className={styles.arcadeActions}>
          <NextLink className={styles.play} href={dailyHref}><Flame size={19} aria-hidden="true"/> العب تحدي اليوم</NextLink>
          <NextLink className={styles.ghost} href="/games">تصفح جميع الألعاب</NextLink>
        </div>
        <p className={styles.arcadeNote}><ShieldCheck size={15} aria-hidden="true"/> التحدي الرسمي بمحاولة يومية واحدة ونقاط موثقة؛ الجولات الحرة متاحة للجميع.</p>
      </div>
      <div className={styles.arcadeSide}>
        <p className={styles.arcadeSideHead}><span><Sparkles size={16} aria-hidden="true"/> اختر نقطة البداية</span><bdi dir="ltr">03 / 09</bdi></p>
        <p className={styles.swipeHint}>اسحب البطاقات لمشاهدة ألعاب إضافية</p>
        <ul className={styles.gameRail}>{previews.map(({href, title, eyebrow, description, icon: Icon, number}) => <li key={href}><NextLink href={href} className={styles.gameCard}>
          <span className={styles.gameIcon}><Icon size={22} strokeWidth={1.6} aria-hidden="true"/></span>
          <span className={styles.gameCopy}><bdi dir="ltr" className={styles.gameEyebrow}>{eyebrow}</bdi><strong>{title}</strong><small>{description}</small></span>
          <bdi dir="ltr" className={styles.gameNo}>{number}</bdi>
        </NextLink></li>)}</ul>
        <div className={styles.duel}><Swords size={24} strokeWidth={1.6} aria-hidden="true"/><div><strong>تحدَّ صديقك</strong><p>الأسئلة نفسها، والنتيجة تحسم المنافسة. اختر لعبة وأنشئ رابط المواجهة من داخلها.</p></div><NextLink href="/games" className={styles.duelLink}>اختر اللعبة <Arrow/></NextLink></div>
      </div>
    </div>
    <div className={styles.arcadeBar}>
      <span><CalendarDays size={16} aria-hidden="true"/> تحدي اليوم: <strong>{dailyTitle}</strong></span>
      <span><Trophy size={16} aria-hidden="true"/> منافسة أسبوعية ومهمات متجددة</span>
      <NextLink href="/games/leaderboard">لوحة المتصدرين <Arrow/></NextLink>
    </div>
  </div>;
}

/* ---------- 7. فضولك، يحدد البداية. ---------- */
export const discoverDoors = [
  {href: '/works', title: 'شاهد حكاية', text: 'الأعمال الإعلامية', icon: Film, hue: 'var(--c-ember)'},
  {href: '/magazine', title: 'خذ وقتك للقراءة', text: 'مجلة 967', icon: BookOpen, hue: 'var(--c-violet)'},
  {href: '/yemen-in-numbers', title: 'افهم الصورة', text: 'اليمن بالأرقام', icon: ChartNoAxesCombined, hue: 'var(--c-teal)'},
  {href: '/yemen-map', title: 'خريطة اليمن', text: 'المحافظات والمديريات', icon: Compass, hue: 'var(--c-leaf)'},
  {href: '/yemeni-products', title: 'صُنع في اليمن', text: 'دليل المنتجات', icon: Package, hue: 'var(--c-amber)'},
  {href: '/professionals', title: 'اعثر على مهارة', text: 'دليل المهنيين', icon: UsersRound, hue: 'var(--c-indigo)'},
];
export function DiscoverRail({Link}) {
  return <ul className={styles.discover}>{discoverDoors.map(({href, title, text, icon: Icon, hue}) => {
    const link = <Link href={href} className={styles.door} style={{'--hue': hue}}><span className={styles.doorIcon}><Icon size={26} strokeWidth={1.5} aria-hidden="true"/></span><h3>{title}</h3><span>{text}</span><Arrow/></Link>;
    return link ? <li key={href}>{link}</li> : null;
  })}</ul>;
}

/* ---------- 8. لنفهم الواقع ---------- */
export function DataCard({indicator}) {
  const f = figureOf(indicator);
  return <article className={styles.dataCard}>
    <p className={styles.dataKick}><span>{indicator.domain?.name || 'مؤشر وطني'}</span><bdi>{f.year}</bdi></p>
    <h3 className={styles.dataName}><NextLink href={f.href} className={styles.stretch}>{indicator.name}</NextLink></h3>
    <p className="ed-figure" data-len={f.number.length > 10 ? 'long' : undefined}><bdi dir="ltr">{f.number}</bdi> <span>{indicator.unit}</span></p>
    <Sparkline points={indicator.spark} label={'اتجاه ' + indicator.name}/>
    <p className={styles.dataSource}>المصدر: {f.source}</p>
    <div className={styles.tileFoot}><span className="ed-status" data-tone={f.estimated ? 'caution' : 'neutral'}>{f.kind}</span><span className={styles.cta}>تفاصيل المؤشر <Arrow/></span><span className={styles.save}><SaveForLater compact item={{kind: 'indicator', href: f.href, title: indicator.name}}/></span></div>
  </article>;
}

/* ---------- 9. أشياء تُصنع. ومهارات تُنجز. ---------- */
export function CompanyCard({item}) {
  const href = item ? '/yemeni-products/' + encodeURIComponent(item.id) : '/yemeni-products';
  return <article className={`${styles.tile} ${styles.company}`} style={{'--hue': 'var(--c-amber)'}}>
    <div className={styles.companyMedia} aria-hidden="true">
      <span className={styles.mediaFallback}><Package size={40} strokeWidth={1.3}/></span>
      {item?.imageUrl && <Resilient name="home-company-image" quiet><SafeImage src={item.imageUrl} sizes="(max-width: 760px) 100vw, 480px" className={styles.cover}/></Resilient>}
    </div>
    <div className={styles.companyBody}>
      <p className={styles.kick}>منتجات يمنية</p>
      <h3 className={styles.tileTitle}><NextLink href={href} className={styles.stretch}>{item ? item.name : 'تعرّف على ما يُصنع في اليمن.'}</NextLink></h3>
      <p className={styles.small}>{item ? item.category : 'منتجات وعلامات وشركات يمنية.'}</p>
      <div className={styles.tileFoot}><span className="ed-chip-data"><MapPin size={13} aria-hidden="true"/><span>{item?.location || 'دليل المنتجات'}</span></span><span className={styles.cta}>افتح الملف <Arrow/></span></div>
    </div>
  </article>;
}
export function ProfessionalCard({item}) {
  const href = item ? '/professionals/' + encodeURIComponent(item.id) : '/professionals';
  return <article className={`${styles.tile} ${styles.pro}`} style={{'--hue': 'var(--c-indigo)'}}>
    <span className={styles.kIcon}><UsersRound size={24} strokeWidth={1.5} aria-hidden="true"/></span>
    <p className={styles.kick}>ملف مهني</p>
    <h3 className={styles.tileTitle}><NextLink href={href} className={styles.stretch}>{item ? item.fullName : 'مهارات أقرب إلى احتياجك.'}</NextLink></h3>
    <p className={styles.small}>{item ? item.professionTitle : 'أصحاب مهن وخدمات من مختلف المحافظات.'}</p>
    <span className="ed-chip-data"><MapPin size={13} aria-hidden="true"/><span>{item?.location || 'دليل المهنيين'}</span></span>
  </article>;
}

/* ---------- 11. مشاريعنا ---------- */
export const projectIcons = {street: MapPin, debates: MessagesSquare, community: Handshake};
