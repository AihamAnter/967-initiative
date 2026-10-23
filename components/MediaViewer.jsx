'use client';
import {useEffect,useState} from 'react';
import {ExternalLink, LoaderCircle, Play, PlayCircle, ShieldCheck} from 'lucide-react';
import {mediaLabel, parseMediaUrl, workThumbnail} from '@/lib/media';

export default function MediaViewer({work}) {
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const media = parseMediaUrl(work.external_url);
  const thumbnail = workThumbnail(work);
  const canEmbed = Boolean(media.embedUrl);
  const providerMayBlock = canEmbed && media.kind !== 'video';
  useEffect(()=>{
    if(!activated||!loading)return;
    const timer=setTimeout(()=>{setLoading(false);setFailed(true);},20000);
    return()=>clearTimeout(timer);
  },[activated,loading]);

  return <div className="media-frame-outer">
    <div className={'media-frame media-frame-' + (canEmbed ? media.ratio : 'landscape')}>
      {!activated || !canEmbed || failed ? <>
        {thumbnail && <img className="media-cover" src={thumbnail} alt="" onError={event=>{event.currentTarget.style.display='none';}}/>}
        <div className="media-cover-shade" />
        <div className="media-cover-brand">967 <span>/</span> MEDIA</div>
        {canEmbed && !failed ? <button type="button" className="media-play" onClick={() => {setLoading(true);setActivated(true);}} aria-label={(providerMayBlock?'محاولة تشغيل العمل هنا: ':'تشغيل العمل هنا: ') + work.title + '، المصدر: ' + mediaLabel(media.kind)}>
          <span className="media-play-circle"><Play size={33} fill="currentColor"/></span>
          <strong>{providerMayBlock?'محاولة تشغيل العمل هنا':'تشغيل العمل هنا'}</strong>
          <small>المصدر: {mediaLabel(media.kind)}</small>
        </button> : <div className="media-unsupported" role={failed?'alert':undefined}><PlayCircle size={42}/><h2>{failed?'تعذر تحميل المشغل':media.externalUrl?'هذا العمل متاح على المنصة الأصلية':'رابط المشاهدة غير متاح حالياً'}</h2><p>{failed?'قد تمنع المنصة التضمين أو يكون الاتصال منقطعاً. يمكنك فتح المصدر مباشرة.':media.externalUrl?'لا يمكن تضمين رابط هذا العمل مباشرة داخل الموقع.':'يمكنك العودة إلى مكتبة الأعمال أو إبلاغ المبادرة عبر صفحة التواصل.'}</p>{media.externalUrl && <a href={media.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red">فتح الفيديو على {mediaLabel(media.kind)} <ExternalLink size={17}/></a>}{failed&&<button className="btn btn-outline" type="button" onClick={()=>{setFailed(false);setActivated(false);setLoading(false);}}>إعادة المحاولة</button>}</div>}
      </> : media.kind === 'video' ?
        <video controls playsInline autoPlay aria-label={work.title} className="media-video" src={media.embedUrl} poster={thumbnail || undefined} onLoadedData={()=>setLoading(false)} onError={()=>{setLoading(false);setFailed(true);}}>متصفحك لا يدعم تشغيل الفيديو.</video>
        : <iframe
          className="media-iframe" src={media.embedUrl} title={'مشاهدة: ' + work.title}
          onLoad={()=>setLoading(false)}
          onError={()=>{setLoading(false);setFailed(true);}}
          loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share; fullscreen"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
      {activated&&loading&&!failed&&<div className="media-loading" role="status"><LoaderCircle className="spin" size={24}/><span>جارٍ تحميل المشغل…</span></div>}
    </div>
    <div className="media-viewer-footer">
      <span><ShieldCheck size={16}/> {providerMayBlock?'قد تمنع المنصة التضمين أو تتطلب قبول ملفات تعريف الارتباط. إذا لم يظهر الفيديو، افتحه على المنصة الأصلية.':'تشغيل المحتوى المضمّن يتم عبر المنصة الأصلية.'}</span>
      {media.externalUrl && <a href={media.externalUrl} target="_blank" rel="noopener noreferrer">فتح على {mediaLabel(media.kind)} <ExternalLink size={15}/></a>}
    </div>
  </div>;
}
