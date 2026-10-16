import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  ArrowRight,
  ArrowUpLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Factory,
  Globe2,
  Mail,
  MapPin,
  MapPinned,
  Boxes,
  PackageCheck,
  Phone,
  Ruler,
  Scale,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {getYemeniCompanies, getYemeniCompany} from '@/lib/data';
import {formatNumber} from '@/lib/format';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd} from '@/lib/seo-schema';

export const dynamic = 'force-dynamic';

const currencyLabels = {YER: 'ر.ي', SAR: 'ر.س', USD: 'USD'};
const hasValue = value => value !== null && value !== undefined && value !== '';

export async function generateMetadata({params}) {
  const {id} = await params;
  const company = await getYemeniCompany(id);
  if (!company) notFound();
  return pageMetadata({
    title: `${company.name} | منتجات يمنية`,
    description: company.summary,
    path:detailPath('yemeni-products', company.id),
    noindex:company.isDemo,
    image:company.imageUrl,
  });
}

function ProfileFact({icon: Icon, label, value, ltr = false}) {
  return <div className="company-profile-fact">
    <Icon size={18}/><div><span>{label}</span><strong dir={ltr ? 'ltr' : undefined}>{value || 'غير متوفر — قيد التحقق'}</strong></div>
  </div>;
}

export default async function YemeniCompanyPage({params}) {
  const {id} = await params;
  const company = await getYemeniCompany(id);
  if (!company) notFound();
  const companies = await getYemeniCompanies();
  const related = companies.filter(item => item.id !== company.id && item.category === company.category).slice(0, 2);
  const mapQuery = [company.address, company.location, 'اليمن'].filter(Boolean).join('، ');
  const googleMapsUrl = company.googleMapsUrl || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null);

  return <>
    <JsonLd data={breadcrumbSchema([{name:'منتجات يمنية', path:'/yemeni-products'}, {name:company.name, path:detailPath('yemeni-products', company.id)}])}/>
    <section className="company-profile-hero">
      {company.imageUrl && <div className="company-profile-image"><Image src={company.imageUrl} alt={'صورة '+company.name} fill priority sizes="(max-width: 800px) 100vw, 52vw" style={{objectPosition: company.imagePosition}}/></div>}
      <div className="company-profile-copy">
        <Link href="/yemeni-products#directory" className="back-link"><ArrowRight size={17}/> العودة إلى دليل المنتجات</Link>
        <div className="company-profile-tags"><span>{company.category}</span><span>{company.scale}</span><span><MapPin size={13}/>{company.location}</span></div>
        <h1>{company.name}</h1>
        <p>{company.summary}</p>
        <div className="company-profile-status"><span/> {company.isDemo ? 'ملف تجريبي — بيانات الهوية والتواصل غير الموثقة موضحة بوضوح.' : 'ملف منشور من لوحة التحرير — يُحدّث عند توفر معلومات أحدث.'}</div>
      </div>
    </section>

    <section className="company-profile-body">
      <div className="container company-profile-layout">
        <div className="company-profile-main">
          <section>
            <span className="eyebrow">قصة المنشأة</span>
            <h2>عن {company.name}</h2>
            <p className="company-profile-lead">{company.story}</p>
          </section>

          <section>
            <div className="company-section-heading"><div><span className="eyebrow">المنتجات</span><h2>ماذا تقدم المنشأة؟</h2></div><strong>عدد المنتجات: {formatNumber(company.productDetails.length)}</strong></div>
            <div className="company-product-list">{company.productDetails.map((product, index) => <article className={product.imageUrl ? 'has-image' : ''} key={product.name}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {product.imageUrl && <div className="company-product-image"><Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 580px) 100vw, 170px"/></div>}
              <div className="company-product-content"><h3>{product.name}</h3><p>{product.description}</p>{product.format && <small><PackageCheck size={14}/>{product.format}</small>}
                {(product.size || product.weight || hasValue(product.quantity)) && <div className="company-product-specs">
                  {product.size && <span><Ruler size={14}/><b>الحجم</b>{product.size}</span>}
                  {product.weight && <span><Scale size={14}/><b>الوزن</b>{product.weight}</span>}
                  {hasValue(product.quantity) && <span><Boxes size={14}/><b>الكمية</b>{formatNumber(product.quantity)}</span>}
                </div>}
                {(hasValue(product.wholesalePrice) || hasValue(product.retailPrice)) && <div className="company-product-prices">
                  <CircleDollarSign size={18}/>
                  {hasValue(product.wholesalePrice) && <span><b>سعر الجملة</b>{formatNumber(product.wholesalePrice, {maximumFractionDigits: 2})} {currencyLabels[product.currency] || product.currency}</span>}
                  {hasValue(product.retailPrice) && <span><b>سعر التجزئة</b>{formatNumber(product.retailPrice, {maximumFractionDigits: 2})} {currencyLabels[product.currency] || product.currency}</span>}
                </div>}
              </div>
            </article>)}</div>
          </section>

          <section className="company-impact-section">
            <span className="eyebrow">القيمة المحلية</span>
            <h2>الأثر في الصناعة والتجارة</h2>
            <p>{company.impact}</p>
            <div>{company.strengths.map(item => <span key={item}><Factory size={15}/>{item}</span>)}</div>
          </section>

          <section>
            <span className="eyebrow">قنوات البيع</span>
            <h2>الأسواق التي تخدمها</h2>
            <div className="company-markets">{company.markets.map(item => <span key={item}><Store size={17}/>{item}</span>)}</div>
          </section>
        </div>

        <aside className="company-profile-aside">
          <div className="company-profile-panel">
            <h2>بيانات المنشأة</h2>
            <ProfileFact icon={Building2} label="الاسم القانوني" value={company.legalName}/>
            <ProfileFact icon={BriefcaseBusiness} label="نوع المنشأة" value={company.entityType}/>
            <ProfileFact icon={UsersRound} label="الملكية" value={company.ownership}/>
            <ProfileFact icon={UserRound} label="المالك أو المؤسس" value={company.owner}/>
            <ProfileFact icon={UserRound} label="الرئيس التنفيذي" value={company.ceo}/>
            <ProfileFact icon={CalendarDays} label="سنة التأسيس" value={company.founded}/>
            <ProfileFact icon={UsersRound} label="حجم الفريق" value={company.teamSize}/>
          </div>

          <div className="company-profile-panel">
            <h2>العنوان والتواصل</h2>
            <ProfileFact icon={MapPin} label="العنوان" value={company.address}/>
            <ProfileFact icon={Globe2} label="الموقع الإلكتروني" value={company.website} ltr/>
            <ProfileFact icon={Mail} label="البريد الإلكتروني" value={company.email} ltr/>
            <ProfileFact icon={Phone} label="الهاتف" value={company.phone} ltr/>
            {(company.website || googleMapsUrl) && <div className="company-contact-links">
              {googleMapsUrl && <a className="company-website-link company-maps-link" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">فتح الموقع في خرائط Google <MapPinned size={16}/></a>}
              {company.website && <a className="company-website-link" href={company.website} target="_blank" rel="noopener noreferrer">زيارة الموقع الإلكتروني <ExternalLink size={15}/></a>}
            </div>}
          </div>

          <div className="company-correction">
            <strong>هل تمثل هذه المنشأة؟</strong>
            <p>يمكن إرسال البيانات الرسمية وروابط التواصل لتوثيق الملف وتحديثه.</p>
            <Link href="/#contact">تحديث بيانات الشركة <ArrowUpLeft size={15}/></Link>
          </div>
        </aside>
      </div>
    </section>

    {related.length > 0 && <section className="company-related">
      <div className="container"><div className="company-related-head"><div><span className="eyebrow">من القطاع نفسه</span><h2>منشآت مشابهة</h2></div><Link href="/yemeni-products#directory" className="text-link">عرض الدليل كاملاً <ArrowUpLeft size={16}/></Link></div>
      <div className="company-related-grid">{related.map(item => <Link href={'/yemeni-products/' + item.id} key={item.id}>
        <div><span>{item.location}</span><h3>{item.name}</h3><p>{item.summary}</p></div><ArrowUpLeft size={21}/>
      </Link>)}</div></div>
    </section>}
  </>;
}
