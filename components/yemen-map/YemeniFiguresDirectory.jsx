'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpLeft, AtSign, Facebook, Globe2, MapPinned, RotateCcw, Search, Youtube} from 'lucide-react';
import {matchesSearch} from '@/lib/search';
import {yemenGovernorates, yemeniFigureEras, yemeniFigureFields} from '@/lib/yemeniFigures';
import {formatNumber} from '@/lib/format';

const socialLinks = figure => [
  {url: figure.website, label: 'الموقع الإلكتروني', icon: Globe2},
  {url: figure.facebookUrl, label: 'فيسبوك', icon: Facebook},
  {url: figure.instagramUrl, label: 'إنستغرام', icon: AtSign},
  {url: figure.xUrl, label: 'منصة X', icon: AtSign},
  {url: figure.youtubeUrl, label: 'يوتيوب', icon: Youtube},
].filter(item => item.url);

function lifeYears(figure) {
  if (!figure.birthYear && !figure.deathYear) return '';
  return figure.deathYear ? `${figure.birthYear || '؟'} – ${figure.deathYear}` : `الميلاد: ${figure.birthYear}`;
}

function figureInitials(name) {
  return String(name || '').split(/\s+/).filter(word => !['الملكة', 'الملك', 'بن', 'بنت'].includes(word)).slice(0, 2)
    .map(word => word.replace(/^ال/, '').slice(0, 1)).join(' ');
}

