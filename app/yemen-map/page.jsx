import YemenDiscovery from '@/components/yemen-map/YemenDiscovery';
import {pageMetadata} from '@/lib/seo';
import {getYemeniFigures} from '@/lib/data';
import {yemenGovernorates,toFigureDirectoryCard} from '@/lib/yemeniFigures';

export const metadata = pageMetadata({
  title: 'اكتشف اليمن',
  description: 'أطلس تفاعلي لمحافظات اليمن ومديرياتها ودليل لشخصيات يمنية معاصرة وتاريخية.',
  path:'/yemen-map',
});

export default async function YemenMapPage({searchParams}) {
  const figures = await getYemeniFigures();
  const params = await searchParams;
  const region = yemenGovernorates.some(x=>x.id===params.region) ? params.region : null;
  const district = typeof params.district==='string' && /^YE\d{4}$/.test(params.district) ? params.district : null;
  return <div className="ymap-page">
    <link rel="preload" href="/data/yemen-map/yemen-boundaries.json" as="fetch" crossOrigin="anonymous"/>
    <section className="ymap-hero">
      <div className="container">
        <span className="eyebrow">أطلس 967 الجغرافي</span>
        <h1>اكتشف <span>اليمن</span></h1>
        <p>استكشف المحافظات والمديريات والشخصيات المرتبطة بها.</p>
      </div>
    </section>
    <YemenDiscovery key={(region||'')+':'+(district||'')} figures={figures.map(toFigureDirectoryCard)} initialGovernorateId={region} initialDistrictId={district}/>
  </div>;
}
