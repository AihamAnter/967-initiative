import Link from 'next/link';
import PageIntro from './PageIntro';

export default function PolicyPage({title,description,path,summary,children}) {
  return <>
    <PageIntro title={title} description={description}/>
    <section className="policy-body"><div className="container policy-container">
      <nav className="policy-navigation" aria-label="سياسات الموقع">
        <Link href="/privacy" aria-current={path==='/privacy'?'page':undefined}>سياسة الخصوصية</Link>
        <Link href="/terms" aria-current={path==='/terms'?'page':undefined}>شروط الاستخدام</Link>
      </nav>
      <article className="policy-article" aria-label={title}>
        <p className="policy-updated">آخر تحديث: <time dateTime="2026-10-18">18 أكتوبر 2026</time></p>
        <p className="policy-summary">{summary}</p>
        {children}
        <div className="policy-contact"><h2>تواصل معنا</h2><p>للاستفسار عن هذه الصفحة أو إرسال طلب يتعلق ببياناتك أو بالمحتوى، استخدم <Link href="/contribute?type=استفسار#contribution-form">نموذج التواصل</Link>، واذكر موضوع طلبك بوضوح.</p></div>
      </article>
    </div></section>
  </>;
}
