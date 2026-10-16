'use client';

import {useState} from 'react';
import {Check, Download, Share2} from 'lucide-react';
import {csvEscape} from '@/lib/yemenNumbers';

export default function IndicatorActions({indicator}) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  async function share() {
    const url = window.location.href;
    setShareError('');
    if (navigator.share) {
      try { await navigator.share({title: indicator.name, text: indicator.short_description, url}); return; }
      catch(error) {if(error.name==='AbortError')return;}
    }
    try {
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }catch{
      setCopied(false);
      setShareError('تعذر نسخ الرابط تلقائياً. يمكنك تحديد الرابط أدناه ونسخه.');
    }
  }
  function downloadCsv() {
    const exportedValues = indicator.allValues || indicator.values;
    const rows = [['year', 'value', 'unit', 'source', 'status', 'document_url'], ...exportedValues.map(value => [value.year, value.value, indicator.unit, value.source?.name || '', value.value_status, value.document_url || ''])];
    const csv = '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    link.download = indicator.slug + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return <><div className="stat-actions">
    <button className="btn btn-outline" onClick={share}>{copied ? <Check size={17}/> : <Share2 size={17}/>} {copied ? 'تم نسخ الرابط' : 'مشاركة المؤشر'}</button>
    <button className="btn btn-outline" onClick={downloadCsv} disabled={!(indicator.allValues || indicator.values).length}><Download size={17}/> تنزيل CSV</button>
  </div>{shareError&&<div className="share-fallback"><p role="status">{shareError}</p><input readOnly aria-label="رابط المؤشر للمشاركة" value={typeof window==='undefined'?'':window.location.href} dir="ltr" onFocus={event=>event.target.select()}/></div>}</>;
}
