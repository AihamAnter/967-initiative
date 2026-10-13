'use client';
import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {categories, platforms, demoWorks} from '@/lib/config';
import WorkCard from '@/components/WorkCard';

export default function WorkExplorer({works}) {
  const [topic, setTopic] = useState('الكل');
  const [platform, setPlatform] = useState('الكل');
  const [search, setSearch] = useState('');
  const isDemo = !works.length;
  const items = isDemo ? demoWorks : works;
  const matches = useMemo(() => items.filter(x =>
    (topic === 'الكل' || x.category === topic) &&
    (platform === 'الكل' || x.platform === platform) &&
    [x.title, x.summary, x.category].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  ), [items, topic, platform, search]);

  return <div>
    <div className="filter-bar">
      <div className="filter-search"><Search size={19}/><input aria-label="البحث في الأعمال" placeholder="ابحث عن عمل أو موضوع..." value={search} onChange={e => setSearch(e.target.value)}/></div>
      <select aria-label="تصفية حسب المنصة" value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map(p => <option key={p}>{p}</option>)}</select>
    </div>
    <div className="filter-tabs">{categories.map(c => <button key={c} onClick={() => setTopic(c)} className={topic === c ? 'selected' : ''}>{c}</button>)}</div>
    <div className="results-line"><span>{isDemo ? 'أمثلة توضيحية لأقسام المكتبة — ليست منشورات فعلية' : 'الأعمال المنشورة'}</span><span>{matches.length} {isDemo ? 'أمثلة' : 'عمل'}</span></div>
    <div className="work-grid">{matches.map((work, i) => <WorkCard key={work.id} work={work} index={i}/>)}</div>
    {!matches.length && <div className="empty-state"><Search size={28}/><h3>لا توجد أعمال تطابق البحث</h3><p>جرّب كلمات أخرى أو غيّر التصنيف.</p><button onClick={() => {setTopic('الكل'); setPlatform('الكل'); setSearch('');}} className="text-link">إزالة الفلاتر</button></div>}
  </div>;
}
