import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {serverDb} from '@/lib/supabase-server';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {publishedSchoolCatalog,publishedSchoolStages} from '@/lib/schoolContentServer';
import GenericSchoolLesson from '@/components/school/GenericSchoolLesson';
import {pageMetadata} from '@/lib/seo';
import styles from '../../../studio/studio.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'محطات مدرسة 967',path:'/school/courses'});
export default async function CourseStagePage({params}){
 const {slug,stage:raw}=await params,settings=await getSiteSettings(),db=serverDb();
 if(!sectionIsVisible('school',settings.pageVisibility)||!db||['musnad','arud'].includes(slug)||!/^(?:[1-9]|1[0-2])$/.test(raw))notFound();
 const course=(await publishedSchoolCatalog(db)).find(x=>x.slug===slug);
 if(!course)notFound();
 const stages=await publishedSchoolStages(db,slug),index=Number(raw)-1,stage=stages.find(x=>x.index===index);
 if(!stage)notFound();
 return <main className={styles.root}><section className={styles.workspace}><div className="container">
  <Link href={'/school/courses/'+slug} className={styles.back}><ArrowRight size={16}/> {course.title}</Link>
  <GenericSchoolLesson slug={slug} stage={stage} hasNext={stages.some(x=>x.index===index+1)}/>
 </div></section></main>;
}
