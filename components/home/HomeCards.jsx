import Link from '@/components/SiteLink';
import Image from 'next/image';
import {ArrowUpLeft, BookOpen, Compass, Film, MessagesSquare, Package, Play, UserRound} from 'lucide-react';
import ContentSurface, {ContentBadge} from '@/components/design/ContentSurface';
import YemeniMotif from '@/components/design/YemeniMotif';
import WorkThumbnail from '@/components/WorkThumbnail';
import DebateCover from '@/components/debates/DebateCover';
import SaveForLater from '@/components/reading/SaveForLater';
import InlineActions from '@/components/inline/InlineActions';
import {createInlineTarget} from '@/lib/inlineEditorTargets';
import {workThumbnail, canOptimizeImage} from '@/lib/media';
import {formatArabicDate, formatNumber, formatYear} from '@/lib/format';
import {DEBATE_STAGES, publicRecordingAvailable, recordingOverdue} from '@/lib/debates';
import {sourceLabel} from '@/lib/indicatorPresentation';
import {valueStatusLabels} from '@/lib/yemenNumbers';
import styles from './HomeCards.module.css';

function CardFooter({href, label, title, saveItem, editorTarget}) {
  return <div className={styles.footer}><Link href={href} className={styles.action} aria-label={title ? `${label}: ${title}` : undefined}>{label}<ArrowUpLeft size={16} aria-hidden="true"/></Link>{saveItem && <SaveForLater item={saveItem} compact/>}{editorTarget && <InlineActions target={editorTarget}/>}</div>;
}

export function HomeStoryCard({kind, item, featured = false}) {
  if (!item) return <HomeInvitation kind={kind}/>;
  const debate = kind === 'debate';
  const demo = item.is_demo || item.isDemo;
  const href = debate ? '/debates/' + encodeURIComponent(item.slug) : demo ? '/works' : item.debate_slug ? '/debates/' + encodeURIComponent(item.debate_slug) : '/works/' + encodeURIComponent(item.slug);
  const status = debate ? recordingOverdue(item) ? 'بانتظار التسجيل' : DEBATE_STAGES[item.stage] : item.platform;
  const label = debate ? publicRecordingAvailable(item) ? 'شاهد المناظرة' : 'تفاصيل المناظرة' : 'اكتشف العمل';
  const saveKind = debate || item.debate_slug ? 'debate' : 'work';
  const thumb = debate ? null : workThumbnail(item);
  const MediaIcon = debate && !publicRecordingAvailable(item) ? MessagesSquare : Play;
  return <ContentSurface kind={kind} className={`${styles.card} ${styles.story} ${featured ? styles.featured : styles.compactStory}`} data-home-story={kind}>
    <Link href={href} className={styles.storyLink}>
      <div className={styles.media}>
        {debate ? <DebateCover url={item.cover_url} eager={featured}/> : <><div className={styles.mediaFallback}><YemeniMotif/><Film size={featured ? 34 : 24} aria-hidden="true"/><span>{item.category || 'من أعمال 967'}</span></div>{thumb && <WorkThumbnail src={thumb} priority={featured} sizes={featured ? '(max-width: 600px) 38vw, (max-width: 1100px) 52vw, 42vw' : '(max-width: 600px) 44px, 100px'}/>}</>}
        {featured && <span className={styles.mediaMark}><MediaIcon size={16} fill={MediaIcon === Play ? 'currentColor' : 'none'} aria-hidden="true"/>{debate ? 'مناظرات 967' : 'حكايات 967'}</span>}
      </div>
      <div className={styles.storyBody}><div className={styles.meta}><span>{debate ? 'مساحة للحوار' : 'من الأعمال الإعلامية'}</span>{status && <span>{status}</span>}</div><h2>{item.title}</h2>{demo && <span className={styles.demo}>نموذج توضيحي</span>}</div>
    </Link>
    {debate && featured && item.participants?.length > 0 && <div className={styles.participants} aria-label="طرفا المناظرة">{item.participants.slice(0, 2).map(person => <span key={person.id || person.speaker.id}>{person.speaker.name}</span>)}</div>}
    <CardFooter href={href} label={featured ? label : 'افتح'} title={item.title} saveItem={!demo && item.slug ? {kind: saveKind, href, title: item.title} : null} editorTarget={debate ? createInlineTarget({kind:'debate',id:item.id,slug:item.slug,title:item.title,href}) : null}/>
  </ContentSurface>;
}

