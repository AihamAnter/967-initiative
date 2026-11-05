'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BarChart3,Compass,ScrollText,UsersRound,ChartNoAxesCombined,ArrowUpLeft} from 'lucide-react';
import {usePageVisibility} from '@/components/PageVisibilityProvider';
import {KNOWLEDGE_AREAS,knowledgeAreaFromPath} from '@/lib/knowledgeIdentity';
import styles from './KnowledgeNavigation.module.css';

const icons={history:ScrollText,figures:UsersRound,atlas:Compass,statistics:ChartNoAxesCombined,ranking:BarChart3};

export default function KnowledgeNavigation(){
 const pathname=usePathname();
 const {isVisible}=usePageVisibility();
 const active=knowledgeAreaFromPath(pathname);
 const visible=KNOWLEDGE_AREAS.filter(area=>isVisible(area.href));
 if(visible.length<2)return null;
 return <nav className={styles.nav} aria-label="التنقل بين أقسام المعرفة">
  <div className={styles.inner}>
   <div className={styles.heading}><span>دليل الاستكشاف</span><strong>اختر زاوية أخرى لمعرفة اليمن</strong></div>
   <div className={styles.links}>
    {visible.map(area=>{
     const Icon=icons[area.id];
     const selected=area.id===active;
     return <Link key={area.id} href={area.href} data-knowledge-id={area.id} className={styles.link} aria-current={selected?'page':undefined}>
      <span className={styles.symbol}><Icon size={21} strokeWidth={1.9} aria-hidden="true"/></span>
      <span className={styles.copy}><strong>{area.title}</strong><small>{area.hint}</small></span>
      <ArrowUpLeft size={15} className={styles.arrow} aria-hidden="true"/>
     </Link>;
    })}
   </div>
  </div>
 </nav>;
}
