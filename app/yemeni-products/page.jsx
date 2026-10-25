import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import {ArrowUpLeft} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import YemeniProductDirectory from '@/components/YemeniProductDirectory';
import {getYemeniCompanies} from '@/lib/data';
import {formatNumber} from '@/lib/format';
import {toCompanyDirectoryCard} from '@/lib/yemeniProducts';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'منتجات يمنية', description:'اكتشف الشركات والمنتجات اليمنية وابحث بالاسم أو القطاع أو المحافظة.', path:'/yemeni-products'});
export default async function ProductsPage() {
 const companies = await getYemeniCompanies(), demos = companies.filter(x => x.isDemo).length;
 return <><PageIntro tone="gold" title="صُنع هنا، في اليمن." category="دليل الشركات والمنتجات" description="تعرّف على المنتج المحلي، ومن يصنعه، وأين تجده. دليل ينمو بمعلومات واضحة ومساهمات المجتمع.">
 <div className="directory-summary"><span>الشركات المنشورة: <strong>{formatNumber(companies.length - demos)}</strong></span><span>المنتجات المدرجة: <strong>{formatNumber(companies.filter(x => !x.isDemo).reduce((sum,x) => sum + x.products.length,0))}</strong></span><Link href="/contribute?type=اقتراح%20شركة%20أو%20منتج">اقترح شركة أو منتجاً <ArrowUpLeft size={15}/></Link></div>
 </PageIntro><section className="section products-directory-section" id="directory"><div className="container">{demos > 0 && <p className="data-disclosure">هذه معاينة تضم نماذج تجريبية، وليست شركات موثقة في الدليل.</p>}<YemeniProductDirectory companies={companies.map(toCompanyDirectoryCard)}/></div></section><section className="participate-banner"><div className="container"><div><span>هل تعرف منتجاً محلياً يستحق الظهور؟</span><h2>ساعدنا على توسيع الدليل.</h2></div><Link className="btn btn-white" href="/contribute?type=اقتراح%20شركة%20أو%20منتج">اقترح إضافة <ArrowUpLeft size={18}/></Link></div></section></>;
}
