import Link from 'next/link';
import {BookOpen, CalendarDays, Film, MessagesSquare, Play} from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import SaveForLater from '@/components/reading/SaveForLater';
import {workThumbnail} from '@/lib/media';
import {formatArabicDate, formatNumber, formatYear} from '@/lib/format';
import {DEBATE_STAGES, httpsUrl, publicRecordingAvailable, recordingOverdue} from '@/lib/debates';
import {statusLabels, valueStatusLabels} from '@/lib/yemenNumbers';
import {dataStatusHelp, sourceLabel} from '@/lib/indicatorPresentation';
import {indicatorMeasurementEvidence} from '@/lib/contentEvidence';
import Sparkline from './Sparkline';
import styles from './Cards.module.css';

// Card anatomy (shared by every collection): media → meta line → title →
// one explicit verb. The whole card is one link; Save sits beside it, never inside.

function MediaFallback({icon: Icon = Film, label}) {
  return <div className={styles.fallback} aria-hidden="true"><Icon size={26} strokeWidth={1.6}/><span>{label}</span></div>;
}

export function workHref(work, returnTo) {
  if (work.debate_slug) return '/debates/' + encodeURIComponent(work.debate_slug);
  return '/works/' + encodeURIComponent(work.slug) + (returnTo ? '?from=' + encodeURIComponent(returnTo) : '');
}

export function MediaCard({work, returnTo, priority = false, layout = 'stack', headingLevel = 3, sizes}) {
  const href = workHref(work, returnTo);
  const thumb = workThumbnail(work);
  const H = 'h' + headingLevel;
  const date = work.published_at ? formatArabicDate(work.published_at) : null;
  return <article className={styles.card} data-layout={layout} data-kind="read">
    <div className={styles.media} data-ratio="video">
      <MediaFallback label={work.category || 'من أعمال 967'}/>
      {thumb && <SafeImage src={thumb} fill priority={priority} quality={60} sizes={sizes || (layout === 'row' ? '(max-width:600px) 130px, 180px' : '(max-width:600px) 92vw, (max-width:1100px) 46vw, 380px')} className={styles.img}/>}
      <span className={styles.play} aria-hidden="true"><Play size={16} fill="currentColor"/></span>
    </div>
    <div className={styles.body}>
      <p className={styles.meta}><span>{work.category}</span>{work.platform && <span>{work.platform}</span>}{date && <time dateTime={work.published_at}>{date}</time>}</p>
      <H className={styles.title}><Link href={href} className={styles.stretch}>{work.title}</Link></H>
      {layout !== 'row' && work.summary && <p className={styles.summary}>{work.summary}</p>}
      <span className={styles.verb} aria-hidden="true">{work.debate_slug ? 'افتح المناظرة' : 'شاهد العمل'}</span>
    </div>
    {work.slug && !work.debate_slug && <div className={styles.save}><SaveForLater compact item={{kind: 'work', href: '/works/' + encodeURIComponent(work.slug), title: work.title}}/></div>}
  </article>;
}

export function DebateCard({debate, priority = false, layout = 'stack', sizes}) {
  const href = '/debates/' + encodeURIComponent(debate.slug);
  const cover = httpsUrl(debate.cover_url);
  const status = recordingOverdue(debate) ? 'بانتظار التسجيل' : DEBATE_STAGES[debate.stage];
  const verb = publicRecordingAvailable(debate) ? 'شاهد المناظرة' : 'تفاصيل المناظرة';
  return <article className={styles.card} data-layout={layout} data-kind="read">
    <div className={styles.media} data-ratio="video">
      <MediaFallback icon={MessagesSquare} label="مناظرات 967 · نختلف لنفهم"/>
      {cover && <SafeImage src={cover} fill priority={priority} referrerPolicy="no-referrer" quality={60} sizes={sizes || (layout === 'row' ? '(max-width:600px) 130px, 180px' : '(max-width:600px) 92vw, 380px')} className={styles.img} alt=""/>}
    </div>
    <div className={styles.body}>
      <p className={styles.meta}><span>مناظرات 967</span>{status && <span className={styles.status}>{status}</span>}</p>
      <h3 className={styles.title}><Link href={href} className={styles.stretch}>{debate.title}</Link></h3>
      {debate.participants?.length > 0 && <p className={styles.summary}>{debate.participants.slice(0, 2).map(person => person.speaker?.name).filter(Boolean).join(' · ')}</p>}
      <span className={styles.verb} aria-hidden="true">{verb}</span>
    </div>
    <div className={styles.save}><SaveForLater compact item={{kind: 'debate', href, title: debate.title}}/></div>
  </article>;
}

