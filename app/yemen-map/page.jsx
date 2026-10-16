import YemenDiscovery from '@/components/yemen-map/YemenDiscovery';
import {getYemeniFigures} from '@/lib/data';
import {yemenGovernorates} from '@/lib/yemeniFigures';

export const metadata = {
  title: 'اكتشف اليمن',
  description: 'أطلس تفاعلي لمحافظات اليمن ومديرياتها ودليل لشخصيات يمنية معاصرة وتاريخية.',
  alternates:{canonical:'/yemen-map'},
};

export default async function YemenMapPage({searchParams}) {
  const figures = await getYemeniFigures();
  const params = await searchParams;
  const region = yemenGovernorates.some(x=>x.id===params.region) ? params.region : null;
  const district = typeof params.district==='string' && /^YE\d{4}$/.test(params.district) ? params.district : null;
  return <div className="ymap-page">
    <section className="ymap-hero">
      <div className="container">
        <span className="eyebrow">أطلس 967 الجغرافي</span>
        <h1>اكتشف <span>اليمن</span></h1>
        <p>استكشف محافظات اليمن ومديرياتها، وتعرّف على جغرافيتها وشخصياتها المعاصرة والتاريخية عبر تجربة واحدة مترابطة.</p>
      </div>
    </section>
    <YemenDiscovery key={(region||'')+':'+(district||'')} figures={figures} initialGovernorateId={region} initialDistrictId={district}/>
  </div>;
}
