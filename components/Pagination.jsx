'use client';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {formatNumber} from '@/lib/format';

export default function Pagination({page, count, pageSize = 12, onChange}) {
  const pages = Math.ceil(count / pageSize);
  if (pages < 2) return null;
  return <nav className="pagination" aria-label="صفحات النتائج">
    <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}><ArrowRight size={16}/> السابق</button>
    <span aria-live="polite">{formatNumber(page)} من {formatNumber(pages)}</span>
    <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>التالي <ArrowLeft size={16}/></button>
  </nav>;
}
