'use client';
import Link from '@/components/SiteLink';
import {AlertCircle, RefreshCw} from 'lucide-react';
// Route-level fallback. Optional sections have their own boundaries, so reaching
// this screen means the page's primary content itself could not be loaded.
export default function ErrorPage({reset}) {
  return <div className="ui-page"><div className="ui-wrap" role="alert" style={{display:'grid',justifyItems:'start',gap:12,maxWidth:640}}><AlertCircle size={32} aria-hidden="true"/><h1>تعذّر تحميل هذه الصفحة</h1><p>لم نتمكن من قراءة محتواها الآن. أعد المحاولة بعد قليل؛ بقية أقسام المنصة متاحة من القائمة.</p><button type="button" className="ui-btn" onClick={reset}>إعادة المحاولة <RefreshCw size={17} aria-hidden="true"/></button><Link className="ui-link" href="/">العودة إلى الرئيسية</Link></div></div>;
}
