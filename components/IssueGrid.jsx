'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Search,ArrowUpLeft,CalendarDays,BookOpen} from 'lucide-react';
export default function IssueGrid({issues}){
 const [search,setSearch]=useState('');
 const results=issues.filter(i=>[i.title,i.summary,String(i.number)].join(' ').includes(search.trim()));
 return <><div className="archive-tools"><h2>أرشيف الأعداد <span>({issues.length})</span></h2><div className="filter-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث في الأعداد..." aria-label="البحث في الأعداد"/></div></div><div className="issue-grid">{results.map(i=><Link href={'/magazine/'+i.slug} className="issue-card" key={i.id}><div className="issue-cover"><img src={i.cover_url||'/images/demo-cover.svg'} alt={'غلاف '+i.title}/>{i.is_demo&&<span className="demo-label">تجريبي</span>}</div><div className="issue-card-content"><span className="issue-date"><CalendarDays size={14}/>{new Date(i.issue_date+'T12:00:00').toLocaleDateString('ar-YE',{year:'numeric',month:'long',day:'numeric'})}</span><h3>{i.title}</h3><span className="issue-open">قراءة العدد <ArrowUpLeft size={17}/></span></div></Link>)}</div>{!results.length&&<div className="empty-state"><BookOpen size={28}/><p>لا توجد أعداد مطابقة لبحثك.</p></div>}</>
}
