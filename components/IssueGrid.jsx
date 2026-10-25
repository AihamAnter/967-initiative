'use client';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {canOptimizeImage} from '@/lib/media';
import {Search,ArrowUpLeft,CalendarDays,BookOpen} from 'lucide-react';
import {formatArabicDate,formatNumber} from '@/lib/format';
import {matchesSearch} from '@/lib/search';
import Pagination from './Pagination';
import ActiveFilters from './ActiveFilters';
import SaveForLater from './reading/SaveForLater';
export default function IssueGrid({issues}) {
 const [search,setSearch]=useState(''),[page,setPage]=useState(1);
 const results=issues.filter(x=>matchesSearch(search,[x.title,x.summary,x.number]));
 return <><div className="archive-tools"><h2>أرشيف الأعداد <span>({formatNumber(issues.length)})</span></h2><label className="filter-search"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="ابحث بالعنوان أو رقم العدد..." aria-label="البحث في الأعداد"/></label></div>
 <ActiveFilters filters={[search&&{key:'q',label:'البحث: '+search,onRemove:()=>{setSearch('');setPage(1);}}]} onClear={()=>{setSearch('');setPage(1);}}/>
 <div className="results-line" aria-live="polite"><span>الأعداد المطابقة: {formatNumber(results.length)}</span></div>
 <div className="issue-grid">{results.slice((page-1)*12,page*12).map(x=><article className="issue-card" key={x.id}><Link href={'/magazine/'+x.slug} className="issue-card-open"><div className="issue-cover">{x.cover_url?<Image src={x.cover_url} alt={'غلاف '+x.title} fill sizes="(max-width:760px) 45vw, 25vw" unoptimized={!canOptimizeImage(x.cover_url)}/>:<BookOpen size={40}/>}</div><div className="issue-card-content"><time className="issue-date" dateTime={x.issue_date}><CalendarDays size={14}/>{formatArabicDate(x.issue_date)}</time><h3>{x.title}</h3><span className="issue-open">قراءة العدد <ArrowUpLeft size={17}/></span></div></Link>{!x.is_demo&&<div className="card-save-action"><SaveForLater item={{kind:'issue',href:'/magazine/'+encodeURIComponent(x.slug),title:x.title}}/></div>}</article>)}</div>
 {!results.length&&<div className="empty-state"><BookOpen size={28}/><h3>لا توجد أعداد مطابقة لبحثك.</h3><button className="btn btn-outline" onClick={()=>{setSearch('');setPage(1);}}>مسح البحث</button></div>}<Pagination page={page} count={results.length} onChange={setPage}/></>;
}
