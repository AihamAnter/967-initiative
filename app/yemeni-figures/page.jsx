import {notFound} from 'next/navigation';
import {getSiteSettings,getYemeniFigures} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {toFigureDirectoryCard,yemenGovernorates} from '@/lib/yemeniFigures';
import {pageMetadata} from '@/lib/seo';
import YemeniFiguresExplorer from '@/components/yemen-map/YemeniFiguresExplorer';
import KnowledgePageIntro from '@/components/knowledge/KnowledgePageIntro';
import Link from '@/components/SiteLink';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({
 title:'شخصيات يمنية',
 description:'اكتشف سير شخصيات اليمن التاريخية والمعاصرة، وابحث بحسب الاسم والمجال والفترة والمحافظة.',
 path:'/yemeni-figures',
});

export default async function YemeniFiguresPage({searchParams}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('figures',settings.pageVisibility))notFound();
 const params=await searchParams;
 const region=yemenGovernorates.some(item=>item.id===params?.region)?params.region:null;
 const figures=(await getYemeniFigures()).map(toFigureDirectoryCard);
 return <main className="yemeni-figures-page">
  <KnowledgePageIntro
   title="شخصيات يمنية"
   category="دليل الشخصيات اليمنية"
   description="سير وتجارب وشخصيات تركت أثرها في اليمن. تصفح الشخصيات أو ابحث بالاسم والمجال والمحافظة والفترة.">
   <div className="directory-summary">
    <a href="#yemeni-figures">تصفح دليل الشخصيات</a>
    <Link href="/yemen-history">استكشف تاريخ اليمن</Link>
   </div>
  </KnowledgePageIntro>
  <YemeniFiguresExplorer figures={figures} initialGovernorateId={region}/>
 </main>;
}
