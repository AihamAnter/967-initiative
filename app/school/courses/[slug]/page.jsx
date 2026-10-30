import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import SchoolCourseMap from '@/components/school/SchoolCourseMap';
import {serverDb} from '@/lib/supabase-server';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {publishedSchoolCatalog,publishedSchoolStages} from '@/lib/schoolContentServer';
import {pageMetadata} from '@/lib/seo';
import styles from '../../studio/studio.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'مسارات مدرسة 967',path:'/school/courses'});
export default async function CoursePage({params}){
 const {slug}=await params,settings=await getSiteSettings(),db=serverDb();
 if(!sectionIsVisible('school',settings.pageVisibility)||!db||['musnad','arud'].includes(slug))notFound();
 const course=(await publishedSchoolCatalog(db)).find(x=>x.slug===slug);
 if(!course)notFound();
 const stages=await publishedSchoolStages(db,slug);
 return <main className={styles.root}><header className={styles.hero}><div className="container">
  <Link className={styles.back} href={course.category==='السياسة والاقتصاد'?'/school/civic':course.category==='الفلك والطبيعة'?'/school/nature':course.category==='المنطق والتفكير'?'/school/logic':'/school/writing'}><ArrowRight size={16}/> جميع المسارات</Link>
  <h1>{course.title}</h1><p>{course.description}</p>
  <p>{course.category} · {stages.length} محطة منشورة</p>
 </div></header><section className={styles.workspace}><div className="container">
  <div className={styles.report}><h2>محطات هذا المسار</h2><p>أكمل المحطات بالترتيب؛ تحتاج إلى 5 إجابات صحيحة من 6 لفتح المحطة التالية.</p>
   <SchoolCourseMap slug={slug} stages={stages}/>
  </div>
 </div></section></main>;
}
