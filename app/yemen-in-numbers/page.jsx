import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpLeft, BarChart3, BookOpen, BriefcaseBusiness, Building2, GraduationCap,
  HeartPulse, Landmark, Leaf, Network, ShieldAlert, Users,
} from 'lucide-react';
import StatisticsExplorer from '@/components/StatisticsExplorer';
import IndicatorCard from '@/components/IndicatorCard';
import {getStatIndicators, getStatSections, getWorks} from '@/lib/data';
import {formatNumber} from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'اليمن بالأرقام',
  description: 'مرصد وطني للمؤشرات الموثقة عن اليمن، مع مصادرها وسلاسلها الزمنية.',
};

const icons = [BriefcaseBusiness, Users, GraduationCap, HeartPulse, Network, Building2, Leaf, ShieldAlert, Landmark, BookOpen];

export default async function YemenInNumbersPage() {
  const [sections, indicators, works] = await Promise.all([getStatSections(), getStatIndicators(), getWorks()]);
  const domainCount = sections.reduce((sum, section) => sum + section.domains.length, 0);
  return <>
    <section className="stats-hero">
      <Image src="/images/red%20map.png" alt="خريطة اليمن" fill priority sizes="100vw"/>
      <div className="stats-hero-overlay"/>
      <div className="container stats-hero-content">
        <span className="eyebrow">مرصد 967 الوطني</span>
        <h1>اليمن<br/><span>بالأرقام.</span></h1>
        <p>مؤشرات موثقة تضع الرقم في سياقه، وتوضح مصدره وسنة قياسه ومنهجيته. جميع البيانات هنا وطنية على مستوى الجمهورية اليمنية.</p>
        <div className="stats-hero-actions"><a className="btn btn-red" href="#indicators">استكشف المؤشرات <ArrowUpLeft size={18}/></a><Link className="btn btn-ghost" href="/yemen-in-numbers/timeline">اليمن عبر الزمن <BarChart3 size={18}/></Link></div>
        <div className="stats-hero-meta"><span><strong>{formatNumber(sections.length)}</strong> أقسام رئيسية</span><span><strong>{formatNumber(domainCount)}</strong> مجالاً وطنياً</span><span><strong>{formatNumber(indicators.length)}</strong> مؤشراً منشوراً</span></div>
      </div>
    </section>

    {indicators.length > 0 && <section className="stats-latest section"><div className="container"><div className="stats-section-heading"><div><span className="eyebrow">آخر ما تم تحديثه</span><h2>أحدث المؤشرات المنشورة.</h2></div><a className="text-link" href="#indicators">جميع المؤشرات <ArrowUpLeft size={16}/></a></div><div className="stat-indicator-grid">{indicators.slice(0, 3).map(indicator => <IndicatorCard indicator={indicator} key={indicator.id}/>)}</div></div></section>}

    <section className="stats-catalog section"><div className="container">
      <div className="stats-section-heading"><div><span className="eyebrow">خريطة البيانات</span><h2>من الاقتصاد إلى الثقافة.</h2></div><p>ابدأ من المجال الذي يهمك. لا توجد تصفية حسب المحافظات أو المديريات؛ كل مؤشر يمثل اليمن على المستوى الوطني.</p></div>
      <div className="stats-section-grid">{sections.map((section, index) => {
        const Icon = icons[index] || BarChart3;
        return <article className="stats-section-item" key={section.id}>
          <div className="stats-section-title"><Icon size={24}/><div><span>{formatNumber(index + 1).padStart(2, '0')}</span><h3>{section.name}</h3></div></div>
          <p>{section.description}</p>
          <div className="stats-domain-links">{section.domains.map(domain => <Link key={domain.id} href={'/yemen-in-numbers/' + domain.slug}>{domain.name}<ArrowUpLeft size={14}/></Link>)}</div>
        </article>;
      })}</div>
    </div></section>

    <section className="stats-directory section section-alt" id="indicators"><div className="container">
      <div className="stats-section-heading"><div><span className="eyebrow">قاعدة المؤشرات</span><h2>ابحث. افهم. تحقّق.</h2></div><p>اعثر على المؤشر، اقرأ تعريفه، ثم راجع السلسلة والمصدر ووثيقة النشر قبل استخدام الرقم.</p></div>
      <StatisticsExplorer indicators={indicators} sections={sections}/>
    </div></section>

    <section className="stats-timeline-callout"><div className="container"><div><span>من 1990 حتى أحدث سنة منشورة</span><h2>كيف تغيّر اليمن عبر الزمن؟</h2><p>قارن مؤشرات متوافقة، وشاهد الفجوات كما هي، ونزّل البيانات أو الرسم لاستخدامه في عملك.</p></div><Link className="btn btn-white" href="/yemen-in-numbers/timeline">افتح المقارنة <ArrowUpLeft size={18}/></Link></div></section>

    {works.length > 0 && <section className="stats-related section"><div className="container"><div className="stats-section-heading"><div><span className="eyebrow">سياق أوسع</span><h2>من مكتبة 967.</h2></div><Link className="text-link" href="/works">جميع الأعمال <ArrowUpLeft size={16}/></Link></div><div className="stats-media-grid">{works.slice(0, 3).map(work => <Link href={'/works/' + work.slug} key={work.id}><span>{work.category}</span><h3>{work.title}</h3><p>{work.summary}</p><ArrowUpLeft size={18}/></Link>)}</div></div></section>}
  </>;
}
