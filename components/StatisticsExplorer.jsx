'use client';

import {useMemo, useState} from 'react';
import {Filter, Search, X} from 'lucide-react';
import IndicatorCard from '@/components/IndicatorCard';
import {formatNumber} from '@/lib/format';

export default function StatisticsExplorer({indicators, sections}) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('all');
  const [year, setYear] = useState('all');
  const years = useMemo(() => [...new Set(indicators.flatMap(item => item.values.map(value => Number(value.year))))].sort((a, b) => b - a), [indicators]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ar');
    return indicators.filter(item => {
      const searchText = [item.name, item.short_description, item.definition, item.domain?.name, item.domain?.section?.name].join(' ').toLocaleLowerCase('ar');
      return (!needle || searchText.includes(needle))
        && (domain === 'all' || item.domain_id === domain)
        && (year === 'all' || item.values.some(value => String(value.year) === year));
    });
  }, [domain, indicators, query, year]);
  const filtered = query || domain !== 'all' || year !== 'all';

  return <div className="stat-explorer">
    <div className="stat-toolbar" role="search">
      <label className="stat-search"><Search size={19}/><span className="sr-only">ابحث في المؤشرات</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن مؤشر أو موضوع..."/></label>
      <label><Filter size={17}/><span>المجال</span><select value={domain} onChange={event => setDomain(event.target.value)}><option value="all">كل المجالات</option>{sections.map(section => <optgroup key={section.id} label={section.name}>{section.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</select></label>
      <label><span>السنة</span><select value={year} onChange={event => setYear(event.target.value)}><option value="all">كل السنوات</option>{years.map(item => <option key={item} value={item}>{formatNumber(item)}</option>)}</select></label>
      {filtered && <button className="stat-clear" onClick={() => {setQuery(''); setDomain('all'); setYear('all');}}><X size={16}/> مسح</button>}
    </div>
    <div className="stat-results-head"><strong>{formatNumber(visible.length)} مؤشر</strong><span>النطاق الجغرافي: الجمهورية اليمنية</span></div>
    {visible.length ? <div className="stat-indicator-grid">{visible.map(indicator => <IndicatorCard indicator={indicator} key={indicator.id}/>)}</div> : <div className="stat-empty"><Search size={28}/><h3>لا توجد مؤشرات مطابقة</h3><p>{indicators.length ? 'غيّر كلمات البحث أو عوامل التصفية.' : 'لم تُنشر مؤشرات رقمية بعد. ستظهر هنا بعد توثيقها ونشرها من لوحة التحرير.'}</p></div>}
  </div>;
}
