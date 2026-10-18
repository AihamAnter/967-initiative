import Link from 'next/link';
import WorkThumbnail from './WorkThumbnail';
import {ArrowUpLeft, Play, Film} from 'lucide-react';
import {workThumbnail, parseMediaUrl} from '@/lib/media';
import {formatArabicDate} from '@/lib/format';

export default function WorkCard({work, index = 0, returnTo}) {
  const thumb = workThumbnail(work);
  const embedded = Boolean(parseMediaUrl(work.external_url).embedUrl);
  const content = <>
    <div className={'work-card-media tone-' + (index % 4)}>
      <div className="work-card-placeholder" aria-hidden="true"><Film size={30} strokeWidth={1.5}/><span>{work.category || 'من أعمال 967'}</span><strong>{work.title}</strong><span className="work-card-media-label">{work.platform || 'محتوى إعلامي'}</span></div>
      {thumb && <WorkThumbnail src={thumb}/>}
      {!work.is_demo && <span className="play-overlay" aria-hidden="true"><Play size={27} fill="currentColor"/></span>}
      {work.is_demo && <span className="demo-label">نموذج توضيحي</span>}
    </div>
    <div className="work-card-meta"><span>{work.category}</span><span>{work.platform}</span></div>
    <h3>{work.title}</h3>
    <p>{work.summary}</p>
    {work.published_at && <time className="work-published" dateTime={work.published_at}>{formatArabicDate(work.published_at)}</time>}
    {work.is_demo
      ? <span className="work-card-link muted-link">يظهر المحتوى بعد النشر</span>
      : <span className="work-card-link">{embedded ? 'افتح العمل وشاهده' : 'التفاصيل ورابط المشاهدة'} <ArrowUpLeft size={17}/></span>}
  </>;
  return <article className="work-card">
    {work.is_demo ? <div className="work-card-static">{content}</div> :
      <Link className="work-card-click" href={'/works/' + encodeURIComponent(work.slug)+(returnTo?'?from='+encodeURIComponent(returnTo):'')}>{content}</Link>}
  </article>;
}
