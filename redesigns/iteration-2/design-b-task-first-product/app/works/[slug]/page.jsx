import {Suspense} from 'react';
import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {ArrowLeft, CalendarDays, ExternalLink} from 'lucide-react';
import ContextBackLink from '@/components/ContextBackLink';
import MediaViewer from '@/components/MediaViewer';
import InlineTarget from '@/components/inline/InlineTarget';
import CorrectionLink from '@/components/CorrectionLink';
import ContentReadingAction from '@/components/reading/ContentReadingAction';
import {CardSkeleton, MediaCard} from '@/components/wayfinder/Cards';
import SectionBoundary, {SectionUnavailable} from '@/components/ui/SectionBoundary';
import {getRelatedWorks, getWork} from '@/lib/data';
import {formatArabicDate} from '@/lib/format';
import {safeExternalUrl, workThumbnail} from '@/lib/media';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd, workSchema} from '@/lib/seo-schema';
import styles from './work.module.css';

export const dynamic = 'force-dynamic';

// One indexed row for the record (instead of scanning the whole catalogue);
// related works stream in afterwards so they never delay the player.
export async function generateMetadata({params}) {
  const {slug} = await params;
  const work = await getWork(slug);
  if (!work) notFound();
  const image = workThumbnail(work);
  return pageMetadata({
    title: work.title,
    description: work.summary || 'عمل من إنتاج مبادرة 967',
    path:work.debate_slug?detailPath('debates',work.debate_slug):detailPath('works', work.slug), image, noindex:work.is_demo || work.isDemo,
  });
}

async function RelatedWorks({work}) {
  let related;
  try {related = await getRelatedWorks(work.id, work.category, 3);}
  catch {return <SectionUnavailable title="الأعمال المرتبطة"/>;}
  if (!related.length) return <p className={styles.muted}>لا توجد أعمال أخرى منشورة بعد.</p>;
  return <ul className={styles.related}>{related.map(item => <li key={item.id}><MediaCard work={item}/></li>)}</ul>;
}

export default async function WorkDetails({params}) {
  const {slug} = await params;
  const work = await getWork(slug);
  if (!work) notFound();
  if(work.debate_slug)redirect('/debates/'+encodeURIComponent(work.debate_slug));
  const date = work.published_at ? new Date(work.published_at) : null;
  const external = safeExternalUrl(work.external_url);
  const path = detailPath('works', work.slug);

  return <div className="ui-page">
    <InlineTarget kind="work" id={work.id} slug={work.slug} title={work.title} href={path} isDemo={work.is_demo||work.isDemo}/>
    <JsonLd data={workSchema(work)}/>
    <JsonLd data={breadcrumbSchema([{name:'الأعمال الإعلامية', path:'/works'}, {name:work.title, path}])}/>
    <div className="ui-wrap">
      <ContextBackLink fallback="/works#works-results" label="العودة إلى الأعمال"/>
      <article className={styles.layout} aria-labelledby="work-title">
        <div className={styles.main}>
          <p className={styles.trail}><Link href="/works">الأعمال الإعلامية</Link>{work.category && <><span aria-hidden="true">/</span><span>{work.category}</span></>}</p>
          <h1 id="work-title">{work.title}</h1>
          <div className={styles.viewer}><MediaViewer work={work}/></div>
          <div className={styles.actions}>
            <ContentReadingAction kind="work" href={path} title={work.title}/>
          </div>
          <section className={styles.about} aria-labelledby="work-about">
            <h2 id="work-about">عن هذا العمل</h2>
            <p>{work.summary || 'لم يُضف وصف لهذا العمل بعد.'}</p>
          </section>
        </div>
        <aside className={styles.facts} aria-label="معلومات العمل">
          <h2>معلومات العمل</h2>
          <dl>
            <div><dt>المنصة</dt><dd>{work.platform || '—'}</dd></div>
            <div><dt>التصنيف</dt><dd>{work.category || '—'}</dd></div>
            {date && !Number.isNaN(date.getTime()) && <div><dt>تاريخ النشر</dt><dd><CalendarDays size={15} aria-hidden="true"/> <time dateTime={work.published_at}>{formatArabicDate(date)}</time></dd></div>}
            <div><dt>الجهة</dt><dd>من أعمال مبادرة 967 الإعلامية والمجتمعية</dd></div>
          </dl>
          {external && <a className={styles.correction} href={external} target="_blank" rel="noopener noreferrer">المنشور الأصلي <ExternalLink size={15} aria-hidden="true"/></a>}
          <CorrectionLink title={work.title} path={path} id={work.id} className={styles.correction}/>
        </aside>
      </article>

      <section className={styles.more} aria-labelledby="related-title">
        <div className={styles.moreHead}><h2 id="related-title">أعمال أخرى قد تهمك</h2><Link href="/works" className="ui-link">جميع الأعمال <ArrowLeft size={16} aria-hidden="true"/></Link></div>
        <SectionBoundary name="related-works" title="الأعمال المرتبطة"><Suspense fallback={<CardSkeleton count={3}/>}><RelatedWorks work={work}/></Suspense></SectionBoundary>
      </section>
    </div>
  </div>;
}