export function IssueCard({issue, priority = false}) {
  const href = '/magazine/' + encodeURIComponent(issue.slug);
  return <article className={styles.card} data-layout="issue" data-kind="read">
    <div className={styles.media} data-ratio="cover">
      <MediaFallback icon={BookOpen} label="مجلة 967"/>
      {issue.cover_url && <SafeImage src={issue.cover_url} alt={'غلاف ' + issue.title} fill priority={priority} quality={60} sizes="96px" className={styles.img}/>}
    </div>
    <div className={styles.body}>
      <p className={styles.meta}><span>مجلة 967</span>{issue.number != null && <span>العدد <span className="ui-ltr">{formatNumber(issue.number)}</span></span>}</p>
      <h3 className={styles.title}><Link href={href} className={styles.stretch}>{issue.title}</Link></h3>
      {issue.issue_date && <p className={styles.summary}><CalendarDays size={14} aria-hidden="true"/> <time dateTime={issue.issue_date}>{formatArabicDate(issue.issue_date)}</time></p>}
      <span className={styles.verb} aria-hidden="true">اقرأ العدد</span>
    </div>
    <div className={styles.save}><SaveForLater compact item={{kind: 'issue', href, title: issue.title}}/></div>
  </article>;
}

// Indicator rows keep value, unit, measurement year, value kind, status and
// source together on every width — evidence is shortened, never removed.
export function IndicatorRow({indicator, returnTo, headingLevel = 3}) {
  const latest = indicator.latestValue;
  const href = '/yemen-in-numbers/indicator/' + encodeURIComponent(indicator.slug) + (returnTo ? '?from=' + encodeURIComponent(returnTo) : '');
  const evidence = latest ? indicatorMeasurementEvidence(latest.year) : null;
  const H = 'h' + headingLevel;
  return <article className={styles.row}>
    <div className={styles.rowMain}>
      <p className={styles.meta}><span>{indicator.domain?.name || 'مؤشر وطني'}</span><span title={dataStatusHelp[indicator.data_status]}>{statusLabels[indicator.data_status] || 'حالة غير محددة'}</span></p>
      <H className={styles.rowTitle}><Link href={href} className={styles.stretch}>{indicator.name}</Link></H>
      <p className={styles.source}>المصدر: {sourceLabel(latest?.source || indicator.adopted_source, indicator.name)}{evidence && ['historical', 'older', 'future'].includes(evidence.kind) && <span className={styles.note} role="note"> · {evidence.kind === 'future' ? 'سنة قياس تحتاج تدقيقاً' : 'قيمة قديمة نسبياً'}</span>}</p>
    </div>
    <span className={styles.spark}>{latest && <Sparkline values={indicator.values}/>}</span>
    {latest ? <div className={styles.figure}>
      <strong className="ui-ltr">{formatNumber(latest.value, {maximumFractionDigits: 2})}</strong>
      <span className={styles.unit}>{indicator.unit}</span>
      <span className={styles.year}>سنة القياس <span className="ui-ltr">{formatYear(latest.year)}</span> · {valueStatusLabels[latest.value_status] || 'نوع غير محدد'}</span>
    </div> : <div className={styles.figure} data-empty><span className={styles.year}>{indicator.hasSourceConflict ? 'بانتظار اعتماد المصدر' : 'لا توجد قيمة منشورة'}</span></div>}
    <div className={styles.rowSave}><SaveForLater compact item={{kind: 'indicator', href: '/yemen-in-numbers/indicator/' + encodeURIComponent(indicator.slug), title: indicator.name}}/></div>
  </article>;
}

export function CardSkeleton({count = 3, layout = 'stack'}) {
  return <div className={styles.skeletons} data-layout={layout} aria-hidden="true">{Array.from({length: count}, (_, index) => <div key={index} className={styles.skeleton}/>)}</div>;
}
