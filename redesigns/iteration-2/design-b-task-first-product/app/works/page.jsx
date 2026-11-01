import Link from 'next/link';
import {Search} from 'lucide-react';
import {getSiteSettings, getWorks, WORK_CARD_FIELDS} from '@/lib/data';
import {pageMetadata} from '@/lib/seo';
import {pageIsVisible} from '@/lib/pageVisibility';
import {matchesSearch} from '@/lib/search';
import {collectionDefaults, listStateSearch, readListState} from '@/lib/listState';
import {MediaCard} from '@/components/wayfinder/Cards';
import {ActiveChips, hrefWith, PageHeader, Pager, ResultCount} from '@/components/wayfinder/Collection';
import AutoSubmitSelect from '@/components/wayfinder/AutoSubmitSelect';
import styles from './works.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'الأعمال الإعلامية', description:'فيديوهات وحوارات وتغطيات من مبادرة 967. ابحث بحسب الموضوع والمنصة.', path:'/works'});
const PAGE_SIZE = 12;
const ALL = 'الكل';

// Filtering, counting and paging happen on the server. The page ships 12 cards,
// not the whole catalogue; the URL (q, topic, platform, page) stays shareable.
export default async function Works({searchParams}) {
  const params = new URLSearchParams(Object.entries(await searchParams || {}).flatMap(([key, value]) => [].concat(value).map(item => [key, item])));
  const state = readListState(params.toString(), collectionDefaults.works);
  const [works, settings] = await Promise.all([getWorks(WORK_CARD_FIELDS), getSiteSettings()]);
  const topics = [...new Set(works.map(work => work.category).filter(Boolean))];
  const platforms = [...new Set(works.map(work => work.platform).filter(Boolean))];
  const matches = works.filter(work => (state.topic === ALL || work.category === state.topic) && (state.platform === ALL || work.platform === state.platform) && matchesSearch(state.q, [work.title, work.summary, work.category, work.platform]));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  const current = {...state, page};
  const link = patch => hrefWith('/works', current, collectionDefaults.works, {page: 1, ...patch});
  const returnTo = '/works' + listStateSearch('', current, collectionDefaults.works) + '#works-results';
  const isVisible = href => pageIsVisible(href, settings.pageVisibility, settings.contentPages || []);
  const chips = [
    state.q && {key: 'q', label: 'البحث: ' + state.q, href: link({q: ''}) + '#works-results'},
    state.topic !== ALL && {key: 'topic', label: 'الموضوع: ' + state.topic, href: link({topic: ALL}) + '#works-results'},
    state.platform !== ALL && {key: 'platform', label: 'المنصة: ' + state.platform, href: link({platform: ALL}) + '#works-results'},
  ].filter(Boolean);

  return <div className="ui-page">
    <div className="ui-wrap">
      <PageHeader task="read" title="الأعمال الإعلامية" description="فيديوهات وحوارات وقصص تقرّب قضايا اليمن. ابحث عن موضوعك وشاهد العمل من مكان واحد." currentPath="/works" isVisible={isVisible}/>

      <section id="works-results" className={styles.results} aria-labelledby="works-results-title">
        <h2 id="works-results-title" className="sr-only">نتائج الأعمال</h2>
        <form action="/works" method="get" className={styles.filters} role="search" aria-label="البحث في الأعمال وتصفيتها">
          <div className={styles.field} data-grow>
            <label htmlFor="works-q">ابحث</label>
            <span className={styles.input}><Search size={18} aria-hidden="true"/><input id="works-q" name="q" type="search" defaultValue={state.q} maxLength={150} placeholder="عنوان، موضوع، أو كلمة…"/></span>
          </div>
          <div className={styles.field}>
            <label htmlFor="works-platform">المنصة</label>
            <AutoSubmitSelect id="works-platform" name="platform" defaultValue={state.platform}><option value={ALL}>كل المنصات</option>{platforms.map(item => <option key={item} value={item}>{item}</option>)}</AutoSubmitSelect>
          </div>
          {state.topic !== ALL && <input type="hidden" name="topic" value={state.topic}/>}
          <button type="submit" className="ui-btn">عرض النتائج</button>
        </form>
        {topics.length > 1 && <nav className={styles.topics} aria-label="موضوع العمل"><ul>
          <li><Link href={link({topic: ALL}) + '#works-results'} aria-current={state.topic === ALL ? 'true' : undefined}>كل المواضيع</Link></li>
          {topics.map(topic => <li key={topic}><Link href={link({topic}) + '#works-results'} aria-current={state.topic === topic ? 'true' : undefined}>{topic}</Link></li>)}
        </ul></nav>}
        <ActiveChips chips={chips} clearHref="/works#works-results"/>
        <ResultCount count={matches.length} noun="عدد الأعمال المنشورة المطابقة" note={pages > 1 ? `الصفحة ${page} من ${pages}` : null}/>

        {matches.length ? <ul className={styles.grid}>
          {matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((work, index) => <li key={work.id}><MediaCard work={work} returnTo={returnTo} priority={index < 2 && page === 1}/></li>)}
        </ul> : <div className={styles.empty}>
          <Search size={26} aria-hidden="true"/>
          <h3>{works.length ? 'لا توجد أعمال تطابق بحثك' : 'المكتبة تستعد لحكاياتها القادمة'}</h3>
          <p>{works.length ? 'جرّب كلمات أخرى أو أعد ضبط الفلاتر.' : 'ستظهر هنا الأعمال بعد نشرها. يمكنك المساهمة باقتراح موضوع.'}</p>
          {works.length ? <Link className="ui-btn" data-variant="quiet" href="/works">إعادة ضبط الفلاتر</Link> : <Link href="/contribute?type=اقتراح%20موضوع" className="ui-btn" data-variant="quiet">اقترح موضوعاً</Link>}
        </div>}
        <Pager page={page} pages={pages} hrefFor={value => hrefWith('/works', current, collectionDefaults.works, {page: value}) + '#works-results'} label="صفحات الأعمال"/>
      </section>
    </div>
  </div>;
}
