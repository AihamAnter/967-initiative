'use client';
import {Search} from 'lucide-react';
import {normalizeArabic} from './mapGeometry';
import {useId, useRef} from 'react';

export default function MapSearch({
  query,
  setQuery,
  governorates,
  selectedGovernorateId = '',
  results,
  onSelect,
  onGovernoratePick,
}) {
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const resultsId = useId();
  return <div className="ymap-search-wrap">
    <div className="ymap-search">
      <Search size={18}/>
      <input
        ref={inputRef}
        value={query}
        onChange={event => setQuery(event.target.value)}
        aria-controls={normalizeArabic(query) ? resultsId : undefined}
        onKeyDown={event => {
          if(event.key==='Escape')setQuery('');
          if(event.key==='ArrowDown') {event.preventDefault();resultsRef.current?.querySelector('button')?.focus();}
        }}
        placeholder="ابحث عن محافظة أو مديرية..."
        aria-label="ابحث عن محافظة أو مديرية"
      />
    </div>
    <select
      value={selectedGovernorateId}
      aria-label="اختيار محافظة"
      onChange={event => {
        const governorate = governorates.find(item => item.id === event.target.value);
        if (governorate) {setQuery('');onGovernoratePick(governorate);}
      }}
    >
      <option value="">اختر محافظة</option>
      {governorates.map(item => <option key={item.id} value={item.id}>{item.nameAr}</option>)}
    </select>
    {normalizeArabic(query) && <div className="ymap-search-results" id={resultsId} ref={resultsRef} onKeyDown={event=>{
      if(event.key==='Escape'){setQuery('');inputRef.current?.focus();}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        const buttons=[...event.currentTarget.querySelectorAll('button')];
        const index=buttons.indexOf(document.activeElement),next=index+(event.key==='ArrowDown'?1:-1);
        if(next<0)inputRef.current?.focus();else buttons[Math.min(next,buttons.length-1)]?.focus();
      }
    }}>
      <span className="sr-only" role="status">عدد النتائج: {results.length}</span>
      {results.length ? results.map(item => <button type="button" key={item.type + item.id} onClick={() => onSelect(item)}>
        <span>{item.nameAr}</span>
        <small>{item.type === 'governorate' ? 'محافظة' : `مديرية · ${item.governorateNameAr}`}</small>
      </button>) : <p>لا توجد نتائج مطابقة.</p>}
    </div>}
  </div>;
}
