import {notFound} from 'next/navigation';
import {BookOpenText,Clock3,Landmark,ScrollText} from 'lucide-react';
import Link from '@/components/SiteLink';
import {getSiteSettings} from '@/lib/data';
import {sectionIsVisible} from '@/lib/pageVisibility';
import {serverDb} from '@/lib/supabase-server';
import {readHistoryCatalog} from '@/lib/historyRepository';
import {yemenGovernorates} from '@/lib/yemeniFigures';
import {pageMetadata} from '@/lib/seo';
import HistoryExplorer from '@/components/history/HistoryExplorer';
import styles from './HistoryPage.module.css';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({
 title:'تاريخ اليمن',
 description:'استكشف تاريخ اليمن عبر ست مراحل: الممالك القديمة، الدول الإسلامية، الوثائق، الآثار، المجتمع والأحداث المعاصرة، مع المصادر والخط الزمني.',
 path:'/yemen-history',
});
export default async function YemenHistoryPage({searchParams}){
 const settings=await getSiteSettings();
 if(!sectionIsVisible('history',settings.pageVisibility))notFound();
 const params=await searchParams;
 let catalog;
 try{catalog=await readHistoryCatalog(serverDb());}
 catch{return <main className="container" style={{padding:'80px 0'}}><h1>تعذر تحميل تاريخ اليمن</h1><p role="alert">حاول تحديث الصفحة لاحقاً؛ لا نعرض نسخة قديمة إذا تعذر التحقق من آخر التعديلات.</p></main>;}
 const locations=[...new Map(catalog.entries.filter(x=>x.isPublished!==false&&x.governorate).map(x=>[x.governorate,x])).values()].map(x=>({...x,governorateName:yemenGovernorates.find(g=>g.id===x.governorate)?.name})).filter(x=>x.governorateName);
 return <main>
  <section className={styles.hero}>
   <div className="container">
    <span className="eyebrow">المعرفة / موسوعة 967</span>
    <h1>تاريخ <span>اليمن</span></h1>
    <p>من بدايات الاستيطان إلى قيام الدول الحديثة: اكتشف الممالك والأحداث والناس والمواقع والوثائق في سياقها التاريخي.</p>
    <div className={styles.heroLinks}><a href="#eras"><Clock3 size={17}/> استكشف العصور</a><a href="#history-compare-heading"><Landmark size={17}/> قارن بين دولتين</a><Link href="/yemeni-figures"><BookOpenText size={17}/> شخصيات يمنية</Link></div>
   </div>
   <div className={styles.heroDeco} aria-hidden="true"><ScrollText size={180} strokeWidth={0.5}/></div>
  </section>
  <div id="eras"><HistoryExplorer entries={catalog.entries} initialEra={typeof params.era==='string'?params.era:''} initialType={typeof params.type==='string'?params.type:''}/></div>
  <section className={styles.locations} aria-labelledby="history-location-title"><div className="container"><span className="eyebrow">الأماكن على الخريطة</span><h2 id="history-location-title">أين دارت هذه الحكايات؟</h2><p>استكشف المواقع المرتبطة بالمواد التاريخية على <strong>خريطة المحافظات المعاصرة</strong>. هذه الروابط لا تمثل حدود الممالك القديمة.</p><div className={styles.locationGrid}>{locations.map(x=><Link key={x.governorate} href={'/yemen-map?region='+x.governorate+'#map'}><strong>{x.governorateName}</strong><span>{x.title}</span></Link>)}</div></div></section>
 </main>;
}
