import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ChevronLeft} from 'lucide-react';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {arudStage} from '@/lib/schoolArud';
import {pageMetadata} from '@/lib/seo';
import ArudLesson from '@/components/school/ArudLesson';
import school from '../../../school.module.css';
import styles from '../arud.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'محطات علم العروض | مدرسة 967',description:'دروس علم العروض التفاعلية ضمن مدرسة 967.',path:'/school/writing/arud'});
export default async function ArudStagePage({params}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('school',settings.pageVisibility))notFound();
 const {stage:raw}=await params;
 if(!/^(?:[1-9]|1[0-2])$/.test(raw))notFound();
 const stage=arudStage(Number(raw)-1);
 if(!stage)notFound();
 return <main className={school.root}><section className={styles.lessonBackground}><div className="container">
  <div className={styles.lessonBreadcrumb}><Link href="/school">مدرسة 967</Link><ChevronLeft size={14}/><Link href="/school/writing/arud">علم العروض</Link><ChevronLeft size={14}/>المحطة {raw}</div>
  <ArudLesson stage={stage}/>
 </div></section></main>;
}
