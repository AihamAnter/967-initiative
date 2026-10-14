import YemenMap from '@/components/yemen-map/YemenMap';

export const metadata = {
  title: 'اكتشف اليمن',
  description: 'أطلس جغرافي تفاعلي لمحافظات اليمن ومديرياتها ضمن هوية مبادرة 967.',
};

export default function YemenMapPage() {
  return <div className="ymap-page">
    <section className="ymap-hero">
      <div className="container">
        <span className="eyebrow">967 / أطلس جغرافي</span>
        <h1>اكتشف <span>اليمن</span></h1>
        <p>استكشف محافظات اليمن ومديرياتها، وتعرّف على جغرافيتها وتاريخها ومجتمعها عبر خريطة تفاعلية مبنية على بيانات حدود إدارية حقيقية.</p>
      </div>
    </section>
    <section className="ymap-section">
      <div className="container ymap-container">
        <YemenMap/>
      </div>
    </section>
  </div>;
}
