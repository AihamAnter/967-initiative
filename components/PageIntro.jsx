import Link from '@/components/SiteLink';
import {ChevronLeft} from 'lucide-react';
import YemeniMotif from './design/YemeniMotif';

export default function PageIntro({title, description, category, children, tone = 'primary', art}) {
  return <section className="page-intro" data-section-tone={tone}><div className="container">
    <nav className="breadcrumbs" aria-label="مسار التصفح"><Link href="/">الرئيسية</Link><ChevronLeft size={14}/><span aria-current="page">{category || title}</span></nav>
    {category && <span className="eyebrow">{category}</span>}
    <h1>{title}</h1><p>{description}</p>{children}
    {art ? <div className="page-intro-art" aria-hidden="true">{art}</div> : <YemeniMotif className="page-intro-motif"/>}
  </div></section>;
}
