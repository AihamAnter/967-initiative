import {pageMetadata} from '@/lib/seo';
import PageIntro from '@/components/PageIntro';
import ContactForm from '@/components/ContactForm';
import {contributionTypes,resolveContributionReference} from '@/lib/contributions';
import {getSiteSettings} from '@/lib/data';

export const metadata = pageMetadata({title:'تواصل وشارك', description:'اقترح موضوعاً، أرسل تصحيحاً، أو ساهم في أدلة ومشاريع مبادرة 967.', path:'/contribute'});
export default async function ContributePage({searchParams}) {
  const params = await searchParams;
  const type = contributionTypes.includes(params.type) ? params.type : '';
  const reference = resolveContributionReference(params);
  const settings=await getSiteSettings();
  return <><PageIntro tone="primary" title="لك مكان في الحكاية." category="تواصل وشارك" description="معرفة تشاركها، معلومة تصححها، أو فكرة نبدأ منها. اختر طريقة مساهمتك واكتب لنا."/>
    <section className="section contribution-body"><div className="container contribute-layout"><ContactForm key={reference?reference.path+':'+reference.id:'general'} initialType={type} initialReference={reference} privacyHref={settings.contentPages?.some(page=>page.slug==='privacy')?'/privacy':null}/><aside className="contribution-guide"><span className="eyebrow">من الفكرة إلى المشاركة</span><h2>مساهمة واضحة، أثر أفضل.</h2><ol><li>اختر نوع الرسالة من أعلى النموذج.</li><li>اشرح فكرتك أو المعلومة التي تود تصحيحها.</li><li>أضف رابطاً أو مصدراً إن توفر، ثم أرسلها للمراجعة.</li></ol><p>يراجع فريق التحرير المساهمات قبل نشرها. لا ننشر بيانات الاتصال في الأدلة دون موافقة صاحبها.</p></aside></div></section></>;
}
