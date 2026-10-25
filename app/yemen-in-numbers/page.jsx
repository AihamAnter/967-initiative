import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import {ArrowUpLeft, BarChart3, Database} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import StatisticsExplorer from '@/components/StatisticsExplorer';
import IndicatorCard from '@/components/IndicatorCard';
import {getStatIndicators, getStatSections} from '@/lib/data';
import {formatNumber} from '@/lib/format';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({title:'اليمن بالأرقام', description:'مؤشرات وطنية عن اليمن مع المصدر وسنة القياس والمنهجية والسلسلة الزمنية عند توفر البيانات.', path:'/yemen-in-numbers'});
export default async function YemenInNumbersPage() {
 const [sections, indicators] = await Promise.all([getStatSections(), getStatIndicators()]);
 const withValues = indicators.filter(x => x.allValues.length > 0);
 const highlights = indicators.filter(x=>x.latestValue).sort((a,b) => Number(b.latestValue.year) - Number(a.latestValue.year)).slice(0,3);
 return <><PageIntro tone="blue" title="اليمن بالأرقام." category="مرصد 967 الوطني" description="وراء كل رقم سياق. استكشف المؤشرات، راجع مصدرها وسنة قياسها، وافهم كيف تغيّرت عبر الزمن. جميع البيانات على مستوى الجمهورية اليمنية.">
 <div className="directory-summary"><span>المؤشرات المعرّفة والمنشورة: <strong>{formatNumber(indicators.length)}</strong></span><span>ذات قيم منشورة: <strong>{formatNumber(withValues.length)}</strong></span><span>دون قيم منشورة: <strong>{formatNumber(indicators.length - withValues.length)}</strong></span>{indicators.some(x=>x.hasSourceConflict)&&<span>بانتظار اعتماد المصدر: <strong>{formatNumber(indicators.filter(x=>x.hasSourceConflict).length)}</strong></span>}<Link href="/yemen-in-numbers/timeline">قارن عبر الزمن <BarChart3 size={16}/></Link></div>
 </PageIntro>
 {highlights.length > 0 && <section className="section stats-latest"><div className="container"><div className="stats-section-heading"><div><span className="eyebrow">أحدث سنوات القياس المتاحة</span><h2>أرقام تضعك في الصورة.</h2></div><a className="text-link" href="#indicators">تصفح المؤشرات <ArrowUpLeft size={16}/></a></div><div className="stat-indicator-grid">{highlights.map(item => <IndicatorCard indicator={item} key={item.id}/>)}</div></div></section>}
 <section className="section section-alt" id="indicators"><div className="container"><div className="stats-section-heading"><div><span className="eyebrow">قاعدة المؤشرات</span><h2>اعثر على الرقم الذي تحتاجه.</h2></div></div><StatisticsExplorer indicators={indicators} sections={sections}/></div></section>
 <section className="section stats-catalog"><div className="container"><div className="stats-section-heading"><div><span className="eyebrow">مجالات المعرفة</span><h2>تصفح بحسب ما يهمك.</h2></div></div><div className="domain-accordion">{sections.map(section => <details key={section.id}><summary><Database size={18}/>{section.name}<span>{formatNumber(section.domains.length)} مجالات</span></summary><p>{section.description}</p><div className="stats-domain-links">{section.domains.map(domain => <Link href={'/yemen-in-numbers/' + domain.slug} key={domain.id}>{domain.name}<ArrowUpLeft size={14}/></Link>)}</div></details>)}</div>
 <aside className="methodology-note"><span className="eyebrow">المصادر والمنهجية</span><h2>ماذا تعني الأرقام المعروضة؟</h2><p>تعرض البطاقة أحدث قيمة فعلية في السلسلة المعتمدة، مع سنة القياس، وليست سنة تحديث السجل. الصفر قيمة صحيحة، والقيم المفقودة لا تُعوّض بتقديرات. تُميّز القيم التقديرية عن الرسمية. عند تعارض المصادر دون اعتماد سلسلة، يتوقف العرض الرقمي حتى المراجعة.</p><p>العدادات تخص المؤشرات المنشورة المتاحة للزائر. لا تُعد المؤشرات الفارغة أو المتعارضة ذات سلسلة معتمدة. راجع صفحة كل مؤشر للتعريف والمنهجية والمراجع. جميع المؤشرات وطنية ولا تمثل إحصاءات المحافظات.</p></aside></div></section>
 <section className="participate-banner"><div className="container"><div><span>البيانات أفضل حين نفهمها معاً</span><h2>كيف تغيّر اليمن عبر الزمن؟</h2></div><Link className="btn btn-white" href="/yemen-in-numbers/timeline">افتح المقارنة <ArrowUpLeft size={18}/></Link></div></section></>;
}
