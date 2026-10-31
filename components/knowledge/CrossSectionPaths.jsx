import Link from '@/components/SiteLink';
import {ArrowUpLeft,Compass,GraduationCap,ScrollText,UsersRound} from 'lucide-react';
import styles from './CrossSectionPaths.module.css';

const icons={'الخريطة':Compass,'الشخصيات':UsersRound,'مدرسة 967':GraduationCap,'تاريخ اليمن':ScrollText};

export default function CrossSectionPaths({items=[],title='واصل الاستكشاف',id='related-967'}){
 if(!items.length)return null;
 return <section className={styles.section} aria-labelledby={id}>
  <div className={styles.heading}><span>روابط بين أقسام 967</span><h2 id={id}>{title}</h2>
   <p>روابط مرتبطة بموضوع هذه الصفحة أو بموقعها الجغرافي، مع توضيح نوع العلاقة.</p></div>
  <div className={styles.grid}>{items.map(item=>{
   const Icon=icons[item.kind]||ScrollText;
   return <Link key={item.href} href={item.href} className={styles.card}>
    <span className={styles.icon}><Icon size={20} aria-hidden="true"/></span>
    <span className={styles.content}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.description}</span></span>
    <ArrowUpLeft size={17} aria-hidden="true" className={styles.arrow}/>
   </Link>;
  })}</div>
 </section>;
}
