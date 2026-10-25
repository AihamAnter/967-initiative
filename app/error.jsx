'use client';
import Link from '@/components/SiteLink';
import {AlertCircle, RefreshCw} from 'lucide-react';
export default function ErrorPage({reset}) {
  return <section className="section"><div className="container empty-state" role="alert"><AlertCircle size={32}/><h1>تعذّر تحميل المحتوى</h1><p>حدثت مشكلة في الاتصال. حاول مجدداً بعد قليل.</p><button type="button" className="btn btn-primary" onClick={reset}>إعادة المحاولة <RefreshCw size={17}/></button><p><Link href="/">العودة إلى الرئيسية</Link></p></div></section>;
}