export function HomeIssueCard({issue, compact = false}) {
  if (!issue) return <HomeInvitation kind="issue"/>;
  const href = '/magazine/' + encodeURIComponent(issue.slug);
  return <ContentSurface kind="issue" className={`${styles.card} ${styles.issue} ${compact ? styles.smallIssue : ''}`} data-home-issue>
    <Link href={href} className={styles.issueLink}>
      <div className={styles.cover}>{issue.cover_url ? <Image src={issue.cover_url} alt={'غلاف ' + issue.title} width={180} height={240} sizes="(max-width: 600px) 120px, 160px" unoptimized={!canOptimizeImage(issue.cover_url)}/> : <BookOpen size={48} aria-hidden="true"/>}</div>
      <div className={styles.issueBody}><span className={styles.issueNumber}>مجلة 967 · العدد {formatNumber(issue.number)}</span><h2>{issue.title}</h2>{issue.is_demo && <span className={styles.demo}>نموذج توضيحي</span>}{!compact && <time dateTime={issue.issue_date}>{formatArabicDate(issue.issue_date)}</time>}</div>
    </Link>
    <CardFooter href={href} label="اقرأ العدد" title={issue.title} saveItem={!issue.is_demo ? {kind:'issue', href, title:issue.title} : null}/>
  </ContentSurface>;
}

export function HomeIndicatorCard({indicator, compact = false}) {
  if (!indicator?.latestValue) return <HomeInvitation kind="indicator"/>;
  const href = '/yemen-in-numbers/indicator/' + encodeURIComponent(indicator.slug);
  const value = indicator.latestValue;
  const valueText = formatNumber(value.value, {maximumFractionDigits:2});
  const fontScale = `${Math.max(4, Math.min(16, 125 / valueText.length))}cqi`;
  const source = sourceLabel(value.source || indicator.adopted_source, indicator.name);
  return <ContentSurface kind="indicator" className={`${styles.card} ${styles.indicator} ${compact ? styles.compactIndicator : ''}`} data-home-indicator>
    <Link href={href} className={styles.indicatorLink}><div className={styles.meta}><span>{indicator.domain?.name || 'اليمن بالأرقام'}</span><span>{formatYear(value.year)}</span></div><h2>{indicator.name}</h2><div className={styles.value}><strong dir="ltr" style={{'--card-number-font': fontScale}}>{valueText}</strong><span>{indicator.unit}</span></div><div className={styles.source}><span>المصدر: {source}</span><span className={styles.valueKind}>{valueStatusLabels[value.value_status] || 'نوع القيمة غير محدد'}</span></div></Link>
    {!compact && <CardFooter href={href} label="تفاصيل المؤشر" title={indicator.name} saveItem={{kind:'indicator', href, title:indicator.name}}/>}
  </ContentSurface>;
}

export function HomeDirectoryCard({kind, item}) {
  const product = kind === 'product';
  const href = item ? (product ? '/yemeni-products/' : '/professionals/') + encodeURIComponent(item.id) : product ? '/yemeni-products' : '/professionals';
  const title = item ? product ? item.name : item.fullName : product ? 'تعرّف على ما يُصنع في اليمن.' : 'مهارات أقرب إلى احتياجك.';
  const Icon = product ? Package : UserRound;
  return <ContentSurface kind={kind} className={`${styles.card} ${styles.directory}`}>
    <Link href={href} className={styles.directoryLink}><div className={styles.directoryArt}>{product && item?.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="120px" unoptimized={!canOptimizeImage(item.imageUrl)}/> : <><YemeniMotif/><Icon size={36} strokeWidth={1.5} aria-hidden="true"/></>}</div><div className={styles.directoryBody}><ContentBadge kind={kind}/><h3>{title}</h3><p>{item ? product ? item.category : item.professionTitle : product ? 'منتجات وعلامات وشركات يمنية.' : 'أصحاب مهن وخدمات من مختلف المحافظات.'}</p><span className={styles.directoryLocation}>{item?.location || (product ? 'دليل المنتجات' : 'دليل المهنيين')}</span></div><ArrowUpLeft className={styles.directoryArrow} size={20} aria-hidden="true"/></Link>
  </ContentSurface>;
}

export function HomeInvitation({kind}) {
  const options = {
    video: {href:'/works', title:'حكايات من زوايا مختلفة.', label:'استكشف الأعمال', icon:Film},
    debate: {href:'/debates', title:'لكل سؤال، أكثر من زاوية.', label:'استكشف المناظرات', icon:MessagesSquare},
    issue: {href:'/magazine', title:'مساحة للقراءة والتأمل.', label:'استكشف المجلة', icon:BookOpen},
    indicator: {href:'/yemen-in-numbers', title:'المعرفة تبدأ بسؤال.', label:'استكشف المؤشرات', icon:Compass},
  };
  const {href, title, label, icon:Icon} = options[kind];
  return <ContentSurface kind={kind} className={`${styles.card} ${styles.invitation}`}><YemeniMotif/><Icon size={30} aria-hidden="true"/><h2>{title}</h2><Link href={href} className={styles.action}>{label}<ArrowUpLeft size={17} aria-hidden="true"/></Link></ContentSurface>;
}
