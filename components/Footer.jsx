import Link from 'next/link';
import {Instagram,ArrowUpLeft} from 'lucide-react';
import {site} from '@/lib/config';
export default function Footer(){return <footer className="footer"><div className="container">
 <div className="footer-grid"><div><Link href="/" className="footer-logo">967<span>.</span></Link><p>مساحة يمنية للمعرفة والحوار والعمل المجتمعي.<br/>نبدأ بالسؤال، ونستمر بالفعل.</p></div>
 <div><span className="footer-label">استكشف</span><Link href="/">الرئيسية</Link><Link href="/works">أعمالنا</Link><Link href="/magazine">المجلة الأسبوعية</Link></div>
 <div><span className="footer-label">ابقَ على اتصال</span><a target="_blank" rel="noopener noreferrer" href={site.instagram}>إنستغرام <ArrowUpLeft size={15}/></a><Link href="/#contact">تواصل معنا <ArrowUpLeft size={15}/></Link></div></div>
 <div className="footer-bottom"><span>© {new Date().getFullYear()} مبادرة 967. جميع الحقوق محفوظة.</span><span>صُنع من أجل اليمن <span className="red-star">✳</span></span></div>
 </div></footer>}
