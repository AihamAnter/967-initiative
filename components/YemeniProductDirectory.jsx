'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useMemo} from 'react';
import {ArrowUpLeft, ChevronDown, MapPin, Package, Search, SlidersHorizontal, X} from 'lucide-react';
import {formatNumber} from '@/lib/format';
import {matchesSearch} from '@/lib/search';
import useListState from './useListState';
import {collectionDefaults,listStateSearch} from '@/lib/listState';
import Pagination from './Pagination';

export default function YemeniProductDirectory({companies}) {
  const [{q:query,page,category,location},update]=useListState(collectionDefaults.products);
  const setQuery=q=>update({q,page:1}),setPage=page=>update({page}),setCategory=category=>update({category,page:1}),setLocation=location=>update({location,page:1});
  const results = useMemo(() => {
    return companies.filter(company => {
      const haystack = [company.name, company.summary, company.location, company.category, ...company.products, ...company.strengths];
      return matchesSearch(query,haystack)
        && (category === 'الكل' || company.category === category)
        && (location === 'كل المحافظات' || company.location === location);
    });
  }, [category, companies, location, query]);

  const locations = ['كل المحافظات', ...new Set(companies.map(company => company.location).filter(Boolean))];
  const categories = useMemo(() => [
    'الكل',
    ...new Set([
      ...companies.map(company => company.category).filter(Boolean),
    ]),
  ], [companies]);

  const clearFilters = () => {
    update({q:'',page:1,category:'الكل',location:'كل المحافظات'});
  };
  const currentPage=Math.min(page,Math.max(1,Math.ceil(results.length/12)));
  const returnTo='/yemeni-products'+listStateSearch('',{q:query,page:currentPage,category,location},collectionDefaults.products)+'#directory';

  return <div className="products-directory">
    <div className="products-filter-bar">
      <label className="products-search">
        <Search size={19}/>
        <input value={query} onChange={event => {setQuery(event.target.value);setPage(1);}} placeholder="ابحث عن شركة، منتج أو مدينة..." aria-label="البحث في المنتجات اليمنية"/>
        {query && <button type="button" onClick={() => {setQuery('');setPage(1);}} title="مسح البحث" aria-label="مسح البحث"><X size={17}/></button>}
      </label>
      <label className="products-location">
        <MapPin size={18}/>
        <select value={location} onChange={event => {setLocation(event.target.value);setPage(1);}} aria-label="اختيار المحافظة">
          {locations.map(item => <option key={item}>{item}</option>)}
        </select>
        <ChevronDown size={16}/>
      </label>
    </div>

    <label className="products-category-select">
      <SlidersHorizontal size={18}/>
      <span>تصنيف المنتجات</span>
      <select value={category} onChange={event => {setCategory(event.target.value);setPage(1);}} aria-label="اختيار تصنيف المنتجات">
        {categories.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <ChevronDown size={17}/>
    </label>

    <div className="products-results-line" aria-live="polite">
      <span>شركات ومنتجات مطابقة لاختيارك</span>
      <strong>عدد النتائج: {formatNumber(results.length)}</strong>
      {(query || category !== 'الكل' || location !== 'كل المحافظات') && <button className="filter-reset" onClick={clearFilters}>إعادة الضبط</button>}
    </div>

    {results.length ? <div className={'company-grid collection-results results-count-'+Math.min(results.length,3)}>{results.slice((currentPage-1)*12,currentPage*12).map(company =>
      <Link className="company-card" href={'/yemeni-products/' + company.id+'?from='+encodeURIComponent(returnTo)} key={company.id}>
        <div className="company-media">
          {company.imageUrl ? <Image src={company.imageUrl || '/images/yemeni-products-hero.png'} alt={company.products.join('، ')} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" style={{objectPosition: company.imagePosition}}/> : <div className="company-placeholder"><Package size={42} strokeWidth={1}/></div>}
          {company.scale && <span>{company.scale}</span>}
        </div>
        <div className="company-main">
          <div className="company-overline"><span>{company.category}</span><span><MapPin size={13}/>{company.location}</span></div>
          <h2>{company.name}</h2>{company.isDemo&&<span className="status-badge">نموذج تجريبي</span>}{company.isVerified&&<span className="status-badge">شركة موثقة</span>}
          <p>{company.summary}</p>
          <div className="company-products" role="group" aria-label="المنتجات">{company.products.map(product => <span key={product}>{product}</span>)}</div>
          <span className="company-expand">عرض ملف الشركة والتفاصيل <ArrowUpLeft size={17}/></span>
        </div>
      </Link>
    )}</div> : <div className="products-empty">
      <Package size={34}/><h2>لا توجد نتائج مطابقة</h2><p>جرّب كلمة أخرى أو اعرض جميع القطاعات والمحافظات.</p>
      <button type="button" className="btn btn-outline" onClick={clearFilters}>إزالة عوامل التصفية</button>
    </div>}
    <Pagination page={currentPage} count={results.length} onChange={setPage}/>
  </div>;
}
