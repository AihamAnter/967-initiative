'use client';

import Link from 'next/link';
import {useMemo} from 'react';
import {ArrowUpLeft, BadgeCheck, ChevronDown, Mail, MapPin, MessageCircle, Phone, Search, SlidersHorizontal, UserSearch, X} from 'lucide-react';
import {serviceModes} from '@/lib/professionals';
import {formatNumber} from '@/lib/format';
import {matchesSearch} from '@/lib/search';
import {whatsappUrl} from '@/lib/contactLinks';
import useListState from './useListState';
import {collectionDefaults,listStateSearch} from '@/lib/listState';
import Pagination from './Pagination';

export default function ProfessionalDirectory({professionals}) {
  const [{q:query,page,category,location,mode},update]=useListState(collectionDefaults.professionals);
  const setQuery=q=>update({q,page:1}),setPage=page=>update({page}),setCategory=category=>update({category,page:1}),setLocation=location=>update({location,page:1}),setMode=mode=>update({mode,page:1});

  const categories = useMemo(() => ['الكل', ...new Set([
    ...professionals.map(person => person.category).filter(Boolean),
  ])], [professionals]);
  const locations = useMemo(() => ['كل المحافظات', ...new Set(professionals.flatMap(person => [person.location,...person.serviceAreas]).filter(Boolean))], [professionals]);

  const results = useMemo(() => {
    return professionals.filter(person => {
      const haystack = [person.fullName, person.professionTitle, person.category, person.location, ...person.serviceAreas,...person.services, ...person.skills];
      return matchesSearch(query,haystack)
        && (category === 'الكل' || person.category === category)
        && (location === 'كل المحافظات' || person.location === location || person.serviceAreas.includes(location))
        && (mode === 'كل طرق الخدمة' || person.serviceMode === mode || person.serviceMode === 'حضوري وعن بُعد');
    });
  }, [category, location, mode, professionals, query]);

  function clearFilters() {
    update({q:'',page:1,category:'الكل',location:'كل المحافظات',mode:'كل طرق الخدمة'});
  }
  const currentPage=Math.min(page,Math.max(1,Math.ceil(results.length/12)));
  const returnTo='/professionals'+listStateSearch('',{q:query,page:currentPage,category,location,mode},collectionDefaults.professionals)+'#professionals-directory';

  return <div className="professionals-directory">
    <div className="professionals-toolbar">
      <label className="professionals-search"><Search size={19}/><input value={query} onChange={event => {setQuery(event.target.value);setPage(1);}} placeholder="ابحث بالاسم، المهنة أو الخدمة..." aria-label="البحث عن مهني"/>{query && <button type="button" onClick={() => {setQuery('');setPage(1);}} title="مسح البحث" aria-label="مسح البحث"><X size={17}/></button>}</label>
      <label className="professionals-select"><SlidersHorizontal size={17}/><select value={category} onChange={event => {setCategory(event.target.value);setPage(1);}} aria-label="اختيار المهنة"><option value="الكل">كل المهن</option>{categories.filter(item => item !== 'الكل').map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={16}/></label>
      <label className="professionals-select"><MapPin size={17}/><select value={location} onChange={event => {setLocation(event.target.value);setPage(1);}} aria-label="منطقة تقديم الخدمة">{locations.map(item => <option key={item} value={item}>{item==='كل المحافظات'?'كل مناطق الخدمة':item}</option>)}</select><ChevronDown size={16}/></label>
      <label className="professionals-select"><UserSearch size={17}/><select value={mode} onChange={event => {setMode(event.target.value);setPage(1);}} aria-label="طريقة تقديم الخدمة"><option>كل طرق الخدمة</option>{serviceModes.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={16}/></label>
    </div>

    <div className="professionals-results" aria-live="polite"><span>المهنيون المطابقون لبحثك</span><strong>عدد النتائج: {formatNumber(results.length)}</strong>{(query || category !== 'الكل' || location !== 'كل المحافظات' || mode !== 'كل طرق الخدمة') && <button className="filter-reset" onClick={clearFilters}>إعادة الضبط</button>}</div>

    {results.length ? <div className={'professional-grid collection-results results-count-'+Math.min(results.length,3)}>{results.slice((currentPage-1)*12,currentPage*12).map(person => <article className="professional-card" key={person.id}>
      <Link className="professional-card-hitarea" href={'/professionals/' + person.id+'?from='+encodeURIComponent(returnTo)} aria-label={'عرض ملف ' + person.fullName}><span className="sr-only">عرض ملف {person.fullName}</span></Link>
      <div className="professional-card-body">
        <div className="professional-card-kicker"><span>{person.category}</span><span>{person.serviceMode}</span></div>
        <div className="professional-card-meta"><span><MapPin size={13}/>{person.location}</span>{person.isVerified && <span className="professional-verified"><BadgeCheck size={14}/> موثق</span>}</div>
        <h2>{person.fullName}</h2>{person.isDemo&&<span className="status-badge">نموذج تجريبي</span>}{person.needsReview&&!person.isDemo&&<span className="status-badge">بيانات بحاجة إلى مراجعة</span>}
        <strong>{person.professionTitle}</strong>
        {person.serviceAreas.length>0&&<span className="service-area-note">يخدم: {person.serviceAreas.join('، ')}</span>}
        <p>{person.bio}</p>
        <div className="professional-service-tags">{person.services.slice(0, 3).map(service => <span key={service}>{service}</span>)}</div>
        <div className="professional-card-footer">
          <span className="professional-card-profile-link">عرض الملف <ArrowUpLeft size={16}/></span>
          <div className="professional-card-contact">{person.phone && <a href={'tel:' + person.phone} title="اتصال" aria-label={'الاتصال بـ ' + person.fullName}><Phone size={16}/></a>}{person.whatsapp && <a className="whatsapp-card-link" href={whatsappUrl(person.whatsapp)} target="_blank" rel="noopener noreferrer" title="واتساب" aria-label={'مراسلة ' + person.fullName + ' عبر واتساب'}><MessageCircle size={16}/><span>واتساب</span></a>}{person.email && <a href={'mailto:' + person.email} title="بريد إلكتروني" aria-label={'مراسلة ' + person.fullName + ' بالبريد الإلكتروني'}><Mail size={16}/></a>}</div>
        </div>
      </div>
    </article>)}</div> : <div className="professionals-empty"><UserSearch size={38}/><h2>لا توجد نتائج مطابقة</h2><p>جرّب مهنة أو محافظة أخرى، أو أزل عوامل التصفية.</p><button type="button" className="btn btn-outline" onClick={clearFilters}>عرض جميع المهنيين</button></div>}
    <Pagination page={currentPage} count={results.length} onChange={setPage}/>
  </div>;
}
