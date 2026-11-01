import ContextBackLink from '@/components/ContextBackLink';
export const dynamic = 'force-dynamic';
import Link from '@/components/SiteLink';
import {notFound,redirect} from 'next/navigation';
import {ArrowRight, ExternalLink} from 'lucide-react';
import {getWorks} from '@/lib/data';
import {formatArabicDate} from '@/lib/format';
import {mediaLabel, parseMediaUrl, safeExternalUrl, workThumbnail} from '@/lib/media';
import MediaViewer from '@/components/MediaViewer';
import WorkCard from '@/components/WorkCard';
import InlineTarget from '@/components/inline/InlineTarget';
import Resilient from '@/components/front/Resilient';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd, workSchema} from '@/lib/seo-schema';
import CorrectionLink from '@/components/CorrectionLink';
import ContentReadingAction from '@/components/reading/ContentReadingAction';

export async function generateMetadata({params}) {
  const {slug} = await params;
  const work = (await getWorks()).find(item => item.slug === slug);
  if (!work) notFound();
  const image = workThumbnail(work);
  return pageMetadata({
    title: work.title,
    description: work.summary || 'عمل من إنتاج مبادرة 967',
    path:work.debate_slug?detailPath('debates',work.debate_slug):detailPath('works', work.slug), image, noindex:work.is_demo || work.isDemo,
  });
}

export default async function WorkDetails({params}) {
  const {slug} = await params;
  const works = await getWorks();
  const work = works.find(item => item.slug === slug);
  if (!work) notFound();
  if(work.debate_slug)redirect('/debates/'+encodeURIComponent(work.debate_slug));
  const related = works.filter(item => item.id !== work.id && item.category === work.category).slice(0, 3);
  if (related.length < 3) related.push(...works.filter(item => item.id !== work.id && !related.some(x => x.id === item.id)).slice(0, 3 - related.length));
  const date = work.published_at ? new Date(work.published_at) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const external = safeExternalUrl(work.external_url);
  const provider = mediaLabel(parseMediaUrl(work.external_url).kind);

  return <div className="ed-page ed-work" style={{'--hue':'var(--c-ember)','--hue-2':'var(--c-violet)'}}>
    <div className="ed-mesh" aria-hidden="true"/>
    <InlineTarget kind="work" id={work.id} slug={work.slug} title={work.title} href={detailPath('works',work.slug)} isDemo={work.is_demo||work.isDemo}/>
    <JsonLd data={workSchema(work)}/>
    <JsonLd data={breadcrumbSchema([{name:'الأعمال الإعلامية', path:'/works'}, {name:work.title, path:detailPath('works', work.slug)}])}/>
    <header className="ed-detailhead"><div className="ed-wrap">
      <ContextBackLink fallback="/works#works-results" label="العودة إلى الأعمال الإعلامية" className="ed-back" leading={<ArrowRight size={17} aria-hidden="true"/>}/>
      <p className="ed-kicker">{[work.category, work.platform].filter(Boolean).join(' · ') || 'الأعمال الإعلامية'}</p>
      <h1>{work.title}</h1>
      <p className="ed-meta ed-work-meta"><span>من أعمال مبادرة 967</span>{validDate && <time dateTime={date.toISOString()}>{formatArabicDate(date)}</time>}{(work.is_demo||work.isDemo) && <span className="ed-status" data-tone="caution">نموذج توضيحي</span>}</p>
    </div></header>
    <section className="ed-wrap ed-work-player" aria-label="مشاهدة العمل">
      <Resilient name="media-viewer" label="تعذّر تجهيز المشغل. يمكنك فتح العمل على منصته الأصلية من التفاصيل أدناه."><MediaViewer work={work}/></Resilient>
    </section>
    <section className="ed-wrap ed-work-body" aria-labelledby="work-about-title">
      <div className="ed-work-text">
        <h2 id="work-about-title" className="ed-section-label">عن هذا العمل</h2>
        <p className="ed-work-summary">{work.summary || 'لم يُضف وصف لهذا العمل بعد.'}</p>
        <div className="ed-actions"><ContentReadingAction kind="work" href={detailPath('works',work.slug)} title={work.title}/><CorrectionLink title={work.title} path={detailPath('works',work.slug)} id={work.id} className="ed-correction"/></div>
      </div>
      <aside className="ed-work-facts" aria-label="معلومات العمل">
        <dl>
          {work.platform && <div><dt>المنصة</dt><dd>{work.platform}</dd></div>}
          {work.category && <div><dt>الموضوع</dt><dd>{work.category}</dd></div>}
          {validDate && <div><dt>تاريخ النشر</dt><dd>{formatArabicDate(date)}</dd></div>}
        </dl>
        {external && <a className="ed-button" data-variant="quiet" href={external} target="_blank" rel="noopener noreferrer">المنشور الأصلي على {provider} <ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (يفتح في نافذة جديدة)</span></a>}
      </aside>
    </section>
    {related.length > 0 && <section className="ed-wrap ed-work-related" aria-labelledby="related-title">
      <div className="ed-section-head"><h2 id="related-title">من المكتبة</h2><p>أعمال أخرى قد تهمك.</p><div className="ed-section-links"><Link href="/works" className="ed-link">جميع الأعمال</Link></div></div>
      <ul className="ed-media-grid" data-count={Math.min(related.length,3)}>{related.map(item => <li key={item.id}><WorkCard work={item}/></li>)}</ul>
    </section>}
  </div>;
}
