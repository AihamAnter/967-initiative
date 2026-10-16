import {getWorks} from '@/lib/data';
import {pageMetadata} from '@/lib/seo';
import WorkExplorer from '@/components/WorkExplorer';
import PageIntro from '@/components/PageIntro';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'الأعمال الإعلامية', description:'فيديوهات وحوارات وتغطيات من مبادرة 967. ابحث بحسب الموضوع والمنصة.', path:'/works'});
export default async function Works() {
 const works = await getWorks();
 return <><PageIntro title="حكايات تستحق أن تُروى." category="الأعمال الإعلامية" description="فيديوهات، حوارات، وقصص تقرّب قضايا اليمن. ابحث عن موضوعك وشاهد العمل من مكان واحد."/><section className="section works-body"><div className="container"><WorkExplorer works={works}/></div></section></>;
}
