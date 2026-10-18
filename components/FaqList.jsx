'use client';
import {useState} from 'react';
import {Search} from 'lucide-react';
import {matchesSearch} from '@/lib/search';
import ContentText from './ContentText';

export default function FaqList({items,availablePaths}){
 const [query,setQuery]=useState('');
 const results=items.filter(item=>matchesSearch(query,[item.question,item.answer]));
 return <section className="help-faq"><h2>الأسئلة الشائعة</h2>
  <label className="help-search"><span>ابحث في المساعدة</span><span><Search size={18}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="مثال: البحث، المسودة، المصادر" maxLength={150}/></span></label>
  <p className="small-muted" role="status">عدد الإجابات: {results.length}</p>
  <div className="faq-list">{results.map(item=><details key={item.id}><summary>{item.question}</summary><div><ContentText text={item.answer} availablePaths={availablePaths}/></div></details>)}</div>
  {!results.length&&<p className="help-empty">لا توجد إجابة مطابقة. جرّب كلمة أخرى أو تواصل معنا من الرابط أدناه.</p>}
 </section>;
}
