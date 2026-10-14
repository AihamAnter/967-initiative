'use client';
import {Search} from 'lucide-react';
import {normalizeArabic} from './mapGeometry';

export default function MapSearch({
  query,
  setQuery,
  governorates,
  results,
  onSelect,
  onGovernoratePick,
}) {
  return <div className="ymap-search-wrap">
    <div className="ymap-search">
      <Search size={18}/>
      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="ابحث عن محافظة أو مديرية..."
        aria-label="ابحث عن محافظة أو مديرية"
      />
    </div>
    <select
      value=""
      aria-label="اختيار محافظة"
      onChange={event => {
        const governorate = governorates.find(item => item.id === event.target.value);
        if (governorate) onGovernoratePick(governorate);
      }}
    >
      <option value="">اختر محافظة</option>
      {governorates.map(item => <option key={item.id} value={item.id}>{item.nameAr}</option>)}
    </select>
    {normalizeArabic(query) && <div className="ymap-search-results">
      {results.length ? results.map(item => <button type="button" key={item.type + item.id} onClick={() => onSelect(item)}>
        <span>{item.nameAr}</span>
        <small>{item.type === 'governorate' ? 'محافظة' : `مديرية · ${item.governorateNameAr}`}</small>
      </button>) : <p>لا توجد نتائج مطابقة.</p>}
    </div>}
  </div>;
}
