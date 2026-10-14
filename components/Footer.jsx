import Link from 'next/link';
import Image from 'next/image';
import {Instagram,ArrowUpLeft} from 'lucide-react';
import {site} from '@/lib/config';
export default function Footer(){return <footer className="footer"><div className="container">
 <div className="footer-grid"><div><Link href="/" className="footer-logo" aria-label="967"><Image src="/images/967%20logo%20no%20background.png" alt="967" width={1717} height={1814}/></Link><p>مساحة يمنية للمعرفة والحوار والعمل المجتمعي.<br/>نبدأ بالسؤال، ونستمر بالفعل.</p></div>
 <div><span className="footer-label">استكشف</span><Link href="/">الرئيسية</Link><Link href="/works">أعمالنا</Link><Link href="/magazine">المجلة الأسبوعية</Link><Link href="/yemen-map">اكتشف اليمن</Link><Link href="/yemeni-products">منتجات يمنية</Link><Link href="/professionals">مهنيون</Link></div>
 <div><span className="footer-label">ابقَ على اتصال</span><a target="_blank" rel="noopener noreferrer" href={site.instagram}>إنستغرام <ArrowUpLeft size={15}/></a><Link href="/#contact">تواصل معنا <ArrowUpLeft size={15}/></Link></div></div>
 <div className="footer-bottom"><span>© {new Date().getFullYear()} مبادرة 967. جميع الحقوق محفوظة.</span><span>صُنع من أجل اليمن <span className="red-star">✳</span></span></div>
 </div></footer>}
