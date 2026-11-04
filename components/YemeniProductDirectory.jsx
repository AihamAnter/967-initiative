'use client';

import Image from 'next/image';
import Link from '@/components/SiteLink';
import {useMemo} from 'react';
import {ArrowUpLeft, CheckCircle2, ChevronDown, Factory, MapPin, Package, Search, SlidersHorizontal, X} from 'lucide-react';
import {formatNumber} from '@/lib/format';
import {matchesSearch} from '@/lib/search';
import useListState from './useListState';
import {collectionDefaults,listStateSearch} from '@/lib/listState';
import Pagination from './Pagination';
import ActiveFilters from './ActiveFilters';
import SaveForLater from './reading/SaveForLater';
import ContentSurface from './design/ContentSurface';
import styles from './YemeniProductDirectory.module.css';

function CompanyCard({company,returnTo}){
  const illustrative=Boolean(company.imageUrl?.includes('/wiki/Special:FilePath/'));
  const shownProducts=company.products.slice(0,3);
  const remainingProducts=Math.max(0,company.products.length-shownProducts.length);
  return <ContentSurface kind="product" className={`saveable-card ${styles.tile}`}>
    <Link className={`company-card ${styles.card}`} href={'/yemeni-products/'+company.id+'?from='+encodeURIComponent(returnTo)}>
      <div className={styles.media}>
        {company.imageUrl?
          <Image src={company.imageUrl}
            alt={illustrative?'صورة توضيحية لفئة المنتجات، لا تمثل منتجات '+company.name:company.products.length?'منتجات '+company.name:'صورة '+company.name}
            fill sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
            unoptimized={illustrative} style={{objectPosition:company.imagePosition||'center'}}/>:
          <div className={styles.placeholder} aria-hidden="true"><span className={styles.placeholderGlow}/><Factory size={54} strokeWidth={1.2}/><strong>صُنع في اليمن</strong></div>}
        <span className={styles.category}>{company.category}</span>
        {illustrative&&<span className={styles.illustrative}>صورة توضيحية — ليست صورة الشركة</span>}
      </div>
      <div className={styles.content}>
        <div className={styles.metadata}>
          {company.location&&<span><MapPin size={15} aria-hidden="true"/>{company.location}</span>}
          {company.scale&&<span className={styles.scale}>{company.scale}</span>}
        </div>
        <h2 className={styles.name}>{company.name}</h2>
        {company.isDemo?<span className={styles.demo}>نموذج تجريبي</span>:
         company.isVerified?<span className={styles.verified}><CheckCircle2 size={14} aria-hidden="true"/> شركة موثقة</span>:null}
        <p className={styles.summary}>{company.summary}</p>
        {shownProducts.length>0&&<div className={styles.productGroup} role="group" aria-label={'أبرز منتجات '+company.name}>
          <span className={styles.productLabel}><Package size={15} aria-hidden="true"/> أبرز المنتجات</span>
          <div className={styles.products}>
            {shownProducts.map(product=><span key={product}>{product}</span>)}
            {remainingProducts>0&&<span className={styles.moreProducts}>+{formatNumber(remainingProducts)} أخرى</span>}
          </div>
        </div>}
        <div className={styles.open}><span>استكشف ملف الشركة</span><span className={styles.arrow}><ArrowUpLeft size={19} aria-hidden="true"/></span></div>
      </div>
    </Link>
    <div className="card-save-action"><SaveForLater compact item={{kind:'company',href:'/yemeni-products/'+encodeURIComponent(company.id),title:company.name}}/></div>
  </ContentSurface>;
}

export default function YemeniProductDirectory({companies}) {
  const [{q:query,page,category,location},update]=useListState(collectionDefaults.products);
  const setQuery=q=>update({q,page:1}),setPage=page=>update({page}),setCategory=category=>update({category,page:1}),setLocation=location=>update({location,page:1});
  const results=useMemo(()=>companies.filter(company=>{
    const haystack=[company.name,company.summary,company.location,company.category,...company.products,...company.strengths];
    return matchesSearch(query,haystack)
      &&(category==='الكل'||company.category===category)
      &&(location==='كل المحافظات'||company.location===location);
  }),[category,companies,location,query]);

  const locations=['كل المحافظات',...new Set(companies.map(company=>company.location).filter(Boolean))];
  const categories=useMemo(()=>['الكل',...new Set(companies.map(company=>company.category).filter(Boolean))],[companies]);
  const clearFilters=()=>update({q:'',page:1,category:'الكل',location:'كل المحافظات'});
  const currentPage=Math.min(page,Math.max(1,Math.ceil(results.length/12)));
  const returnTo='/yemeni-products'+listStateSearch('',{q:query,page:currentPage,category,location},collectionDefaults.products)+'#directory';

  return <div className={`products-directory ${styles.directory}`}>
    <div className="products-filter-bar">
      <label className="products-search">
        <Search size={19}/>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="ابحث عن شركة، منتج أو مدينة..." aria-label="البحث في المنتجات اليمنية"/>
        {query&&<button type="button" onClick={()=>setQuery('')} title="مسح البحث" aria-label="مسح البحث"><X size={17}/></button>}
      </label>
      <label className="products-location">
        <MapPin size={18}/>
        <select value={location} onChange={event=>setLocation(event.target.value)} aria-label="اختيار المحافظة">
          {locations.map(item=><option key={item}>{item}</option>)}
        </select>
        <ChevronDown size={16}/>
      </label>
    </div>
    <label className="products-category-select">
      <SlidersHorizontal size={18}/>
      <span>تصنيف المنتجات</span>
      <select value={category} onChange={event=>setCategory(event.target.value)} aria-label="اختيار تصنيف المنتجات">
        {categories.map(item=><option key={item} value={item}>{item}</option>)}
      </select>
      <ChevronDown size={17}/>
    </label>
    <ActiveFilters filters={[
      query&&{key:'q',label:'البحث: '+query,onRemove:()=>setQuery('')},
      category!=='الكل'&&{key:'category',label:'التصنيف: '+category,onRemove:()=>setCategory('الكل')},
      location!=='كل المحافظات'&&{key:'location',label:'المحافظة: '+location,onRemove:()=>setLocation('كل المحافظات')}
    ]} onClear={clearFilters}/>
    <div className="products-results-line" aria-live="polite">
      <span>شركات ومنتجات مطابقة لاختيارك</span>
      <strong>عدد النتائج: {formatNumber(results.length)}</strong>
    </div>
    {results.length?
      <div className={`company-grid ${styles.grid}`}>
        {results.slice((currentPage-1)*12,currentPage*12).map(company=>
          <CompanyCard key={company.id} company={company} returnTo={returnTo}/>)}
      </div>:
      <div className="products-empty">
        <Package size={34}/><h2>لا توجد نتائج مطابقة</h2><p>جرّب كلمة أخرى أو اعرض جميع القطاعات والمحافظات.</p>
        <button type="button" className="btn btn-outline" onClick={clearFilters}>إزالة عوامل التصفية</button>
      </div>}
    <Pagination page={currentPage} count={results.length} onChange={setPage}/>
  </div>;
}
