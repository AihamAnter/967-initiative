'use client';
import {useMemo} from 'react';
import Link from '@/components/SiteLink';
import WorkCard from './WorkCard';
import Pagination from './Pagination';
import ActiveFilters from './ActiveFilters';
import {matchesSearch} from '@/lib/search';
import {formatNumber} from '@/lib/format';
import useListState from './useListState';
import {collectionDefaults, listStateSearch} from '@/lib/listState';

// Filter grammar shared by redesigned collections: search + one select in a
// row, topics as chips, active filters with clear, result count, pagination.
export default function WorkExplorer({works}) {
  const [{topic, platform, q: search, page}, update] = useListState(collectionDefaults.works);
  const setTopic = topic => update({topic, page: 1}), setPlatform = platform => update({platform, page: 1}), setSearch = q => update({q, page: 1}), setPage = page => update({page});
  const categories = ['الكل', ...new Set(works.map(x => x.category).filter(Boolean))], platforms = ['الكل', ...new Set(works.map(x => x.platform).filter(Boolean))];
  const matches = useMemo(() => works.filter(x => (topic === 'الكل' || x.category === topic) && (platform === 'الكل' || x.platform === platform) && matchesSearch(search, [x.title, x.summary, x.category, x.platform])), [works, topic, platform, search]);
  const reset = () => update({topic: 'الكل', platform: 'الكل', q: '', page: 1});
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matches.length / 12)));
  const returnTo = '/works' + listStateSearch('', {q: search, topic, platform, page: currentPage}, collectionDefaults.works) + '#works-results';
  return <div id="works-results">
    <div className="ed-filters" role="search">
      <label className="ed-field"><span>ابحث في الأعمال</span><input type="search" value={search} placeholder="عنوان، موضوع، أو منصة" onChange={e => setSearch(e.target.value)}/></label>
      {platforms.length > 2 && <label className="ed-field"><span>المنصة</span><select value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map(x => <option key={x} value={x}>{x === 'الكل' ? 'كل المنصات' : x}</option>)}</select></label>}
    </div>
    {categories.length > 2 && <div className="ed-chips" role="group" aria-label="موضوع العمل">{categories.map(x => <button type="button" key={x} className="ed-chip" onClick={() => setTopic(x)} aria-pressed={topic === x}>{x === 'الكل' ? 'كل المواضيع' : x}</button>)}</div>}
    <ActiveFilters filters={[search && {key: 'q', label: 'البحث: ' + search, onRemove: () => setSearch('')}, topic !== 'الكل' && {key: 'topic', label: 'الموضوع: ' + topic, onRemove: () => setTopic('الكل')}, platform !== 'الكل' && {key: 'platform', label: 'المنصة: ' + platform, onRemove: () => setPlatform('الكل')}]} onClear={reset}/>
    <p className="ed-results" aria-live="polite"><strong>الأعمال المطابقة: {formatNumber(matches.length)}</strong><span>من أصل {formatNumber(works.length)} عملًا منشورًا</span></p>
    {matches.length ? <ul className="ed-media-grid" data-count={Math.min(matches.length, 3)}>{matches.slice((currentPage - 1) * 12, currentPage * 12).map(work => <li key={work.id}><WorkCard work={work} returnTo={returnTo} headingLevel={2}/></li>)}</ul>
      : <div className="ed-empty"><h2>{works.length ? 'لا توجد أعمال تطابق بحثك' : 'المكتبة تستعد لحكاياتها القادمة'}</h2><p>{works.length ? 'جرّب كلمات أخرى أو امسح الفلاتر.' : 'ستظهر هنا الأعمال بعد نشرها. يمكنك اقتراح موضوع.'}</p>{works.length ? <button type="button" className="ed-button" data-variant="quiet" onClick={reset}>مسح الفلاتر</button> : <Link href="/contribute?type=اقتراح%20موضوع" className="ed-button" data-variant="quiet">اقترح موضوعًا</Link>}</div>}
    <Pagination page={currentPage} count={matches.length} onChange={setPage}/>
  </div>;
}
