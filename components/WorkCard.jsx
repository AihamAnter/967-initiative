import Link from '@/components/SiteLink';
import {Film, Play} from 'lucide-react';
import {parseMediaUrl, workThumbnail} from '@/lib/media';
import {formatArabicDate} from '@/lib/format';
import SaveForLater from './reading/SaveForLater';
import SafeImage from './front/SafeImage';
import Resilient from './front/Resilient';

// Media card (iteration 2): full-bleed picture with a legible scrim, the
// headline as the link (whole card clickable), save as a separate control.
export default function WorkCard({work, returnTo, headingLevel = 3}) {
  const demo = work.is_demo || work.isDemo;
  const href = work.debate_slug ? '/debates/' + encodeURIComponent(work.debate_slug) : '/works/' + encodeURIComponent(work.slug) + (returnTo ? '?from=' + encodeURIComponent(returnTo) : '');
  const embedded = Boolean(parseMediaUrl(work.external_url).embedUrl);
  const Heading = 'h' + headingLevel;
  return <article className="ed-media-card">
    <div className="ed-media-thumb" aria-hidden="true">
      <span className="ed-media-placeholder"><Film size={40} strokeWidth={1.3}/></span>
      <Resilient name="work-thumb" quiet><SafeImage src={workThumbnail(work)} sizes="(max-width: 700px) 100vw, (max-width: 1180px) 50vw, 640px" className="ed-media-img"/></Resilient>
    </div>
    <div className="ed-media-scrim" aria-hidden="true"/>
    <div className="ed-media-body">
      <p className="ed-media-tag"><Play size={12} fill="currentColor" aria-hidden="true"/> {[work.category, work.platform].filter(Boolean).join(' · ') || 'عمل إعلامي'}</p>
      <Heading className="ed-media-title">{demo ? work.title : <Link href={href}>{work.title}</Link>}</Heading>
      {work.summary && <p className="ed-media-summary">{work.summary}</p>}
      <p className="ed-media-meta">{work.published_at && <time dateTime={work.published_at}>{formatArabicDate(work.published_at)}</time>}{demo ? <span>نموذج توضيحي · يظهر بعد النشر</span> : <span>{embedded ? 'مشاهدة داخل الموقع متاحة' : 'رابط المشاهدة على المنصة الأصلية'}</span>}</p>
    </div>
    {!demo && work.slug && <div className="ed-media-save"><SaveForLater compact item={{kind: work.debate_slug ? 'debate' : 'work', href: work.debate_slug ? '/debates/' + encodeURIComponent(work.debate_slug) : '/works/' + encodeURIComponent(work.slug), title: work.title}}/></div>}
  </article>;
}
