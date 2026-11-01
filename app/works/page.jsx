import NextLink from 'next/link';
import {getWorks} from '@/lib/data';
import {pageMetadata} from '@/lib/seo';
import WorkExplorer from '@/components/WorkExplorer';
import MediaSiblings from '@/components/media/MediaSiblings';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'الأعمال الإعلامية', description:'فيديوهات وحوارات وتغطيات من مبادرة 967. ابحث بحسب الموضوع والمنصة.', path:'/works'});
export default async function Works() {
  const works = await getWorks();
  return <div className="ed-page" style={{'--hue':'var(--c-ember)','--hue-2':'var(--c-violet)'}}>
    <div className="ed-mesh" aria-hidden="true"/>
    <header className="ed-pagehead"><div className="ed-wrap">
      <nav aria-label="مسار التصفح"><ol className="ed-crumbs"><li><NextLink href="/">الرئيسية</NextLink></li><li>الإعلام</li><li aria-current="page">الأعمال الإعلامية</li></ol></nav>
      <h1>الأعمال الإعلامية</h1>
      <p className="ed-dek">فيديوهات وحوارات وقصص تقرّب قضايا اليمن. ابحث عن موضوعك، وشاهد العمل هنا أو على منصته الأصلية.</p>
      <MediaSiblings current="/works"/>
    </div></header>
    <section className="ed-wrap" aria-label="مكتبة الأعمال"><WorkExplorer works={works}/></section>
  </div>;
}
