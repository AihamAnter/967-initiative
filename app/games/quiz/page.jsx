import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight,Gamepad2} from 'lucide-react';
import ArcadeIntro from '@/components/games/ArcadeIntro';
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
  return <main className={styles.root}>
   <ArcadeIntro compact description="عالم المعرفة مفتوح، لكن بنك الأسئلة غير متاح في هذه اللحظة."><Link href="/games" className={styles.heroSecondary}><ArrowRight size={17}/> جميع الألعاب</Link></ArcadeIntro>
   <section className={styles.errorNotice} role="alert"><Gamepad2 size={31}/><h2>تعذر تحميل الأسئلة</h2><p>يرجى إعادة المحاولة أو العودة إلى قسم الألعاب.</p><Link href="/games">العودة إلى الألعاب</Link></section>
  </main>;
 }
 const date=new Date().toISOString().slice(0,10);
 const mode=params?.mode==='daily'?'daily':'practice';
 return <main className={styles.root}>
  <ArcadeIntro compact description="أربع اختيارات. إجابة واحدة صحيحة. عشر محطات تفصلك عن نتيجة تستحق أن تفتخر بها.">
   <Link href="/games" className={styles.heroSecondary}><ArrowRight size={17}/> جميع الألعاب</Link>
   <span className={styles.roundChip}>10 أسئلة <span aria-hidden="true">·</span> نقاط وتحديات</span>
  </ArcadeIntro>
  <QuizGame key={mode} questions={catalog.questions.filter(q=>q.isPublished)} date={date} initialMode={mode}/>
 </main>;
}