export default function YemeniFiguresDirectory({figures, selectedGovernorateId, onGovernorateChange, embedded=false}) {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('الكل');
  const [era, setEra] = useState('الكل');
  const [withSocial, setWithSocial] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const fields = useMemo(() => [...new Set([
    ...yemeniFigureFields,
    ...figures.map(figure => figure.field).filter(Boolean),
  ])], [figures]);

  const governorates = useMemo(() => yemenGovernorates.filter(governorate =>
    figures.some(figure => figure.governorateId === governorate.id)
  ), [figures]);

  const filteredFigures = useMemo(() => {
    return figures.filter(figure => {
      const matchesName = matchesSearch(query,[figure.fullName,figure.knownFor,figure.shortBio]);
      const matchesField = field === 'الكل' || figure.field === field;
      const matchesGovernorate = !selectedGovernorateId || figure.governorateId === selectedGovernorateId;
      const matchesEra = era === 'الكل' || figure.era === era;
      const matchesSocial = !withSocial || socialLinks(figure).length > 0;
      return matchesName && matchesField && matchesGovernorate && matchesEra && matchesSocial;
    });
  }, [era, field, figures, query, selectedGovernorateId, withSocial]);

  const hasFilters = Boolean(query || field !== 'الكل' || selectedGovernorateId || era !== 'الكل' || withSocial);
  const visibleFigures = filteredFigures.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(12); }, [era, field, query, selectedGovernorateId, withSocial]);

  function resetFilters() {
    setQuery('');
    setField('الكل');
    setEra('الكل');
    setWithSocial(false);
    onGovernorateChange(null);
  }

  return <section className="yfigures-section" id={embedded?undefined:'yemeni-figures'}>
    <div className="container yfigures-container">
      <header className="yfigures-head">
        <div><span className="eyebrow">ذاكرة وأثر</span><h2>شخصيات <span>يمنية</span></h2></div>
        <p>تعرّف على شخصيات يمنية معاصرة وتاريخية، وابحث بحسب الاسم أو المجال أو المحافظة.</p>
      </header>

      {figures.some(figure=>figure.isDemo) && <p className="data-disclosure">يتضمن العرض ملفات من الكتالوج التجريبي للمشروع. هذه الملفات موسومة كتوضيحية وتحتاج مراجعة مصادرها قبل اعتمادها كمحتوى منشور.</p>}

      <div className="yfigures-filters" role="search" aria-label="البحث وتصفية الشخصيات">
        <label className="yfigures-search"><Search size={19}/><span className="sr-only">ابحث بالاسم</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم الشخصية..."/></label>
        <label><span>المجال</span><select value={field} onChange={event => setField(event.target.value)}><option>الكل</option>{fields.map(item => <option key={item}>{item}</option>)}</select></label>
        <label><span>المحافظة</span><select value={selectedGovernorateId || ''} onChange={event => onGovernorateChange(event.target.value || null)}><option value="">كل المحافظات</option>{governorates.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>الفترة</span><select value={era} onChange={event => setEra(event.target.value)}><option>الكل</option>{yemeniFigureEras.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="yfigures-check"><input type="checkbox" checked={withSocial} onChange={event => setWithSocial(event.target.checked)}/><span>لديها روابط تواصل</span></label>
        <button type="button" className="yfigures-reset" onClick={resetFilters} disabled={!hasFilters} title="مسح الفلاتر"><RotateCcw size={18}/><span>مسح</span></button>
      </div>

      <div className="yfigures-results-bar" aria-live="polite"><strong>{formatNumber(filteredFigures.length)}</strong><span>شخصية مطابقة</span>{selectedGovernorateId && <small>الخريطة والدليل يعرضان المحافظة نفسها</small>}</div>

      {filteredFigures.length ? <div className="yfigures-grid">
        {visibleFigures.map(figure => {
          const links = socialLinks(figure);
          return <article className="yfigure-card" key={figure.id}>
            <Link className="yfigure-card-hitarea" href={`/yemen-map/figures/${figure.slug}`} aria-label={`عرض صفحة ${figure.fullName}`}><span className="sr-only">عرض صفحة {figure.fullName}</span></Link>
            <div className="yfigure-image">
              {figure.imageUrl ? <Image src={figure.imageUrl} alt={figure.imageKind==='context'?figure.imageCredit:`صورة ${figure.fullName}`} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" unoptimized={figure.imageUrl.startsWith('http')} /> : <span className="yfigure-initials">{figureInitials(figure.fullName)}</span>}
              <span className="yfigure-era">{figure.era}</span>
              {figure.imageSourceUrl&&<a className="yfigure-photo-credit" href={figure.imageSourceUrl} target="_blank" rel="noopener noreferrer" title={figure.imageCredit}>{figure.imageCredit||'مصدر الصورة وحقوقها'}</a>}
            </div>
            <div className="yfigure-content">
              <div className="yfigure-meta"><span>{figure.field}</span>{lifeYears(figure) && <span dir="ltr">{lifeYears(figure)}</span>}</div>
              <h3>{figure.fullName}</h3>
              {figure.isDemo && <span className="status-badge">ملف توضيحي — يحتاج مراجعة</span>}
              <strong>{figure.knownFor}</strong>
              <p>{figure.shortBio}</p>
              <div className="yfigure-footer">
                {figure.governorateName&&<span className="yfigure-location"><MapPinned size={17}/>{figure.governorateName}<small>المحافظة المرتبطة</small></span>}
                {links.length > 0 && <div className="yfigure-socials">{links.map(({url, label, icon: Icon}) => <a href={url} target="_blank" rel="noreferrer" aria-label={`${label} - ${figure.fullName}`} title={label} key={label}><Icon size={17}/></a>)}</div>}
                {links.length === 0 && <ArrowUpLeft className="yfigure-open-icon" size={20} aria-hidden="true"/>}
              </div>
            </div>
          </article>;
        })}
      </div> : <div className="yfigures-empty"><Search size={28}/><h3>لا توجد نتائج مطابقة</h3><p>جرّب تغيير المجال أو المحافظة أو مسح عبارة البحث.</p><button type="button" className="btn btn-outline" onClick={resetFilters}>مسح الفلاتر</button></div>}
      {visibleCount < filteredFigures.length && <button type="button" className="yfigures-more" onClick={() => setVisibleCount(count => count + 12)}>عرض المزيد <span>{Math.min(12, filteredFigures.length - visibleCount)}</span></button>}
    </div>
  </section>;
}
