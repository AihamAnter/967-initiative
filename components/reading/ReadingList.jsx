'use client';

import {useEffect,useState} from 'react';
import useAudience,{audienceRequest} from '@/components/debates/useAudience';
import {usePageVisibility} from '../PageVisibilityProvider';
import Link from '@/components/SiteLink';
import {ArrowUpLeft, BarChart3, BookOpen, Bookmark, BriefcaseBusiness, Building2, ChartNoAxesCombined, FileText, Film, Map, MessagesSquare, Search, UserRound, UsersRound, X} from 'lucide-react';
import useReadingList, {removeReadingItem} from './useReadingList';
import {formatNumber} from '@/lib/format';
import {READING_KINDS} from '@/lib/readingList';

const kindIcons={work:Film,issue:BookOpen,figure:UsersRound,company:Building2,professional:BriefcaseBusiness,indicator:BarChart3,domain:ChartNoAxesCombined,debate:MessagesSquare,speaker:UserRound,ranking:ChartNoAxesCombined,map:Map,timeline:ChartNoAxesCombined,search:Search,page:FileText};

export default function ReadingList() {
  const {items:storedItems,ready,available} = useReadingList();
  const auth=useAudience();
  const {isVisible}=usePageVisibility();
  const [cloud,setCloud]=useState([]);
  const [message,setMessage] = useState('');
  useEffect(()=>{
    let active=true;
    setCloud([]);
    if(auth.user)audienceRequest('/api/account/workspace').then(data=>{
      if(active)setCloud(data.saved||[]);
    }).catch(()=>{if(active)setMessage('تعذّر تحميل محفوظات الحساب حالياً. المحفوظات المحلية ما زالت متاحة.');});
    return()=>{active=false;};
  },[auth.user?.id]);
  const indexed=new Map(storedItems.map(item=>[item.href,item]));
  for(const item of cloud)if(!indexed.has(item.href))indexed.set(item.href,item);
  const items=[...indexed.values()].filter(item=>isVisible(item.href));
  async function remove(item) {
    try {
      const local=storedItems.some(x=>x.href===item.href);
      if(local)removeReadingItem(item.href);
      if(!local&&auth.user)await audienceRequest('/api/account/workspace',{action:'remove',href:item.href,kind:item.kind,title:item.title});
      setCloud(rows=>rows.filter(x=>x.href!==item.href));
      setMessage(`أُزيل «${item.title}» من القائمة.`);
    }catch {setMessage('تعذّر تحديث القائمة. تحقق من الاتصال أو تسجيل الدخول.');}
  }
  if (!ready) return <p role="status">جارٍ تجهيز قائمة القراءة…</p>;
  return <div className="reading-list">
    <div className="reading-list-intro"><Bookmark size={24} aria-hidden="true"/><p>{auth.user?'هذه قائمة تجمع محفوظات حسابك المحفوظة عبر الأجهزة ومحفوظات هذا المتصفح. يمكنك تنظيمها من «حسابي».':available?'محفوظة في هذا المتصفح دون حساب. سجّل الدخول لمزامنة المحفوظات الجديدة، وانقل القديمة باختيارك من حسابك.':'الحفظ غير متاح حالياً. اسمح بتخزين بيانات الموقع في متصفحك لتستخدم القائمة.'}</p></div>
    <div className="results-line"><strong>المحتوى المحفوظ: {formatNumber(items.length)}</strong><Link href={auth.user?"/account?tab=saved":"/"}>{auth.user?"تنظيم محفوظات حسابي":"اكتشف المزيد من المنصة"} <ArrowUpLeft size={15}/></Link></div>
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
