import Link from '@/components/SiteLink';
import PageIntro from './PageIntro';
import {formatArabicDate} from '@/lib/format';

export default function PolicyPage({title,description,path,summary,children,navigation=[],updatedAt,contactHref='/contribute?type=استفسار#contribution-form',showContact=true}) {
  return <>
    <PageIntro title={title} description={description}/>
    <section className="policy-body"><div className="container policy-container">
      {navigation.length>0&&<nav className="policy-navigation" aria-label="صفحات مرتبطة">{navigation.map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined}>{item.title}</Link>)}</nav>}
      <article className="policy-article" aria-label={title}>
        {updatedAt&&<p className="policy-updated">آخر تحديث: <time dateTime={updatedAt}>{formatArabicDate(updatedAt)}</time></p>}
        {summary&&<p className="policy-summary">{summary}</p>}
        {children}
        {showContact&&<div className="policy-contact"><h2>تواصل معنا</h2><p>للاستفسار عن هذه الصفحة أو إرسال طلب يتعلق ببياناتك أو بالمحتوى، استخدم <Link href={contactHref}>نموذج التواصل</Link>، واذكر موضوع طلبك بوضوح.</p></div>}
      </article>
    </div></section>
  </>;
}
