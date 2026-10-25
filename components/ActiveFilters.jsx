'use client';
import {X} from 'lucide-react';

export default function ActiveFilters({filters, onClear}) {
  const active = filters.filter(Boolean);
  if (!active.length) return null;
  return <div className="active-filters" role="group" aria-label="الفلاتر النشطة"><span>الفلاتر المطبّقة</span>{active.map(filter=><button type="button" className="active-filter-chip" key={filter.key} onClick={filter.onRemove} aria-label={'إزالة فلتر '+filter.label}><span>{filter.label}</span><X size={14} aria-hidden="true"/></button>)}<button type="button" className="active-filters-clear" onClick={onClear}>مسح الفلاتر</button></div>;
}
