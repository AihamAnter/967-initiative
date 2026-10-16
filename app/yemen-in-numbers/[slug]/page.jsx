import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight, ArrowUpLeft, Database} from 'lucide-react';
import IndicatorCard from '@/components/IndicatorCard';
import {getStatDomain} from '@/lib/data';
import {formatNumber} from '@/lib/format';
import {detailPath, pageMetadata} from '@/lib/seo';
import {breadcrumbSchema, JsonLd} from '@/lib/seo-schema';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const {slug} = await params;
  const domain = await getStatDomain(slug);
  if (!domain) notFound();
  return pageMetadata({title:domain.name, description:domain.description, path:detailPath('yemen-in-numbers', domain.slug), noindex:!domain.indicators.length});
}

export default async function StatDomainPage({params}) {
  const {slug} = await params;
  const domain = await getStatDomain(slug);
  if (!domain) notFound();
  return <>
    <JsonLd data={breadcrumbSchema([{name:'اليمن بالأرقام', path:'/yemen-in-numbers'}, {name:domain.name, path:detailPath('yemen-in-numbers', domain.slug)}])}/>
    <section className="stat-page-head"><div className="container">
      <Link className="back-link" href="/yemen-in-numbers"><ArrowRight size={17}/> العودة إلى اليمن بالأرقام</Link>
      <span className="eyebrow">{domain.section?.name || 'مجال وطني'}</span>
      <div className="stat-page-title"><div><h1>{domain.name}</h1><p>{domain.description}</p></div><strong>{formatNumber(domain.indicators.filter(x=>x.latestValue).length)}<span>ذات قيم متاحة من {formatNumber(domain.indicators.length)} مؤشر معرّف</span></strong></div>
    </div></section>
    <section className="section stat-domain-body"><div className="container">
      <div className="stat-scope-note"><Database size={18}/><span>النطاق الجغرافي لكل البيانات في هذه الصفحة: الجمهورية اليمنية.</span></div>
      {domain.indicators.length ? <div className="stat-indicator-grid">{domain.indicators.map(indicator => <IndicatorCard key={indicator.id} indicator={{...indicator, domain}}/>)}</div> : <div className="stat-empty"><Database size={30}/><h2>هذا المجال جاهز لاستقبال البيانات</h2><p>لم يُنشر أي مؤشر رقمي هنا بعد. أضف أول مؤشر موثق من لوحة التحرير وسيظهر تلقائياً.</p><Link className="btn btn-outline" href="/yemen-in-numbers">استكشاف مجالات أخرى <ArrowUpLeft size={17}/></Link></div>}
    </div></section>
  </>;
}
