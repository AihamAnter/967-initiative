import {Suspense} from 'react';
import Link from 'next/link';
import {ArrowLeft, BarChart3, Search} from 'lucide-react';
import {pageMetadata} from '@/lib/seo';
import {getStatIndicators, getStatSections, getSiteSettings} from '@/lib/data';
import {statisticsCrossLinks} from '@/lib/knowledgeConnections';
import {pageIsVisible} from '@/lib/pageVisibility';
import {rankSearchResults} from '@/lib/search';
import {listStateSearch, readListState} from '@/lib/listState';
import {formatNumber, formatYear} from '@/lib/format';
import CrossSectionPaths from '@/components/knowledge/CrossSectionPaths';
import {CardSkeleton, IndicatorRow} from '@/components/wayfinder/Cards';
import {ActiveChips, hrefWith, PageHeader, Pager, ResultCount} from '@/components/wayfinder/Collection';
import AutoSubmitSelect from '@/components/wayfinder/AutoSubmitSelect';
import DomainTour from '@/components/wayfinder/DomainTour';
import styles from './numbers.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'اليمن بالأرقام', description:'مؤشرات وطنية عن اليمن مع المصدر وسنة القياس والمنهجية والسلسلة الزمنية عند توفر البيانات.', path:'/yemen-in-numbers'});
const DEFAULTS = {q: '', domain: 'all', year: 'all', page: 1};
const PAGE_SIZE = 12;

