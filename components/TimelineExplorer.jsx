'use client';

import {useMemo, useRef, useState} from 'react';
import {AlertTriangle, Check, Download, ImageDown, SlidersHorizontal} from 'lucide-react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {csvEscape} from '@/lib/yemenNumbers';
import {formatNumber, formatYear} from '@/lib/format';

const colors = ['#176b75', '#f1b84b', '#60b8a3', '#78a7e8'];

function downloadBlob(content, type, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], {type}));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function TimelineExplorer({indicators}) {
  const available = indicators.filter(item => item.values.length);
  const initial = available.length ? [available[0].id] : [];
  const [selectedIds, setSelectedIds] = useState(initial);
  const [mode, setMode] = useState('actual');
  const allYears = [...new Set(available.flatMap(item => item.values.map(value => Number(value.year))))].sort((a, b) => a - b);
  const latestYear = allYears.at(-1) || new Date().getFullYear();
  const earliestYear = Math.max(1990, allYears[0] || 1990);
  const [fromYear, setFromYear] = useState(earliestYear);
  const [toYear, setToYear] = useState(latestYear);
  const chartRef = useRef(null);
  const selected = available.filter(item => selectedIds.includes(item.id));
  const activeUnit = selected[0]?.unit || '';
  const percentageValid = selected.length > 0 && selected.every(item => {
    const baseline = item.values.find(value => value.year >= fromYear && value.year <= toYear);
    return baseline && Number(baseline.value) !== 0;
  });
  const chartData = useMemo(() => {
    const years = Array.from({length: Math.max(0, toYear - fromYear + 1)}, (_, index) => fromYear + index);
    return years.map(year => {
      const row = {year};
      for (const indicator of selected) {
        const value = indicator.values.find(item => Number(item.year) === year);
        if (!value) { row[indicator.id] = null; continue; }
        if (mode === 'percent') {
          const baseline = indicator.values.find(item => item.year >= fromYear && item.year <= toYear);
          row[indicator.id] = baseline && Number(baseline.value) !== 0 ? ((Number(value.value) - Number(baseline.value)) / Math.abs(Number(baseline.value))) * 100 : null;
        } else row[indicator.id] = Number(value.value);
      }
      return row;
    });
  }, [fromYear, mode, selected, toYear]);

  function toggleIndicator(indicator) {
    setSelectedIds(current => {
      if (current.includes(indicator.id)) return current.filter(id => id !== indicator.id);
      if (current.length >= 4 || (activeUnit && indicator.unit !== activeUnit)) return current;
      return [...current, indicator.id];
    });
  }
  function exportCsv() {
    const header = ['year', ...selected.map(item => item.name)];
    const csv = '\ufeff' + [header, ...chartData.map(row => [row.year, ...selected.map(item => row[item.id] ?? '')])].map(row => row.map(csvEscape).join(',')).join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8', 'yemen-across-time.csv');
  }
  function exportImage() {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    const source = URL.createObjectURL(new Blob([markup], {type: 'image/svg+xml;charset=utf-8'}));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1200, image.width * 2); canvas.height = Math.max(700, image.height * 2);
      const context = canvas.getContext('2d');
      context.fillStyle = '#171716'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob) downloadBlob(blob, 'image/png', 'yemen-across-time.png'); });
      URL.revokeObjectURL(source);
    };
    image.src = source;
  }

  if (!available.length) return <div className="stat-empty"><SlidersHorizontal size={30}/><h3>لا توجد سلاسل زمنية منشورة بعد</h3><p>ستصبح المقارنة متاحة تلقائياً بعد نشر قيم سنوية لمؤشر واحد على الأقل.</p></div>;
  return <div className="timeline-explorer">
    <aside className="timeline-controls">
      <h2><SlidersHorizontal size={20}/> إعداد المقارنة</h2>
      <p>اختر حتى 4 مؤشرات من الوحدة نفسها لتجنب مقارنة مضللة.</p>
      <div className="timeline-indicator-list">{available.map(indicator => {
        const checked = selectedIds.includes(indicator.id);
        const incompatible = !checked && Boolean(activeUnit && indicator.unit !== activeUnit);
        return <label className={incompatible ? 'disabled' : ''} key={indicator.id}><input type="checkbox" checked={checked} disabled={incompatible || (!checked && selectedIds.length >= 4)} onChange={() => toggleIndicator(indicator)}/><span className="timeline-check">{checked && <Check size={14}/>}</span><span><strong>{indicator.name}</strong><small>{indicator.unit}</small></span></label>;
      })}</div>
    </aside>
    <section className="timeline-stage">
      <div className="timeline-toolbar">
        <label>من<select value={fromYear} onChange={event => {const next = Number(event.target.value); setFromYear(next); if (next > toYear) setToYear(next);}}>{Array.from({length: latestYear - 1990 + 1}, (_, index) => 1990 + index).map(year => <option key={year}>{year}</option>)}</select></label>
        <label>إلى<select value={toYear} onChange={event => {const next = Number(event.target.value); setToYear(next); if (next < fromYear) setFromYear(next);}}>{Array.from({length: latestYear - 1990 + 1}, (_, index) => 1990 + index).map(year => <option key={year}>{year}</option>)}</select></label>
        <div className="stat-segmented" aria-label="طريقة المقارنة"><button className={mode === 'actual' ? 'selected' : ''} onClick={() => setMode('actual')}>القيمة الفعلية</button><button disabled={!percentageValid} className={mode === 'percent' ? 'selected' : ''} onClick={() => setMode('percent')}>نسبة التغير</button></div>
        <button title="تنزيل CSV" onClick={exportCsv} disabled={!selected.length}><Download size={18}/></button>
        <button title="تنزيل الرسم كصورة" onClick={exportImage} disabled={!selected.length}><ImageDown size={18}/></button>
      </div>
      {!percentageValid && selected.length > 0 && <p className="stat-warning"><AlertTriangle size={17}/> لا تتاح نسبة التغير عندما تكون قيمة الأساس صفراً أو غير موجودة.</p>}
      <div className="timeline-chart" ref={chartRef}>
        {selected.length ? <ResponsiveContainer width="100%" height={460}><LineChart data={chartData}><CartesianGrid stroke="#d9dfd9" vertical={false}/><XAxis dataKey="year" tickFormatter={formatYear} stroke="#5e6b6d"/><YAxis tickFormatter={value => formatNumber(value, {notation: 'compact', maximumFractionDigits: 1})} stroke="#5e6b6d" width={70}/><Tooltip labelFormatter={formatYear} formatter={value => [formatNumber(value, {maximumFractionDigits: 2}) + (mode === 'percent' ? '%' : ` ${activeUnit}`), '']}/><Legend/>{selected.map((indicator, index) => <Line key={indicator.id} dataKey={indicator.id} name={indicator.name} stroke={colors[index]} strokeWidth={2.5} connectNulls={false} dot={{r: 3}}/>)}</LineChart></ResponsiveContainer> : <div className="stat-chart-empty"><p>اختر مؤشراً واحداً على الأقل.</p></div>}
      </div>
      <div className="timeline-sources">{selected.map(item => <span key={item.id}><b>{item.name}:</b> {item.adopted_source?.name || item.latestValue?.source?.name || 'المصدر غير محدد'}</span>)}</div>
      <p className="timeline-note">الفراغات في الخط الزمني تعني عدم وجود قيمة منشورة. لا تُستكمل السنوات المفقودة ولا تُقدّر آلياً.</p>
    </section>
  </div>;
}
