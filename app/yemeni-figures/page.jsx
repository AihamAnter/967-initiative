import {notFound} from 'next/navigation';
import {getSiteSettings,getYemeniFigures} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {toFigureDirectoryCard,yemenGovernorates} from '@/lib/yemeniFigures';
import {pageMetadata} from '@/lib/seo';
import YemeniFiguresExplorer from '@/components/yemen-map/YemeniFiguresExplorer';

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
  <section className="ymap-hero" data-section-tone="green"><div className="container"><span className="eyebrow">المعرفة / شخصيات يمنية</span><h1>شخصيات <span>يمنية</span></h1><p>سير وتجارب وشخصيات تركت أثرها في اليمن. تصفح الشخصيات أو ابحث بالاسم والمجال والمحافظة والفترة.</p></div></section>
  <YemeniFiguresExplorer figures={figures} initialGovernorateId={region}/>
 </main>;
}
