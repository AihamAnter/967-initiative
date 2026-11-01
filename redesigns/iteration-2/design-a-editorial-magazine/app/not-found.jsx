import Link from 'next/link';
export default function NotFound() {
  return <section className="ed-notice" aria-labelledby="not-found-title">
    <span className="ed-kicker">خطأ 404</span>
    <h1 id="not-found-title">لم نجد هذه الصفحة.</h1>
    <p>ربما تغيّر الرابط أو نُقلت الصفحة. ابحث عمّا تريد، أو ابدأ من الصفحة الرئيسية.</p>
    <div className="ed-notice-actions"><Link className="ed-button" href="/search">ابحث في المنصة</Link><Link className="ed-button" data-variant="quiet" href="/">الصفحة الرئيسية</Link></div>
  </section>;
}
