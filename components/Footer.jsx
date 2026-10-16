import Link from 'next/link';
import {ArrowUpLeft, Instagram} from 'lucide-react';
import BrandLogo from './BrandLogo';
import {site} from '@/lib/config';
export default function Footer() {
  return <footer className="platform-footer"><div className="container">
    <div className="platform-footer-grid"><div className="footer-about"><Link href="/" aria-label="مبادرة 967"><BrandLogo light/></Link><h2>من اليمن. ولكل اليمنيين.</h2><p>مساحة نلتقي فيها على المعرفة، ونفتح بها أبواب الحوار والمشاركة.</p><a href={site.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={19}/><span>تابع الحكاية على إنستغرام</span><ArrowUpLeft size={15}/></a></div>
      <div><h3>المحتوى والمعرفة</h3><Link href="/works">الأعمال الإعلامية</Link><Link href="/magazine">مجلة 967</Link><Link href="/yemen-in-numbers">اليمن بالأرقام</Link><Link href="/yemen-map">اكتشف اليمن</Link></div>
      <div><h3>الأدلة والمجتمع</h3><Link href="/yemeni-products">منتجات يمنية</Link><Link href="/professionals">المهنيون</Link><Link href="/yemen-map#yemeni-figures">شخصيات يمنية</Link><Link href="/contribute">ساهم في المنصة</Link></div>
      <div><h3>مبادرة 967</h3><Link href="/#about">من نحن</Link><Link href="/#projects">مشاريعنا</Link><Link href="/contribute?type=تصحيح%20معلومة">أرسل تصحيحاً</Link><Link href="/admin">دخول المحررين</Link></div>
    </div><div className="platform-footer-bottom"><span>© {new Date().getFullYear()} مبادرة 967</span><span>المعرفة تجمعنا، والمشاركة تقرّبنا.</span><Link href="/search">ابحث في المنصة <ArrowUpLeft size={14}/></Link></div>
  </div></footer>;
}
