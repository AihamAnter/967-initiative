import Link from 'next/link';
import {ArrowLeft,Gamepad2,Hexagon,Orbit,Play,ScanLine,Sparkles} from 'lucide-react';
import styles from '@/app/games/games.module.css';

export default function ArcadeIntro({compact=false,title='ألعاب 967',description,children}){
 return <header className={compact?[styles.hero,styles.heroCompact].join(' '):styles.hero}>
  <div className={styles.sky} aria-hidden="true"><span/><span/><span/></div>
  <div className={styles.heroInner}>
   <div className={styles.heroCopy}>
    <nav className={styles.crumbs} aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><ArrowLeft size={13} aria-hidden="true"/>{compact?<><Link href="/games">ألعاب 967</Link><ArrowLeft size={13} aria-hidden="true"/><span aria-current="page">اختبر معرفتك</span></>:<span aria-current="page">ألعاب 967</span>}</nav>
    <span className={styles.overline}><span className={styles.onlineDot}/><Gamepad2 size={17} aria-hidden="true"/> <span dir="ltr">967 / ARCADE</span> <span className={styles.overlineSeparator} aria-hidden="true">—</span> المعرفة بشكل مختلف</span>
    <h1 className={styles.heroTitle}>{compact?'اختبر معرفتك باليمن':title}<em>{compact?'العب. اكتشف. وتحدَّ نفسك.':'جاهز للتحدي؟'}</em></h1>
    <p className={styles.heroDescription}>{description}</p>
    {children&&<div className={styles.heroActions}>{children}</div>}
    {!compact&&<div className={styles.heroFacts}><span><Play size={13} aria-hidden="true"/> اللعب مجاني</span><span><Sparkles size={14} aria-hidden="true"/> معلومات موثقة</span><span><ScanLine size={14} aria-hidden="true"/> تحديات تتجدد</span></div>}
   </div>
   <div className={styles.arcadeArtwork} aria-hidden="true">
    <div className={styles.artGlow}/>
    <div className={styles.ringOuter}/><div className={styles.ringMiddle}/><div className={styles.ringInner}/>
    <div className={styles.artCore}><Gamepad2 size={compact?66:91} strokeWidth={1.25}/><span>9 6 7</span></div>
    <span className={styles.artChipOne}><Hexagon size={15}/> YEMEN</span>
    <span className={styles.artChipTwo}><Orbit size={16}/> XP +100</span>
    <span className={styles.artChipThree}>LEVEL 01 <span>◆</span></span>
   </div>
  </div>
 </header>;
}
