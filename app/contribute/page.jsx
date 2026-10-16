import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import ContactForm from '@/components/ContactForm';
import {contributionTypes} from '@/lib/contributions';

export const metadata = {title:'تواصل وشارك', description:'اقترح موضوعاً، أرسل تصحيحاً، أو ساهم في أدلة ومشاريع مبادرة 967.', alternates:{canonical:'/contribute'}};
export default async function ContributePage({searchParams}) {
  const params = await searchParams;
  const type = contributionTypes.includes(params.type) ? params.type : '';
  return <><PageIntro title="لك مكان في الحكاية." category="تواصل وشارك" description="معرفة تشاركها، معلومة تصححها، أو فكرة نبدأ منها. اختر طريقة مساهمتك واكتب لنا."/>
    <section className="section"><div className="container contribute-layout"><aside className="contribution-options"><h2>كيف تحب أن تساهم؟</h2>{contributionTypes.filter(x => !['أخرى', 'استفسار', 'تعاون إعلامي'].includes(x)).map(item => <Link href={'/contribute?' + new URLSearchParams({type:item})} key={item}>{item}<ArrowUpLeft size={16}/></Link>)}<p>تصل المساهمات إلى فريق التحرير للمراجعة. لا تُنشر بياناتك أو مساهمتك تلقائياً، ولا تظهر معلومات الاتصال في الأدلة قبل موافقة صاحبها.</p></aside><ContactForm key={type} initialType={type}/></div></section></>;
}
