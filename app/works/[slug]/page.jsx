export const dynamic = 'force-dynamic';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {ArrowRight, CalendarDays, ArrowUpLeft, ExternalLink} from 'lucide-react';
import {getWorks} from '@/lib/data';
import {formatArabicDate} from '@/lib/format';
import {safeExternalUrl, workThumbnail} from '@/lib/media';
import MediaViewer from '@/components/MediaViewer';
import WorkCard from '@/components/WorkCard';
import InlineTarget from '@/components/inline/InlineTarget';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd, workSchema} from '@/lib/seo-schema';
import {collectionDefaults,listReturnPath} from '@/lib/listState';
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

export default async function WorkDetails({params,searchParams}) {
  const {slug} = await params;
  const works = await getWorks();
  const work = works.find(item => item.slug === slug);
  if (!work) notFound();
  if(work.debate_slug)redirect('/debates/'+encodeURIComponent(work.debate_slug));
  const related = works.filter(item => item.id !== work.id && item.category === work.category).slice(0, 3);
  if (related.length < 3) related.push(...works.filter(item => item.id !== work.id && !related.some(x => x.id === item.id)).slice(0, 3 - related.length));
  const date = work.published_at ? new Date(work.published_at) : null;
  const external = safeExternalUrl(work.external_url);
  const query=await searchParams;
  const returnTo=listReturnPath(query.from,'/works',collectionDefaults.works,'#works-results');

  return <>
    <InlineTarget kind="work" id={work.id} slug={work.slug} title={work.title} href={detailPath('works',work.slug)} isDemo={work.is_demo||work.isDemo}/>
    <JsonLd data={workSchema(work)}/>
    <JsonLd data={breadcrumbSchema([{name:'الأعمال الإعلامية', path:'/works'}, {name:work.title, path:detailPath('works', work.slug)}])}/>
    <section className="work-detail-head"><div className="container">
      <Link href={returnTo} className="back-link"><ArrowRight size={17}/> العودة إلى الأعمال</Link>
      <div className="work-detail-taxonomy"><span>{work.category}</span><span className="work-detail-dot"/><span>{work.platform}</span></div>
      <h1>{work.title}</h1>
      <div className="work-detail-subhead">
        <p>من أعمال مبادرة 967 الإعلامية والمجتمعية</p>
        {date && !Number.isNaN(date.getTime()) && <span><CalendarDays size={16}/>{formatArabicDate(date)}</span>}
      </div>
      <CorrectionLink title={work.title} path={detailPath('works',work.slug)} id={work.id}/>
    </div></section>
    <section className="work-detail-body"><div className="container">
      <MediaViewer work={work}/>
      <ContentReadingAction kind="work" href={detailPath('works',work.slug)} title={work.title}/>
      <div className="work-detail-info">
        <div><span className="eyebrow">عن هذا العمل</span><h2>التفاصيل</h2><p className="work-detail-description">{work.summary || 'لم يُضف وصف لهذا العمل بعد.'}</p></div>
        <aside className="work-detail-aside"><h3>معلومات العمل</h3><dl><div><dt>المنصة</dt><dd>{work.platform}</dd></div><div><dt>التصنيف</dt><dd>{work.category}</dd></div></dl>{external && <a href={external} target="_blank" rel="noopener noreferrer">المنشور الأصلي <ExternalLink size={16}/></a>}</aside>
      </div>
    </div></section>
    {related.length > 0 && <section className="section section-alt"><div className="container">
      <div className="work-related-head"><div><span className="eyebrow">من المكتبة</span><h2>أعمال أخرى قد تهمك</h2></div><Link href="/works" className="text-link">جميع الأعمال <ArrowUpLeft size={18}/></Link></div>
      <div className="work-grid">{related.map((item, i) => <WorkCard key={item.id} work={item} index={i}/>)}</div>
    </div></section>}
  </>;
}
