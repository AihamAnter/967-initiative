'use client';
import {useState} from 'react';
import {ExternalLink, Play, PlayCircle, ShieldCheck} from 'lucide-react';
import {mediaLabel, parseMediaUrl, workThumbnail} from '@/lib/media';

export default function MediaViewer({work}) {
  const [activated, setActivated] = useState(false);
  const media = parseMediaUrl(work.external_url);
  const thumbnail = workThumbnail(work);
  const canEmbed = Boolean(media.embedUrl);

  return <div className="media-frame-outer">
    <div className={'media-frame media-frame-' + (canEmbed ? media.ratio : 'landscape')}>
      {!activated || !canEmbed ? <>
        {thumbnail && <img className="media-cover" src={thumbnail} alt=""/>}
        <div className="media-cover-shade" />
        <div className="media-cover-brand">967 <span>/</span> MEDIA</div>
        {canEmbed ? <button type="button" className="media-play" onClick={() => setActivated(true)} aria-label={'تشغيل ' + work.title}>
          <span className="media-play-circle"><Play size={33} fill="currentColor"/></span>
          <strong>تشغيل العمل هنا</strong>
          <small>المصدر: {mediaLabel(media.kind)}</small>
        </button> : <div className="media-unsupported"><PlayCircle size={42}/><h2>هذا العمل متاح على المنصة الأصلية</h2><p>لا يمكن تضمين رابط هذا العمل مباشرة داخل الموقع.</p>{media.externalUrl && <a href={media.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red">مشاهدة العمل <ExternalLink size={17}/></a>}</div>}
      </> : media.kind === 'video' ?
        <video controls playsInline autoPlay className="media-video" src={media.embedUrl} poster={thumbnail || undefined}>متصفحك لا يدعم تشغيل الفيديو.</video>
        : <iframe
          className="media-iframe" src={media.embedUrl} title={'مشاهدة: ' + work.title}
          loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share; fullscreen"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
    </div>
    <div className="media-viewer-footer">
      <span><ShieldCheck size={16}/> تشغيل المحتوى المضمّن يتم عبر المنصة الأصلية وقد يتطلب قبول ملفات تعريف الارتباط.</span>
      {media.externalUrl && <a href={media.externalUrl} target="_blank" rel="noopener noreferrer">فتح على {mediaLabel(media.kind)} <ExternalLink size={15}/></a>}
    </div>
  </div>;
}
