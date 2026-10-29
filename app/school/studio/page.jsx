import Link from 'next/link';
import {ArrowRight,GraduationCap} from 'lucide-react';
import {pageMetadata} from '@/lib/seo';
import SchoolStudio from '@/components/school/SchoolStudio';
import styles from './studio.module.css';
export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'إدارة مدرسة 967',description:'محرر محمي للمسارات والمحطات والأسئلة.',path:'/school/studio',noindex:true,nofollow:true});
export default function SchoolStudioPage(){
 return <main className={styles.root}><header className={styles.hero}><div className="container">
  <Link href="/school" className={styles.back}><ArrowRight size={17}/> مدرسة 967</Link>
  <p className={styles.eyebrow}><GraduationCap size={18}/> إدارة المحتوى التعليمي</p>
  <h1>استوديو مدرسة 967</h1>
  <p>تحرير المسارات والمحطات وبنك الأسئلة، مع نسخ منفصلة للمسودة والمنشور وإحصاءات تعليمية.</p>
 </div></header><SchoolStudio/></main>;
}
