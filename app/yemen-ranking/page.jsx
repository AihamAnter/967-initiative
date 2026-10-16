import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import {getRankingCatalog,getRankingDataset} from '@/lib/rankingData';
import {getDefaultRankingYear,getRankingYears} from '@/lib/rankings';
import YemenRankingExplorer from '@/components/YemenRankingExplorer';

export const dynamic='force-dynamic';
export const metadata=pageMetadata({title:'ترتيب اليمن',description:'اكتشف ترتيب اليمن بين دول العالم في الاقتصاد والصحة والتعليم والتقنية والخدمات والعمل، مع مقارنة الدول والسنوات ومصادر البيانات.',path:'/yemen-ranking'});

export default async function YemenRankingPage({searchParams}) {
  const query=await searchParams;
  let indicators=[],initialDataset=null,initialIndicator=null,error=false;
  try {
    ({indicators}=await getRankingCatalog());
    initialIndicator=indicators.find(item=>item.slug===query.indicator)||indicators[0]||null;
    if(initialIndicator)initialDataset=await getRankingDataset(initialIndicator);
  }catch{error=true;}
  const requestedYear=Number(query.year);
  const initialYear=initialDataset ? (getRankingYears(initialDataset).includes(requestedYear)?requestedYear:getDefaultRankingYear(initialDataset)) : null;
  return <>
    <section className="stat-page-head"><div className="container"><Link className="back-link" href="/yemen-in-numbers">المعرفة / اليمن بالأرقام</Link><span className="eyebrow">اليمن بين دول العالم</span><h1>ترتيب اليمن</h1><p>غيّر المعيار، واختر السنة، واكتشف موقع اليمن والدول الأقرب إليه. لكل رقم مصدر وسنة، ولكل ترتيب سياقه.</p></div></section>
    <section className="section"><div className="container">{error?<div role="alert"><h2>تعذر تحميل بيانات الترتيب</h2><p>يرجى إعادة المحاولة لاحقاً.</p></div>:<YemenRankingExplorer indicators={indicators} initialIndicator={initialIndicator} initialDataset={initialDataset} initialYear={initialYear} initialScope={query.scope==='arab'?'arab':'world'} initialCompare={typeof query.compare==='string'?query.compare:''}/>}</div></section>
  </>;
}
