import Link from '@/components/SiteLink';
import {pageMetadata} from '@/lib/seo';
import {ArrowUpLeft} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import ProfessionalDirectory from '@/components/ProfessionalDirectory';
import {getProfessionals} from '@/lib/data';
import {formatNumber} from '@/lib/format';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'المهنيون', description:'ابحث عن مهني أو مقدم خدمة بالاسم والتخصص والمحافظة وطريقة الخدمة.', path:'/professionals'});
export default async function ProfessionalsPage() {
 const professionals = await getProfessionals(), demos = professionals.filter(x => x.isDemo).length;
 return <><PageIntro tone="primary" title="المهارة أقرب إليك." category="دليل المهنيين" description="اعثر على صاحب المهارة المناسب. تعرّف على خدماته، نطاق عمله، ووسائل الاتصال المنشورة بإذنه.">
 <div className="directory-summary"><span>الملفات المنشورة: <strong>{formatNumber(professionals.length - demos)}</strong></span><span>المجالات المتاحة: <strong>{formatNumber(new Set(professionals.map(x => x.category)).size)}</strong></span><Link href="/contribute?type=طلب%20إضافة%20ملف%20مهني">اطلب إضافة ملفك <ArrowUpLeft size={15}/></Link></div>
 </PageIntro><section className="section professionals-directory-section" id="professionals-directory"><div className="container">{demos > 0 && <p className="data-disclosure">تتضمن هذه المعاينة {formatNumber(demos)} من الملفات التجريبية، وهي مميزة بوضوح ولا تمثل مهنيين موثقين.</p>}<ProfessionalDirectory professionals={professionals}/></div></section><section className="participate-banner"><div className="container"><div><span>المهارات المحلية تستحق أن تُرى</span><h2>قدّم ملفك إلى فريق التحرير للمراجعة.</h2></div><Link className="btn btn-white" href="/contribute?type=طلب%20إضافة%20ملف%20مهني">طلب إضافة ملف <ArrowUpLeft size={18}/></Link></div></section></>;
}
