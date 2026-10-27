import YemenDiscovery from '@/components/yemen-map/YemenDiscovery';
import {pageMetadata} from '@/lib/seo';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {yemenGovernorates} from '@/lib/yemeniFigures';

export const metadata = pageMetadata({
  title: 'خريطة اليمن',
  description: 'أطلس تفاعلي لمحافظات اليمن ومديرياتها وأماكنها ومعالمها.',
  path:'/yemen-map',
});

export default async function YemenMapPage({searchParams}) {
  const settings=await getSiteSettings();
  const params = await searchParams;
  const region = yemenGovernorates.some(x=>x.id===params.region) ? params.region : null;
  const district = typeof params.district==='string' && /^YE\d{4}$/.test(params.district) ? params.district : null;
  return <div className="ymap-page">
    <link rel="preload" href="/data/yemen-map/yemen-boundaries.json" as="fetch" crossOrigin="anonymous"/>
    <section className="ymap-hero" data-section-tone="green">
      <div className="container">
        <span className="eyebrow">المعرفة / خريطة اليمن</span>
        <h1>خريطة <span>اليمن</span></h1>
        <p>استكشف محافظات اليمن ومديرياته وتعرّف على تاريخ الأماكن وطبيعتها ومعالمها.</p>
      </div>
    </section>
    <YemenDiscovery key={(region||'')+':'+(district||'')} showFigures={sectionIsVisible('figures',settings.pageVisibility)} initialGovernorateId={region} initialDistrictId={district}/>
  </div>;
}
