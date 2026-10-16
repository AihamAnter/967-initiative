import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpLeft, Play, Film} from 'lucide-react';
import {workThumbnail, canOptimizeImage} from '@/lib/media';
import {formatArabicDate} from '@/lib/format';

export default function WorkCard({work, index = 0}) {
  const thumb = workThumbnail(work);
  const content = <>
    <div className={'work-card-media tone-' + (index % 4)}>
      {thumb ? <Image src={thumb} alt="" fill sizes="(max-width:420px) 95vw, (max-width:760px) 45vw, 30vw" unoptimized={!canOptimizeImage(thumb)}/> : <>
        <Film size={38} strokeWidth={1}/>
        <span className="work-card-media-label">{work.platform || 'محتوى إعلامي'}</span>
      </>}
      {!work.is_demo && <span className="play-overlay" aria-hidden="true"><Play size={27} fill="currentColor"/></span>}
      {work.is_demo && <span className="demo-label">نموذج توضيحي</span>}
    </div>
    <div className="work-card-meta"><span>{work.category}</span><span>{work.platform}</span></div>
    <h3>{work.title}</h3>
    <p>{work.summary}</p>
    {work.published_at && <time className="work-published" dateTime={work.published_at}>{formatArabicDate(work.published_at)}</time>}
    {work.is_demo
      ? <span className="work-card-link muted-link">يظهر المحتوى بعد النشر</span>
      : <span className="work-card-link">افتح العمل وشاهده هنا <ArrowUpLeft size={17}/></span>}
  </>;
  return <article className="work-card">
    {work.is_demo ? <div className="work-card-static">{content}</div> :
      <Link className="work-card-click" href={'/works/' + encodeURIComponent(work.slug)}>{content}</Link>}
  </article>;
}
