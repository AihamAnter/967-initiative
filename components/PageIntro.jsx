import Link from 'next/link';
import {ChevronLeft} from 'lucide-react';

export default function PageIntro({title, description, category, children, tone = 'primary'}) {
  return <section className="page-intro" data-section-tone={tone}><div className="container">
    <nav className="breadcrumbs" aria-label="مسار التصفح"><Link href="/">الرئيسية</Link><ChevronLeft size={14}/><span aria-current="page">{category || title}</span></nav>
    {category && <span className="eyebrow">{category}</span>}
    <h1>{title}</h1><p>{description}</p>{children}
  </div></section>;
}
