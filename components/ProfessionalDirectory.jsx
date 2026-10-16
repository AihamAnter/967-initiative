'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import {ArrowUpLeft, BadgeCheck, ChevronDown, Mail, MapPin, MessageCircle, Phone, Search, SlidersHorizontal, UserSearch, X} from 'lucide-react';
import {serviceModes} from '@/lib/professionals';
import {formatNumber} from '@/lib/format';
import {normalizeSearch} from '@/lib/search';
import Pagination from './Pagination';

const whatsappLink = number => 'https://wa.me/' + String(number || '').replace(/\D/g, '').replace(/^00/, '');

export default function ProfessionalDirectory({professionals}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('الكل');
  const [location, setLocation] = useState('كل المحافظات');
  const [mode, setMode] = useState('كل طرق الخدمة');

  const categories = useMemo(() => ['الكل', ...new Set([
    ...professionals.map(person => person.category).filter(Boolean),
  ])], [professionals]);
  const locations = useMemo(() => ['كل المحافظات', ...new Set(professionals.map(person => person.location).filter(Boolean))], [professionals]);

  const results = useMemo(() => {
    const needle = normalizeSearch(query);
    return professionals.filter(person => {
      const haystack = [person.fullName, person.professionTitle, person.category, person.location, ...person.services, ...person.skills]
        .join(' ');
      return (!needle || normalizeSearch(haystack).includes(needle))
        && (category === 'الكل' || person.category === category)
        && (location === 'كل المحافظات' || person.location === location)
        && (mode === 'كل طرق الخدمة' || person.serviceMode === mode);
    });
  }, [category, location, mode, professionals, query]);

  function clearFilters() {
    setQuery('');setPage(1);
    setCategory('الكل');
    setLocation('كل المحافظات');
    setMode('كل طرق الخدمة');
  }

  return <div className="professionals-directory">
    <div className="professionals-toolbar">
      <label className="professionals-search"><Search size={19}/><input value={query} onChange={event => {setQuery(event.target.value);setPage(1);}} placeholder="ابحث بالاسم، المهنة أو الخدمة..." aria-label="البحث عن مهني"/>{query && <button type="button" onClick={() => setQuery('')} title="مسح البحث"><X size={17}/></button>}</label>
      <label className="professionals-select"><SlidersHorizontal size={17}/><select value={category} onChange={event => {setCategory(event.target.value);setPage(1);}} aria-label="اختيار المهنة"><option value="الكل">كل المهن</option>{categories.filter(item => item !== 'الكل').map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={16}/></label>
      <label className="professionals-select"><MapPin size={17}/><select value={location} onChange={event => {setLocation(event.target.value);setPage(1);}} aria-label="اختيار المحافظة">{locations.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={16}/></label>
      <label className="professionals-select"><UserSearch size={17}/><select value={mode} onChange={event => {setMode(event.target.value);setPage(1);}} aria-label="طريقة تقديم الخدمة"><option>كل طرق الخدمة</option>{serviceModes.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={16}/></label>
    </div>

    <div className="professionals-results" aria-live="polite"><span>المهنيون المطابقون لبحثك</span><strong>عدد النتائج: {formatNumber(results.length)}</strong>{(query || category !== 'الكل' || location !== 'كل المحافظات' || mode !== 'كل طرق الخدمة') && <button className="filter-reset" onClick={clearFilters}>إعادة الضبط</button>}</div>

    {results.length ? <div className="professional-grid">{results.slice((page-1)*12,page*12).map(person => <article className="professional-card" key={person.id}>
      <Link className="professional-card-hitarea" href={'/professionals/' + person.id} aria-label={'عرض ملف ' + person.fullName}><span className="sr-only">عرض ملف {person.fullName}</span></Link>
      <div className="professional-card-body">
        <div className="professional-card-kicker"><span>{person.category}</span><span>{person.serviceMode}</span></div>
        <div className="professional-card-meta"><span><MapPin size={13}/>{person.location}</span>{person.isVerified && <span className="professional-verified"><BadgeCheck size={14}/> موثق</span>}</div>
        <h2>{person.fullName}</h2>{person.isDemo&&<span className="status-badge">نموذج تجريبي</span>}{person.needsReview&&!person.isDemo&&<span className="status-badge">بيانات بحاجة إلى مراجعة</span>}
        <strong>{person.professionTitle}</strong>
        <p>{person.bio}</p>
        <div className="professional-service-tags">{person.services.slice(0, 3).map(service => <span key={service}>{service}</span>)}</div>
        <div className="professional-card-footer">
          <span className="professional-card-profile-link">عرض الملف <ArrowUpLeft size={16}/></span>
          <div className="professional-card-contact">{person.phone && <a href={'tel:' + person.phone} title="اتصال" aria-label={'الاتصال بـ ' + person.fullName}><Phone size={16}/></a>}{person.whatsapp && <a href={whatsappLink(person.whatsapp)} target="_blank" rel="noopener noreferrer" title="واتساب" aria-label={'مراسلة ' + person.fullName + ' عبر واتساب'}><MessageCircle size={16}/></a>}{person.email && <a href={'mailto:' + person.email} title="بريد إلكتروني" aria-label={'مراسلة ' + person.fullName + ' بالبريد الإلكتروني'}><Mail size={16}/></a>}</div>
        </div>
      </div>
    </article>)}</div> : <div className="professionals-empty"><UserSearch size={38}/><h2>لا توجد نتائج مطابقة</h2><p>جرّب مهنة أو محافظة أخرى، أو أزل عوامل التصفية.</p><button type="button" className="btn btn-outline" onClick={clearFilters}>عرض جميع المهنيين</button></div>}
    <Pagination page={page} count={results.length} onChange={setPage}/>
  </div>;
}
