import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpLeft, BadgeCheck, Factory, Handshake, PackageCheck} from 'lucide-react';
import YemeniProductDirectory from '@/components/YemeniProductDirectory';
import {formatNumber} from '@/lib/format';
import {getYemeniCompanies} from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'منتجات يمنية',
  description: 'دليل ذكي للتعريف بالشركات والمنتجات اليمنية ودعم الصناعة والتجارة المحلية.',
};

export default async function YemeniProductsPage() {
  const companies = await getYemeniCompanies();
  const productCount = companies.reduce((total, company) => total + company.products.length, 0);
  const isDemo = companies.every(company => company.isDemo);
  return <>
    <section className="products-hero">
      <Image src="/images/yemeni-products-hero.png" alt="مجموعة من المنتجات اليمنية تشمل البن والعسل والمنسوجات والفخار" fill priority sizes="100vw"/>
      <div className="products-hero-shade"/>
      <div className="container products-hero-content">
        <span className="eyebrow">دليل الصناعة والتجارة المحلية / 05</span>
        <h1>منتجات<br/><span>يمنية.</span></h1>
        <p>مساحة ذكية تقرّب المنتج المحلي من الناس، وتعرّف بالشركات والحرف والقصص التي تقف خلف ما نصنعه في اليمن.</p>
        <a className="btn btn-red" href="#directory">استكشف الدليل <ArrowUpLeft size={18}/></a>
      </div>
      <div className="products-hero-stats" aria-label="إحصاءات الدليل">
        <div><strong>{formatNumber(companies.length)}</strong><span>{isDemo ? 'شركات تجريبية' : 'شركات منشورة'}</span></div>
        <div><strong>{formatNumber(productCount)}</strong><span>منتجاً أولياً</span></div>
        <div><strong>{formatNumber(new Set(companies.map(company => company.location)).size)}</strong><span>محافظات</span></div>
      </div>
    </section>

    <section className="products-intro">
      <div className="container products-intro-grid">
        <div><span className="eyebrow">اشترِ بوعي</span><h2>اعرف من يصنع.<br/>واعرف ماذا تدعم.</h2></div>
        <div><p>كل بطاقة تلخص الشركة وموقعها ومنتجاتها ونقاط قوتها، لتجعل اكتشاف البدائل المحلية أسرع وأكثر وضوحاً.</p><p className="products-demo-note"><BadgeCheck size={17}/>{isDemo ? 'البيانات الحالية نماذج توضيحية حتى تُضاف الشركات من لوحة التحرير.' : 'تُعرض هنا الشركات المنشورة من لوحة التحرير.'}</p></div>
      </div>
    </section>

    <section className="products-directory-section" id="directory">
      <div className="container"><YemeniProductDirectory companies={companies}/></div>
    </section>

    <section className="products-standards">
      <div className="container">
        <div className="products-standards-head"><span className="eyebrow">معايير العرض</span><h2>دليل مفيد، لا إعلان مبهم.</h2></div>
        <div className="products-standard-grid">
          <div><Factory size={24}/><h3>صناعة محلية</h3><p>إبراز موضع الإنتاج والقيمة التي تبقى داخل الاقتصاد المحلي.</p></div>
          <div><PackageCheck size={24}/><h3>معلومات واضحة</h3><p>اسم المنتج، مصدره، وطريقة الوصول إليه دون ادعاءات غير موثقة.</p></div>
          <div><Handshake size={24}/><h3>فرصة عادلة</h3><p>إتاحة المساحة للمشاريع الصغيرة والحرفيين إلى جانب الشركات الأكبر.</p></div>
        </div>
      </div>
    </section>

    <section className="products-suggest" id="suggest-company">
      <div className="container"><div><span>هل تعرف شركة أو منتجاً يمنياً يستحق الظهور؟</span><h2>ساعدنا على توسيع الدليل.</h2></div><Link className="btn btn-white" href="/#contact">اقترح شركة <ArrowUpLeft size={18}/></Link></div>
    </section>
  </>;
}
