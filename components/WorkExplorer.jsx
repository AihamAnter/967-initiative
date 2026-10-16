'use client';
import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Search, X} from 'lucide-react';
import WorkCard from './WorkCard';
import Pagination from './Pagination';
import {matchesSearch} from '@/lib/search';
import {formatNumber} from '@/lib/format';
export default function WorkExplorer({works}) {
 const [topic,setTopic]=useState('الكل'),[platform,setPlatform]=useState('الكل'),[search,setSearch]=useState(''),[page,setPage]=useState(1);
 const categories=['الكل',...new Set(works.map(x=>x.category).filter(Boolean))], platforms=['الكل',...new Set(works.map(x=>x.platform).filter(Boolean))];
 const matches=useMemo(()=>works.filter(x=>(topic==='الكل'||x.category===topic)&&(platform==='الكل'||x.platform===platform)&&matchesSearch(search,[x.title,x.summary,x.category,x.platform])),[works,topic,platform,search]);
 const reset=()=>{setTopic('الكل');setPlatform('الكل');setSearch('');setPage(1);};
 return <div><div className="filter-bar"><label className="filter-search"><Search size={19}/><input aria-label="البحث في الأعمال" placeholder="ابحث عن عمل أو موضوع..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><select aria-label="تصفية حسب المنصة" value={platform} onChange={e=>{setPlatform(e.target.value);setPage(1);}}>{platforms.map(x=><option key={x} value={x}>{x==='الكل'?'كل المنصات':x}</option>)}</select></div>
 <div className="filter-tabs" role="group" aria-label="موضوع العمل">{categories.map(x=><button key={x} onClick={()=>{setTopic(x);setPage(1);}} aria-pressed={topic===x} className={topic===x?'selected':''}>{x}</button>)}</div>
 <div className="results-line" aria-live="polite"><span>عدد الأعمال المنشورة: {formatNumber(matches.length)}</span>{(search||topic!=='الكل'||platform!=='الكل')&&<button className="filter-reset" onClick={reset}><X size={15}/>إعادة الضبط</button>}</div>
 {matches.length?<div className="work-grid">{matches.slice((page-1)*12,page*12).map((work,index)=><WorkCard work={work} index={index} key={work.id}/>)}</div>:<div className="empty-state"><Search size={28}/><h2>{works.length?'لا توجد أعمال تطابق بحثك':'المكتبة تستعد لحكاياتها القادمة'}</h2><p>{works.length?'جرّب كلمات أخرى أو أعد ضبط الفلاتر.':'ستظهر هنا الأعمال بعد نشرها. يمكنك المساهمة باقتراح موضوع.'}</p>{works.length?<button className="btn btn-outline" onClick={reset}>إعادة ضبط الفلاتر</button>:<Link href="/contribute?type=اقتراح%20موضوع" className="btn btn-outline">اقترح موضوعاً</Link>}</div>}
 <Pagination page={page} count={matches.length} onChange={setPage}/></div>;
}