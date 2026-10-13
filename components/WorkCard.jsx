import Link from 'next/link';
import {ArrowUpLeft, Play} from 'lucide-react';
import {workThumbnail} from '@/lib/media';

export default function WorkCard({work, index = 0}) {
  const thumb = workThumbnail(work);
  const content = <>
    <div className={'work-card-media tone-' + (index % 4)}>
      {thumb ? <img src={thumb} alt="" loading="lazy" /> : <>
        <span className="work-card-big">{work.art || '967'}</span>
        <span className="work-card-media-label">967 / MEDIA</span>
      </>}
      {!work.is_demo && <span className="play-overlay" aria-hidden="true"><Play size={27} fill="currentColor"/></span>}
      {work.is_demo && <span className="demo-label">نموذج توضيحي</span>}
    </div>
    <div className="work-card-meta"><span>{work.category}</span><span>{work.platform}</span></div>
    <h3>{work.title}</h3>
    <p>{work.summary}</p>
    {work.is_demo
      ? <span className="work-card-link muted-link">يظهر المحتوى بعد النشر</span>
      : <span className="work-card-link">افتح العمل وشاهده هنا <ArrowUpLeft size={17}/></span>}
  </>;
  return <article className="work-card">
    {work.is_demo ? <div className="work-card-static">{content}</div> :
      <Link className="work-card-click" href={'/works/' + encodeURIComponent(work.slug)} aria-label={'عرض العمل: ' + work.title}>{content}</Link>}
  </article>;
}
