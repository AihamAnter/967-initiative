export const dynamic='force-dynamic';
import {ArrowUpLeft,Instagram,Youtube,Clapperboard,MapPin} from 'lucide-react';
import {getWorks} from '@/lib/data';
import WorkExplorer from '@/components/WorkExplorer';
import {site} from '@/lib/config';
export const metadata={title:'أعمالنا',description:'مكتبة إنتاج مبادرة 967: مقاطع مرئية، ملفات تحليلية، حوارات، وأنشطة مجتمعية.'};
export default async function Works(){const works=await getWorks();return <>
 <section className="page-hero works-hero"><div className="container"><span className="eyebrow">المكتبة الإعلامية / 02</span><h1>كل فكرة تبدأ<br/><span className="accent-word">من سؤال.</span></h1><div className="page-hero-bottom"><p>من المقاطع القصيرة إلى الحوارات الطويلة، ومن الشارع إلى الشاشة. هنا نجمع أعمال 967 في مكان واحد.</p><span className="page-decoration">967 / WORKS</span></div></div></section>
 <section className="section works-body"><div className="container"><div className="platform-banner"><span>تابعنا على المنصات</span><div><a href={site.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={18}/> إنستغرام <ArrowUpLeft size={16}/></a>{site.youtube&&<a href={site.youtube} target="_blank" rel="noopener noreferrer"><Youtube size={18}/> يوتيوب <ArrowUpLeft size={16}/></a>}</div></div><WorkExplorer works={works}/></div></section>
 </>}
