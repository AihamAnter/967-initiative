import NextLink from 'next/link';
import {pageIsVisible} from '@/lib/pageVisibility';
import {ArrowUpLeft, AtSign, ChevronDown, Facebook, Instagram, Youtube} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {defaultSiteSettings} from '@/lib/siteSettings';
import {contentPagePath} from '@/lib/contentPages';
// Closed <details> content is not keyboard-accessible even if CSS sets display:flex.
// Render separate responsive structures: ordinary links on desktop, disclosures on mobile.
function FooterGroup({title,children}){
  return <>
   <div className="footer-link-desktop"><h3>{title}</h3><div className="footer-group-links">{children}</div></div>
   <details className="footer-link-group"><summary><h3>{title}</h3><ChevronDown size={17} aria-hidden="true"/></summary><div className="footer-group-links">{children}</div></details>
  </>;
}
export default function Footer({settings=defaultSiteSettings}) {
  const pages=(settings.contentPages||[]).filter(page=>page.showInFooter&&page.isPublished!==false);
  const Link=({href,...props})=>pageIsVisible(href,settings.pageVisibility,settings.contentPages||[])?<NextLink href={href} {...props}/>:null;
  const socials=[{key:'instagram',label:'إنستغرام',icon:Instagram},{key:'youtube',label:'يوتيوب',icon:Youtube},{key:'facebook',label:'فيسبوك',icon:Facebook},{key:'tiktok',label:'تيك توك',icon:AtSign}].filter(item=>settings[item.key]);
  return <footer className="platform-footer"><div className="container">
    <div className="platform-footer-grid"><div className="footer-about"><Link href="/" aria-label="مبادرة 967"><BrandLogo light/></Link><h2>{settings.footerTitle}</h2><p>{settings.footerDescription}</p><div className="footer-socials">{socials.map(({key,label,icon:Icon})=><a href={settings[key]} target="_blank" rel="noopener noreferrer" key={key}><Icon size={19}/><span>{label}</span><ArrowUpLeft size={15}/></a>)}</div></div>
      <FooterGroup title="المحتوى والمعرفة"><Link href="/works">الأعمال الإعلامية</Link><Link href="/debates">مناظرات 967</Link><Link href="/magazine">مجلة 967</Link><Link href="/read-later">للقراءة لاحقاً</Link><Link href="/yemen-in-numbers">اليمن بالأرقام</Link><Link href="/yemen-ranking">ترتيب اليمن</Link><Link href="/yemen-map">خريطة اليمن</Link><Link href="/yemeni-figures">شخصيات يمنية</Link><Link href="/yemen-history">تاريخ اليمن</Link></FooterGroup>
      <FooterGroup title="ألعاب 967"><Link href="/games">جميع الألعاب</Link><Link href="/games/leaderboard">لوحة المتصدرين</Link><Link href="/games/achievements">الشارات والإنجازات</Link></FooterGroup>
      <FooterGroup title="مدرسة 967"><Link href="/school">جميع المسارات</Link><Link href="/school/dashboard">رحلتي التعليمية</Link><Link href="/school/writing">الكتابة والأدب</Link><Link href="/school/nature">الفلك والطبيعة</Link><Link href="/school/logic">المنطق والتفكير</Link><Link href="/school/civic">السياسة والاقتصاد</Link><Link href="/school/writing/musnad">تعلم خط المسند</Link><Link href="/school/writing/arud">تعلم علم العروض</Link></FooterGroup>
      <FooterGroup title="الأدلة والمجتمع"><Link href="/yemeni-products">منتجات يمنية</Link><Link href="/professionals">المهنيون</Link><Link href="/universities">الجامعات والمعاهد</Link><Link href="/medical-centers">المراكز الطبية</Link><Link href="/contribute">ساهم في المنصة</Link></FooterGroup>
      <FooterGroup title="مبادرة 967">{pages.filter(page=>!['privacy','terms'].includes(page.slug)).map(page=><Link key={page.id} href={contentPagePath(page)}>{page.title}</Link>)}<Link href="/#projects">مشاريعنا</Link><Link href="/contribute?type=تصحيح%20معلومة">أرسل تصحيحاً</Link><Link href="/admin">دخول المحررين</Link></FooterGroup>
    </div><div className="platform-footer-bottom"><span>© {new Date().getFullYear()} مبادرة 967</span><span>المعرفة تجمعنا، والمشاركة تقرّبنا.</span><nav className="footer-policy-links" aria-label="الخصوصية والشروط">{pages.filter(page=>['privacy','terms'].includes(page.slug)).map(page=><Link key={page.id} href={contentPagePath(page)}>{page.title}</Link>)}</nav><Link href="/search">ابحث في المنصة <ArrowUpLeft size={14}/></Link></div>
  </div></footer>;
}
