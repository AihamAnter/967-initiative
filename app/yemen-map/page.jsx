import YemenDiscovery from '@/components/yemen-map/YemenDiscovery';
import {getYemeniFigures} from '@/lib/data';

export const metadata = {
  title: 'اكتشف اليمن',
  description: 'أطلس تفاعلي لمحافظات اليمن ومديرياتها ودليل لشخصيات يمنية معاصرة وتاريخية.',
};

export default async function YemenMapPage() {
  const figures = await getYemeniFigures();
  return <div className="ymap-page">
    <section className="ymap-hero">
      <div className="container">
        <span className="eyebrow">967 / أطلس جغرافي</span>
        <h1>اكتشف <span>اليمن</span></h1>
        <p>استكشف محافظات اليمن ومديرياتها، وتعرّف على جغرافيتها وشخصياتها المعاصرة والتاريخية عبر تجربة واحدة مترابطة.</p>
      </div>
    </section>
    <YemenDiscovery figures={figures}/>
  </div>;
}
