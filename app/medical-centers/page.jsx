import Link from '@/components/SiteLink';
import {ArrowUpLeft,ShieldAlert} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import InstitutionDirectory from '@/components/InstitutionDirectory';
import {getMedicalCenters} from '@/lib/data';
import {formatNumber} from '@/lib/format';
import {pageMetadata} from '@/lib/seo';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'دليل المراكز الطبية',description:'دليل منشآت صحية يمنية موثقة بالمصدر مع البحث حسب المحافظة والنوع، وإظهار تاريخ حالة التشغيل بوضوح.',path:'/medical-centers'});

export default async function MedicalCentersPage(){
 const centers=await getMedicalCenters();
 const governorates=new Set(centers.map(item=>item.governorate).filter(Boolean));
 return <><PageIntro tone="gold" category="الدليل الصحي" title="دليل المراكز الطبية" description="ابحث في المنشآت الصحية اليمنية الموثقة في القائمة الرسمية المتاحة. بيانات التشغيل مؤرخة ولا تُستخدم لتأكيد أن المنشأة مفتوحة الآن أو أن خدمة بعينها متاحة حاليًا.">
  <div className="directory-summary"><span>المنشآت المنشورة: <strong>{formatNumber(centers.length)}</strong></span><span>المحافظات المغطاة: <strong>{formatNumber(governorates.size)}</strong></span><Link href="/contribute?type=اقتراح%20مركز%20طبي">اقترح منشأة صحية <ArrowUpLeft size={15}/></Link></div>
 </PageIntro><section className="institution-disclosure medical"><div className="container"><ShieldAlert size={22}/><p><strong>قبل الزيارة:</strong> تحقّق هاتفيًا أو من الجهة الصحية المحلية. لا توجد في البيانات الحالية أرقام اتصال أو ساعات عمل موثقة لمعظم السجلات، وحالة التشغيل المعروضة تعود إلى ديسمبر 2023.</p></div></section><section className="section institution-directory-section" id="medical-directory"><div className="container"><InstitutionDirectory kind="medical" items={centers}/></div></section></>;
}
