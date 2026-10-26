'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {safeNavigationSource} from '@/lib/navigationContext';
export default function ContextBackLink({fallback,label='العودة إلى القسم',className='back-link',children,leading=null,contextOnly=false}){
 const source=safeNavigationSource(useSearchParams().get('from'));
 if(contextOnly&&!source)return null;
 const href=source||fallback;
 const names={'/search':'العودة إلى نتائج البحث','/read-later':'العودة إلى القراءة لاحقًا','/yemen-map':'العودة إلى اكتشف اليمن','/universities':'العودة إلى نتائج دليل الجامعات والمعاهد','/medical-centers':'العودة إلى نتائج دليل المراكز الطبية','/account/activity':'العودة إلى نشاط الحساب'};
 const text=source?(names[source.split(/[?#]/)[0]]||label):label;
 return <Link href={href} className={className}>{leading||<ArrowRight size={17}/>} {children||text}</Link>;
}