// Search, filters and paging run on the server; the browser receives 12 compact
// rows (value, unit, year, value kind, status, source) instead of every
// indicator with its complete time series.
async function NumbersBody({searchParams, settings}) {
  const params = new URLSearchParams(Object.entries(await searchParams || {}).flatMap(([key, value]) => [].concat(value).map(item => [key, item])));
  const state = readListState(params.toString(), DEFAULTS);
  const [sections, indicators] = await Promise.all([getStatSections(), getStatIndicators()]);
  const withValues = indicators.filter(x => x.allValues.length > 0);
  const conflicts = indicators.filter(x => x.hasSourceConflict).length;
  const domains = sections.flatMap(section => section.domains);
  const availableDomains = domains.filter(item => indicators.some(indicator => indicator.domain_id === item.id)).map(({id, name}) => ({id, name}));
  const years = [...new Set(indicators.flatMap(item => item.values.map(value => Number(value.year))))].filter(Number.isFinite).sort((a, b) => b - a);
  const candidates = indicators.filter(item => (state.domain === 'all' || item.domain_id === state.domain) && (state.year === 'all' || item.values.some(value => String(value.year) === state.year)))
    .map(item => ({indicator: item, title: item.name, description: item.short_description, meta: item.domain?.name, searchText: [item.definition, item.domain?.section?.name].filter(Boolean).join(' ')}));
  const visible = rankSearchResults(state.q, candidates).map(item => item.indicator);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  const current = {...state, page};
  const link = patch => hrefWith('/yemen-in-numbers', current, DEFAULTS, {page: 1, ...patch}) + '#indicators';
  const returnTo = '/yemen-in-numbers' + listStateSearch('', current, DEFAULTS) + '#indicators';
  const filtered = state.q || state.domain !== 'all' || state.year !== 'all';
  const highlights = indicators.filter(x=>x.latestValue).sort((a,b) => Number(b.latestValue.year) - Number(a.latestValue.year)).slice(0,3);
  const chips = [
    state.q && {key: 'q', label: 'البحث: ' + state.q, href: link({q: ''})},
    state.domain !== 'all' && {key: 'domain', label: 'المجال: ' + (domains.find(item => item.id === state.domain)?.name || 'غير متاح'), href: link({domain: 'all'})},
    state.year !== 'all' && {key: 'year', label: 'سنة القياس: ' + (formatYear(state.year) || state.year), href: link({year: 'all'})},
  ].filter(Boolean);

  return <>
      <dl className={styles.stats} aria-label="ملخص المؤشرات المنشورة">
          <div><dt>مؤشرات منشورة</dt><dd className="ui-ltr">{formatNumber(indicators.length)}</dd></div>
          <div><dt>ذات قيم منشورة</dt><dd className="ui-ltr">{formatNumber(withValues.length)}</dd></div>
          <div><dt>دون قيم بعد</dt><dd className="ui-ltr">{formatNumber(indicators.length - withValues.length)}</dd></div>
          {indicators.some(x=>x.hasSourceConflict) && <div><dt>بانتظار اعتماد المصدر</dt><dd className="ui-ltr">{formatNumber(conflicts)}</dd></div>}
      </dl>

      {!filtered && page === 1 && highlights.length > 0 && <section className={styles.latest} aria-labelledby="latest-title">
        <h2 id="latest-title">أحدث سنوات القياس المتاحة</h2>
        <div className={styles.rows}>{highlights.map(item => <IndicatorRow key={item.id} indicator={item} headingLevel={3}/>)}</div>
      </section>}

      <section id="indicators" className={styles.explorer} aria-labelledby="indicators-title">
        <div className={styles.explorerHead}><h2 id="indicators-title">اعثر على الرقم الذي تحتاجه</h2></div>
        <DomainTour domains={availableDomains} selected={state.domain} hasResults={visible.length > 0}/>
        <form action="/yemen-in-numbers#indicators" method="get" className={styles.filters} role="search" aria-label="البحث في المؤشرات وتصفيتها">
          <div className={styles.field} data-grow>
            <label htmlFor="stat-q">ابحث في المؤشرات</label>
            <span className={styles.input}><Search size={18} aria-hidden="true"/><input id="stat-q" name="q" type="search" defaultValue={state.q} maxLength={150} placeholder="مثل: السكان، التعليم، الناتج…"/></span>
          </div>
          <div className={styles.field}>
            <label htmlFor="stat-domain">المجال</label>
            <AutoSubmitSelect id="stat-domain" name="domain" defaultValue={state.domain}><option value="all">كل المجالات</option>{sections.map(section => <optgroup key={section.id} label={section.name}>{section.domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</AutoSubmitSelect>
          </div>
          <div className={styles.field}>
            <label htmlFor="stat-year">سنة القياس</label>
            <AutoSubmitSelect id="stat-year" name="year" defaultValue={state.year}><option value="all">كل السنوات</option>{years.map(item => <option key={item} value={item}>{formatYear(item)}</option>)}</AutoSubmitSelect>
          </div>
          <button type="submit" className="ui-btn">عرض النتائج</button>
        </form>
        <ActiveChips chips={chips} clearHref="/yemen-in-numbers#indicators"/>
        <ResultCount count={visible.length} noun="عدد المؤشرات المطابقة" note={'النطاق الجغرافي: الجمهورية اليمنية' + (pages > 1 ? ` · الصفحة ${page} من ${pages}` : '')}/>
        {visible.length ? <div className={styles.rows}>{visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => <IndicatorRow key={item.id} indicator={item} returnTo={returnTo}/>)}</div>
          : <div className={styles.empty}><Search size={26} aria-hidden="true"/><h3>لا توجد مؤشرات مطابقة</h3><p>{indicators.length ? 'غيّر كلمات البحث أو عوامل التصفية.' : 'لم تُنشر مؤشرات رقمية بعد. ستظهر هنا بعد توثيقها ونشرها من لوحة التحرير.'}</p>{filtered && <Link className="ui-btn" data-variant="quiet" href="/yemen-in-numbers#indicators">إعادة ضبط البحث</Link>}</div>}
        <Pager page={page} pages={pages} hrefFor={value => hrefWith('/yemen-in-numbers', current, DEFAULTS, {page: value}) + '#indicators'} label="صفحات المؤشرات"/>
      </section>

      <section className={styles.domains} aria-labelledby="domains-title">
        <h2 id="domains-title">تصفّح بحسب المجال</h2>
        <div className={styles.sectionGrid}>{sections.map(section => <section key={section.id} className={styles.sectionCard} aria-labelledby={'sec-' + section.id}>
          <h3 id={'sec-' + section.id}>{section.name}<span>{formatNumber(section.domains.length)} مجالات</span></h3>
          {section.description && <p>{section.description}</p>}
          <ul>{section.domains.map(domain => <li key={domain.id}><Link href={'/yemen-in-numbers/' + domain.slug}>{domain.name}</Link></li>)}</ul>
        </section>)}</div>
      </section>

      <aside className={styles.method} aria-labelledby="method-title">
        <h2 id="method-title">ماذا تعني الأرقام المعروضة؟</h2>
        <p>تعرض كل بطاقة أحدث قيمة فعلية في السلسلة المعتمدة، مع سنة القياس، وليست سنة تحديث السجل. الصفر قيمة صحيحة، والقيم المفقودة لا تُعوّض بتقديرات. تُميّز القيم التقديرية عن الرسمية. عند تعارض المصادر دون اعتماد سلسلة، يتوقف العرض الرقمي حتى المراجعة.</p>
        <p>العدادات تخص المؤشرات المنشورة المتاحة للزائر. لا تُعد المؤشرات الفارغة أو المتعارضة ذات سلسلة معتمدة. راجع صفحة كل مؤشر للتعريف والمنهجية والمراجع. جميع المؤشرات وطنية ولا تمثل إحصاءات المحافظات.</p>
      </aside>

      <CrossSectionPaths items={statisticsCrossLinks(settings.pageVisibility)} id="numbers-cross-paths" title="تعلّم كيف تقرأ هذه الأرقام"/>
  </>;
}

// The header paints at once; the catalogue (the slow, full-series query) streams in.
export default async function YemenInNumbersPage({searchParams}) {
  const settings = await getSiteSettings();
  const isVisible = href => pageIsVisible(href, settings.pageVisibility, settings.contentPages || []);
  return <div className="ui-page" data-tone="explore">
    <div className="ui-wrap">
      <PageHeader task="explore" title="اليمن بالأرقام" currentPath="/yemen-in-numbers" isVisible={isVisible}
        description="وراء كل رقم سياق. ابحث عن مؤشر، راجع مصدره وسنة قياسه، وافهم كيف تغيّر عبر الزمن. جميع البيانات على مستوى الجمهورية اليمنية.">
        {isVisible('/yemen-in-numbers/timeline') && <Link className={styles.timeline} href="/yemen-in-numbers/timeline"><BarChart3 size={18} aria-hidden="true"/>قارن المؤشرات عبر الزمن<ArrowLeft size={16} aria-hidden="true"/></Link>}
      </PageHeader>
      <Suspense fallback={<div className={styles.loading} role="status" aria-label="جارٍ تحميل المؤشرات"><CardSkeleton count={6} layout="rows"/></div>}>
        <NumbersBody searchParams={searchParams} settings={settings}/>
      </Suspense>
    </div>
  </div>;
}
