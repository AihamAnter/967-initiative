'use client';
import {useMemo} from 'react';
import Link from 'next/link';
import {Search} from 'lucide-react';
import WorkCard from './WorkCard';
import Pagination from './Pagination';
import ActiveFilters from './ActiveFilters';
import {matchesSearch} from '@/lib/search';
import {formatNumber} from '@/lib/format';
import useListState from './useListState';
import {collectionDefaults,listStateSearch} from '@/lib/listState';
export default function WorkExplorer({works}) {
 const [{topic,platform,q:search,page},update]=useListState(collectionDefaults.works);
 const setTopic=topic=>update({topic,page:1}),setPlatform=platform=>update({platform,page:1}),setSearch=q=>update({q,page:1}),setPage=page=>update({page});
 const categories=['الكل',...new Set(works.map(x=>x.category).filter(Boolean))], platforms=['الكل',...new Set(works.map(x=>x.platform).filter(Boolean))];
 const matches=useMemo(()=>works.filter(x=>(topic==='الكل'||x.category===topic)&&(platform==='الكل'||x.platform===platform)&&matchesSearch(search,[x.title,x.summary,x.category,x.platform])),[works,topic,platform,search]);
 const reset=()=>update({topic:'الكل',platform:'الكل',q:'',page:1});
 const currentPage=Math.min(page,Math.max(1,Math.ceil(matches.length/12)));
 const returnTo='/works'+listStateSearch('',{q:search,topic,platform,page:currentPage},collectionDefaults.works)+'#works-results';
 return <div id="works-results"><div className="filter-bar"><label className="filter-search"><Search size={19}/><input aria-label="البحث في الأعمال" placeholder="ابحث عن عمل أو موضوع..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><select aria-label="تصفية حسب المنصة" value={platform} onChange={e=>{setPlatform(e.target.value);setPage(1);}}>{platforms.map(x=><option key={x} value={x}>{x==='الكل'?'كل المنصات':x}</option>)}</select></div>
 <div className="filter-tabs" role="group" aria-label="موضوع العمل">{categories.map(x=><button key={x} onClick={()=>{setTopic(x);setPage(1);}} aria-pressed={topic===x} className={topic===x?'selected':''}>{x}</button>)}</div>
 <ActiveFilters filters={[search&&{key:'q',label:'البحث: '+search,onRemove:()=>setSearch('')},topic!=='الكل'&&{key:'topic',label:'الموضوع: '+topic,onRemove:()=>setTopic('الكل')},platform!=='الكل'&&{key:'platform',label:'المنصة: '+platform,onRemove:()=>setPlatform('الكل')}]} onClear={reset}/>
 <div className="results-line" aria-live="polite"><span>عدد الأعمال المنشورة: {formatNumber(matches.length)}</span></div>
 {matches.length?<div className={'work-grid collection-results results-count-'+Math.min(matches.length,3)}>{matches.slice((currentPage-1)*12,currentPage*12).map((work,index)=><WorkCard work={work} index={index} returnTo={returnTo} key={work.id}/>)}</div>:<div className="empty-state"><Search size={28}/><h2>{works.length?'لا توجد أعمال تطابق بحثك':'المكتبة تستعد لحكاياتها القادمة'}</h2><p>{works.length?'جرّب كلمات أخرى أو أعد ضبط الفلاتر.':'ستظهر هنا الأعمال بعد نشرها. يمكنك المساهمة باقتراح موضوع.'}</p>{works.length?<button className="btn btn-outline" onClick={reset}>إعادة ضبط الفلاتر</button>:<Link href="/contribute?type=اقتراح%20موضوع" className="btn btn-outline">اقترح موضوعاً</Link>}</div>}
 <Pagination page={currentPage} count={matches.length} onChange={setPage}/></div>;
}
