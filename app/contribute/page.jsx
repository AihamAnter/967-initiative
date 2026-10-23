import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import {ArrowUpLeft} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import ContactForm from '@/components/ContactForm';
import {contributionTypes,privacyRequestTypes,resolveContributionReference} from '@/lib/contributions';
import {getSiteSettings} from '@/lib/data';

export const metadata = pageMetadata({title:'تواصل وشارك', description:'اقترح موضوعاً، أرسل تصحيحاً، أو ساهم في أدلة ومشاريع مبادرة 967.', path:'/contribute'});
export default async function ContributePage({searchParams}) {
  const params = await searchParams;
  const type = contributionTypes.includes(params.type) ? params.type : '';
  const reference = resolveContributionReference(params);
  const settings=await getSiteSettings();
  return <><PageIntro title="لك مكان في الحكاية." category="تواصل وشارك" description="معرفة تشاركها، معلومة تصححها، أو فكرة نبدأ منها. اختر طريقة مساهمتك واكتب لنا."/>
    <section className="section contribution-body"><div className="container contribute-layout"><aside className="contribution-options"><h2>كيف تحب أن تساهم؟</h2>{contributionTypes.filter(x => !['أخرى', 'استفسار', 'تعاون إعلامي',...privacyRequestTypes].includes(x)).map(item => <Link href={'/contribute?' + new URLSearchParams({type:item,...(reference?{referenceTitle:reference.title,referencePath:reference.path,referenceId:reference.id}:{})})+'#contribution-form'} key={item}>{item}<ArrowUpLeft size={16}/></Link>)}<p>يراجع فريق التحرير المساهمات قبل نشرها. لا ننشر بيانات الاتصال في الأدلة دون موافقة صاحبها.</p></aside><ContactForm key={reference?reference.path+':'+reference.id:'general'} initialType={type} initialReference={reference} privacyHref={settings.contentPages?.some(page=>page.slug==='privacy')?'/privacy':null}/></div></section></>;
}
