'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpLeft, BarChart3, BookOpen, Bookmark, BriefcaseBusiness, Building2, ChartNoAxesCombined, FileText, Film, Map, MessagesSquare, Search, UserRound, UsersRound, X} from 'lucide-react';
import useReadingList, {removeReadingItem} from './useReadingList';
import {formatNumber} from '@/lib/format';
import {READING_KINDS} from '@/lib/readingList';

const kindIcons={work:Film,issue:BookOpen,figure:UsersRound,company:Building2,professional:BriefcaseBusiness,indicator:BarChart3,domain:ChartNoAxesCombined,debate:MessagesSquare,speaker:UserRound,ranking:ChartNoAxesCombined,map:Map,timeline:ChartNoAxesCombined,search:Search,page:FileText};

export default function ReadingList() {
  const {items,ready,available} = useReadingList();
  const [message,setMessage] = useState('');
  function remove(item) {
    try {removeReadingItem(item.href);setMessage(`أُزيل «${item.title}» من القائمة.`);}
    catch {setMessage('تعذر تحديث القائمة. تحقق من السماح بتخزين بيانات الموقع.');}
  }
  if (!ready) return <p role="status">جارٍ تجهيز قائمة القراءة…</p>;
  return <div className="reading-list">
    <div className="reading-list-intro"><Bookmark size={24} aria-hidden="true"/><p>{available?'محفوظة في هذا المتصفح دون حساب. تحتاج اتصالاً لفتح المحتوى.':'الحفظ غير متاح حالياً. اسمح بتخزين بيانات الموقع في متصفحك لتستخدم القائمة.'}</p></div>
    <div className="results-line"><strong>المحتوى المحفوظ: {formatNumber(items.length)}</strong><Link href="/">اكتشف المزيد من المنصة <ArrowUpLeft size={15}/></Link></div>
    <p className="reading-list-status" role="status" aria-atomic="true">{message}</p>
    {items.length ? <ul className="reading-items">{items.map(item => {
      const Icon=kindIcons[item.kind]||FileText;
      return <li key={item.href}>
        <span className={'reading-kind reading-kind-'+item.kind}><Icon size={23} aria-hidden="true"/></span>
        <Link href={item.href}><span>{READING_KINDS[item.kind]}</span><h2>{item.title}</h2><span>افتح المحتوى <ArrowUpLeft size={15}/></span></Link>
        <button type="button" className="reading-remove" onClick={()=>remove(item)} aria-label={`إزالة ${item.title} من القائمة`}><X size={17} aria-hidden="true"/><span>إزالة</span></button>
      </li>;
    })}</ul> : <div className="empty-state"><Bookmark size={36} aria-hidden="true"/><h2>مساحة لما تود العودة إليه.</h2><p>احفظ ملف شخصية أو شركة أو مهني، أو مؤشراً أو مناظرة أو عملاً أو عدداً من المجلة، لتعود إليه عندما يناسبك الوقت.</p><div className="reading-empty-actions"><Link className="btn btn-primary" href="/magazine">تصفّح المجلة <BookOpen size={17}/></Link><Link className="btn btn-outline" href="/yemen-map">اكتشف اليمن <Map size={17}/></Link></div></div>}
  </div>;
}
