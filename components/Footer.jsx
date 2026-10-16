import Link from 'next/link';
import {ArrowUpLeft, AtSign, Facebook, Instagram, Youtube} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {defaultSiteSettings} from '@/lib/siteSettings';
export default function Footer({settings=defaultSiteSettings}) {
  const socials=[{key:'instagram',label:'إنستغرام',icon:Instagram},{key:'youtube',label:'يوتيوب',icon:Youtube},{key:'facebook',label:'فيسبوك',icon:Facebook},{key:'tiktok',label:'تيك توك',icon:AtSign}].filter(item=>settings[item.key]);
  return <footer className="platform-footer"><div className="container">
    <div className="platform-footer-grid"><div className="footer-about"><Link href="/" aria-label="مبادرة 967"><BrandLogo light/></Link><h2>{settings.footerTitle}</h2><p>{settings.footerDescription}</p><div className="footer-socials">{socials.map(({key,label,icon:Icon})=><a href={settings[key]} target="_blank" rel="noopener noreferrer" key={key}><Icon size={19}/><span>{label}</span><ArrowUpLeft size={15}/></a>)}</div></div>
      <div><h3>المحتوى والمعرفة</h3><Link href="/works">الأعمال الإعلامية</Link><Link href="/magazine">مجلة 967</Link><Link href="/yemen-in-numbers">اليمن بالأرقام</Link><Link href="/yemen-ranking">ترتيب اليمن</Link><Link href="/yemen-map">اكتشف اليمن</Link></div>
      <div><h3>الأدلة والمجتمع</h3><Link href="/yemeni-products">منتجات يمنية</Link><Link href="/professionals">المهنيون</Link><Link href="/yemen-map#yemeni-figures">شخصيات يمنية</Link><Link href="/contribute">ساهم في المنصة</Link></div>
      <div><h3>مبادرة 967</h3><Link href="/#about">من نحن</Link><Link href="/#projects">مشاريعنا</Link><Link href="/contribute?type=تصحيح%20معلومة">أرسل تصحيحاً</Link><Link href="/admin">دخول المحررين</Link></div>
    </div><div className="platform-footer-bottom"><span>© {new Date().getFullYear()} مبادرة 967</span><span>المعرفة تجمعنا، والمشاركة تقرّبنا.</span><Link href="/search">ابحث في المنصة <ArrowUpLeft size={14}/></Link></div>
  </div></footer>;
}
