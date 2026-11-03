import Link from '@/components/SiteLink';
import {pageMetadata} from '@/lib/seo';
import {ArrowUpLeft, Search} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import AdvancedSearchForm from '@/components/AdvancedSearchForm';
import {getSearchData} from '@/lib/searchData';
import MemberSearchResults from '@/components/search/MemberSearchResults';
import {rankSearchResults, searchTypes} from '@/lib/search';
import {formatNumber, toLatinDigits} from '@/lib/format';
import {getSiteSettings} from '@/lib/data';
import {SearchMissTracker} from '@/components/analytics/SiteUsageTracker';
import {pageIsVisible} from '@/lib/pageVisibility';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'البحث في منصة 967', description:'ابحث في المحتوى المنشور والأعضاء المسجلين.', path:'/search', noindex:true});
export default async function SearchPage({searchParams}) {
  const params = await searchParams;
  const settings=await getSiteSettings();
  const typeSections={works:'/works',debates:'/debates',issues:'/magazine',indicators:'/yemen-in-numbers',figures:'/yemeni-figures',history:'/yemen-history',companies:'/yemeni-products',professionals:'/professionals',places:'/yemen-map',domains:'/yemen-in-numbers'};
  const availableTypes=Object.entries(searchTypes).filter(([key])=>!typeSections[key]||pageIsVisible(typeSections[key],settings.pageVisibility));
  const query = typeof params.q === 'string' ? params.q.slice(0, 150).trim() : '';
  const type = availableTypes.some(([key])=>key===params.type) ? params.type : 'all';
  const mode = ['all','any','phrase'].includes(params.mode) ? params.mode : 'all';
  const scope = params.scope === 'title' ? 'title' : 'all';
  const exclude = typeof params.exclude === 'string' ? params.exclude.slice(0,150).trim() : '';
  const requested = Math.max(1, Math.floor(Number(params.page) || 1));
  const {items, unavailable} = query && type !== 'members' ? await getSearchData() : {items: [], unavailable: []};
  const matches = rankSearchResults(query, items, {mode, scope, exclude});
  const results = matches.filter(item => type === 'all' || item.type === type);
  const pages = Math.max(1, Math.ceil(results.length / 12));
  const page = Math.min(requested, pages);
  const url = (nextType, nextPage = 1) => '/search?' + new URLSearchParams({q: query, type: nextType, ...(mode !== 'all' ? {mode} : {}), ...(scope !== 'all' ? {scope} : {}), ...(exclude ? {exclude} : {}), ...(nextPage > 1 ? {page: String(nextPage)} : {})}).toString();
  return <>
    {query.length>=2&&type!=='all'&&type!=='members'&&page===1&&results.length===0&&unavailable.length===0&&<SearchMissTracker key={query+'|'+type+'|'+mode+'|'+scope+'|'+exclude} category={type}/>}
    <PageIntro title="ابحث. واكتشف أكثر." category="البحث في المنصة" description="ابحث عن مكان أو محتوى أو عضو بالاسم. نجمع الكلمات بأي ترتيب، ونقدّم الاسم المطابق أولاً."><AdvancedSearchForm key={[query,type,mode,scope,exclude].join('|')} query={query} type={type} mode={mode} scope={scope} exclude={exclude}/></PageIntro>
    <section className="platform-search-body"><div className="container">
      {unavailable.length > 0 && <p className="stat-warning" role="status">تعذر تحميل بعض الأقسام: {unavailable.join('، ')}. النتائج الحالية جزئية. <Link href={url(type)}>إعادة المحاولة</Link></p>}
      <p className="small-muted search-scope-note">نبحث في عناوين المحتوى العام وأوصافه والحقول المفهرسة في الأدلة؛ يشمل ذلك النماذج المعلّمة. يمكن للأعضاء المسجلين البحث عن أعضاء آخرين بأسمائهم العامة، وفق إعدادات الظهور. لا يشمل البحث ملفات PDF بالكامل أو بيانات الاتصال.</p>
      <nav className="search-filters" aria-label="نوع نتائج البحث">{availableTypes.map(([key, label]) => <a href={url(key)} key={key} aria-current={key === type ? 'page' : undefined}>{label}{query && !['all','members'].includes(key) && <span> · {formatNumber(matches.filter(x => x.type === key).length)}</span>}</a>)}</nav>
      {query && (type === 'all' || type === 'members') && <MemberSearchResults key={[query,type,mode,exclude].join('|')} query={query} mode={mode} exclude={exclude} onlyMembers={type==='members'} contentCount={results.length} canTrackMiss={unavailable.length===0}/>}
      {query && type!=='members' && <div className="results-line" aria-live="polite"><span>نتائج المحتوى عن «{query}»</span><strong>نتائج المحتوى: {formatNumber(results.length)}</strong></div>}
      {results.length > 0 ? <div className="search-results">{results.slice((page - 1) * 12, page * 12).map(item => <Link href={item.href} className="search-result" key={item.href}><span>{searchTypes[item.type]} <ArrowUpLeft size={13}/></span><h2>{item.title}</h2>{item.isDemo&&<span className="status-badge">ملف توضيحي — يحتاج مراجعة</span>}<p>{toLatinDigits(item.description)}</p>{item.meta && <small>{toLatinDigits(item.meta)}</small>}</Link>)}</div> : (!query || (type !== 'all' && type !== 'members')) && <div className="empty-state"><Search size={30}/><h2>{query ? unavailable.length?'النتائج المتاحة لا تتضمن تطابقاً':'لم نجد نتائج مطابقة':'عمّ تبحث اليوم؟'}</h2><p>{query ? 'جرّب الاسم أو العنوان بكلمات أقصر، أو أزل الاستبعاد واختر نوعاً آخر. وللمجلة، جرّب البحث داخل قارئ PDF إذا تضمن الملف نصاً قابلاً للبحث.' : 'اكتب اسم مكان، موضوع، شخصية، عضو، مؤشر، أو مهنة للبدء.'}</p>{query&&type!=='all'&&matches.length>0&&<Link href={url('all')} className="text-link">عرض النتائج في جميع الأقسام ({formatNumber(matches.length)})</Link>}{query && <Link href="/search" className="btn btn-outline">مسح البحث والفلاتر</Link>}</div>}
      {pages > 1 && <nav className="server-pagination" aria-label="صفحات نتائج البحث">{page > 1 && <a href={url(type, page - 1)}>السابق</a>}<span>الصفحة {formatNumber(page)} من {formatNumber(pages)}</span>{page < pages && <a href={url(type, page + 1)}>التالي</a>}</nav>}
    </div></section>
  </>;
}
