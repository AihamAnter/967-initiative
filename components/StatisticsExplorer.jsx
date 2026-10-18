'use client';

import {useMemo} from 'react';
import {Filter, Search, X} from 'lucide-react';
import IndicatorCard from '@/components/IndicatorCard';
import {formatNumber} from '@/lib/format';
import {formatYear} from '@/lib/format';
import {rankSearchResults} from '@/lib/search';
import Pagination from './Pagination';
import useListState from './useListState';

export default function StatisticsExplorer({indicators, sections}) {
  const [{q:query,domain,year,page},update]=useListState({q:'',domain:'all',year:'all',page:1});
  const setQuery=q=>update({q,page:1}),setDomain=domain=>update({domain,page:1}),setYear=year=>update({year,page:1}),setPage=page=>update({page});
  const years = useMemo(() => [...new Set(indicators.flatMap(item => item.values.map(value => Number(value.year))))].sort((a, b) => b - a), [indicators]);
  const visible = useMemo(() => {
    const candidates = indicators.filter(item => (domain === 'all' || item.domain_id === domain)
      && (year === 'all' || item.values.some(value => String(value.year) === year)))
      .map(item => ({indicator: item, title: item.name, description: item.short_description,
        meta: item.domain?.name, searchText: [item.definition, item.domain?.section?.name].filter(Boolean).join(' ')}));
    return rankSearchResults(query, candidates).map(item => item.indicator);
  }, [domain, indicators, query, year]);
  const filtered = query || domain !== 'all' || year !== 'all';
  const currentPage=Math.min(page,Math.max(1,Math.ceil(visible.length/12)));

  return <div className="stat-explorer">
    <div className="stat-toolbar" role="search">
      <label className="stat-search"><Search size={19}/><span className="sr-only">ابحث في المؤشرات</span><input value={query} onChange={event => {setQuery(event.target.value);setPage(1);}} placeholder="ابحث عن مؤشر أو موضوع..."/></label>
      <label><Filter size={17}/><span>المجال</span><select value={domain} onChange={event => {setDomain(event.target.value);setPage(1);}}><option value="all">كل المجالات</option>{sections.map(section => <optgroup key={section.id} label={section.name}>{section.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</select></label>
      <label><span>السنة</span><select value={year} onChange={event => {setYear(event.target.value);setPage(1);}}><option value="all">كل السنوات</option>{years.map(item => <option key={item} value={item}>{formatYear(item)}</option>)}</select></label>
      {filtered && <button className="stat-clear" onClick={() => {setQuery(''); setDomain('all'); setYear('all');setPage(1);}}><X size={16}/> إعادة الضبط</button>}
    </div>
    <div className="stat-results-head" aria-live="polite"><strong>عدد المؤشرات المطابقة: {formatNumber(visible.length)}</strong><span>النطاق الجغرافي: الجمهورية اليمنية</span></div>
    {visible.length ? <div className="stat-indicator-grid">{visible.slice((currentPage-1)*12,currentPage*12).map(indicator => <IndicatorCard indicator={indicator} key={indicator.id}/>)}</div> : <div className="stat-empty"><Search size={28}/><h3>لا توجد مؤشرات مطابقة</h3><p>{indicators.length ? 'غيّر كلمات البحث أو عوامل التصفية.' : 'لم تُنشر مؤشرات رقمية بعد. ستظهر هنا بعد توثيقها ونشرها من لوحة التحرير.'}</p></div>}
    <Pagination page={currentPage} count={visible.length} onChange={setPage}/>
  </div>;
}
