import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import KnowledgePageIntro from '@/components/knowledge/KnowledgePageIntro';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {serverDb} from '@/lib/supabase-server';
import {readGameCatalog} from '@/lib/gameRepository';
import {pageMetadata} from '@/lib/seo';
import QuizGame from '@/components/games/QuizGame';
import styles from '../games.module.css';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'اختبر معرفتك باليمن | ألعاب 967',description:'10 أسئلة تفاعلية عن اليمن مع نقاط وشروحات ومصادر موثقة، دون الحاجة إلى التسجيل.',path:'/games/quiz'});
export default async function QuizPage({searchParams}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('games',settings.pageVisibility))notFound();
 const params=await searchParams;
 let catalog;
 try{catalog=await readGameCatalog(serverDb());}catch{
  return <main className="container" style={{padding:'80px 0'}}><h1>تعذر تحميل الأسئلة</h1><p role="alert">بنك الأسئلة غير متاح حالياً. يرجى إعادة المحاولة.</p><Link href="/games">العودة إلى الألعاب</Link></main>;
 }
 const date=new Date().toISOString().slice(0,10);
 const mode=params?.mode==='daily'?'daily':'practice';
 return <main className={styles.root}>
  <KnowledgePageIntro title="اختبر معرفتك باليمن" category="ألعاب 967 / المعرفة" description="عشرة أسئلة في كل جولة. اختر الإجابة، اكتشف القصة وراءها، ثم راجع نتيجتك.">
   <div className="directory-summary"><Link href="/games">جميع الألعاب <ArrowRight size={16}/></Link></div>
  </KnowledgePageIntro>
  <QuizGame key={mode} questions={catalog.questions.filter(q=>q.isPublished)} date={date} initialMode={mode}/>
 </main>;
}
