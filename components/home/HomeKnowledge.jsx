import Link from 'next/link';
import {ArrowLeft,ArrowUpLeft,BarChart3,ChartNoAxesCombined,Compass,ScrollText,UsersRound} from 'lucide-react';
import YemeniMotif from '@/components/design/YemeniMotif';
import styles from './HomeKnowledge.module.css';

const icons={history:ScrollText,atlas:Compass,figures:UsersRound,statistics:ChartNoAxesCombined,ranking:BarChart3};

export default function HomeKnowledge({items=[]}){
 if(!items.length)return null;
 const featured=items.find(item=>item.id==='history')||items[0];
 const others=items.filter(item=>item.id!==featured.id);
 const FeatureIcon=icons[featured.id]||ScrollText;
 return <section className={styles.knowledge} id="explore-knowledge" aria-labelledby="home-knowledge-title">
  <div className="container">
   <div className={styles.heading}>
    <div>
     <span className={styles.kicker}>المعرفة / موسوعة 967</span>
     <h2 id="home-knowledge-title">استكشف المعرفة</h2>
     <p>تاريخٌ نفهمه، وأماكن نكتشفها، وشخصيات نتعرّف إليها، وأرقام تضع اليمن في سياقه.</p>
    </div>
    <Link className={styles.searchLink} href="/search">ابحث في المعرفة <ArrowLeft size={18} aria-hidden="true"/></Link>
   </div>
   <div className={styles.grid}>
    <Link className={styles.feature} href={featured.href} data-knowledge-id={featured.id}>
     <YemeniMotif className={styles.motif}/>
     <div className={styles.featureTop}><span className={styles.featureIcon}><FeatureIcon size={27} strokeWidth={1.7} aria-hidden="true"/></span><span className={styles.featureNumber} aria-hidden="true">967 / المعرفة</span></div>
     <div className={styles.featureText}>
      <span className={styles.featureEyebrow}>{featured.eyebrow}</span>
      <h3>{featured.title}</h3>
      <p>{featured.description}</p>
      {featured.id==='history'&&<div className={styles.eraSteps} aria-hidden="true"><span>البدايات الأولى</span><i/><span>الممالك والدول</span><i/><span>اليمن المعاصر</span></div>}
     </div>
     <span className={styles.featureCall}>ابدأ الاستكشاف <ArrowUpLeft size={19} aria-hidden="true"/></span>
    </Link>
    {others.map(item=>{
     const Icon=icons[item.id]||Compass;
     return <Link className={styles.tile} href={item.href} key={item.id} data-knowledge-id={item.id}>
      <div className={styles.tileTop}><span className={styles.tileIcon} data-tone={item.id}><Icon size={23} strokeWidth={1.7} aria-hidden="true"/></span><ArrowUpLeft size={17} className={styles.tileArrow} aria-hidden="true"/></div>
      <div className={styles.tileText}><span className={styles.tileEyebrow}>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.description}</p></div>
      <span className={styles.tileCta}>تصفّح القسم <ArrowLeft size={16} aria-hidden="true"/></span>
     </Link>;
    })}
   </div>
  </div>
 </section>;
}
