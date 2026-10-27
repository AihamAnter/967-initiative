import YemenDiscovery from '@/components/yemen-map/YemenDiscovery';
import {pageMetadata} from '@/lib/seo';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import KnowledgePageIntro from '@/components/knowledge/KnowledgePageIntro';
import Link from '@/components/SiteLink';

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
    <KnowledgePageIntro
      title="خريطة اليمن"
      category="أطلس 967 الجغرافي"
      description="استكشف محافظات اليمن ومديرياته وتعرّف على تاريخ الأماكن وطبيعتها ومعالمها.">
      <div className="directory-summary">
        <a href="#map">استكشف الخريطة</a>
        <Link href="/yemeni-figures">شخصيات يمنية</Link>
      </div>
    </KnowledgePageIntro>
    <YemenDiscovery key={(region||'')+':'+(district||'')} showFigures={sectionIsVisible('figures',settings.pageVisibility)} initialGovernorateId={region} initialDistrictId={district}/>
  </div>;
}
